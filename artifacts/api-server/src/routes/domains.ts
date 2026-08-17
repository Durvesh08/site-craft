import { Router, Request, Response, IRouter } from "express";
import { db, domainsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import dns from "node:dns/promises";
import crypto from "crypto";

const domainsRouter: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated() || !req.workspaceId || !(req as any).user?.id) {
    res.status(401).json({ success: false, error: "Unauthorized", message: "Login and workspace context required" });
    return false;
  }
  return true;
}

// GET /api/domains — List custom domains
domainsRouter.get("/domains", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const workspaceId = req.workspaceId!;
    const domains = await db
      .select()
      .from(domainsTable)
      .where(eq(domainsTable.workspaceId, workspaceId));

    res.json({
      success: true,
      domains: domains.map((d) => ({
        id: d.id,
        projectId: d.projectId,
        hostname: d.domain,
        status: d.status,
        txtVerificationToken: d.txtVerificationToken,
        dnsRecords: d.dnsRecordsJson ? JSON.parse(d.dnsRecordsJson) : [
          { type: 'A', name: '@', value: '76.76.21.21', status: d.verified ? 'configured' : 'pending' },
          { type: 'CNAME', name: 'www', value: 'site.zovaix.com', status: d.verified ? 'configured' : 'pending' }
        ],
        sslStatus: d.sslActive ? 'active' : 'issuing',
        verifiedAt: d.verifiedAt?.toISOString(),
        createdAt: d.createdAt.toISOString()
      })),
      total: domains.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to list custom domains" });
  }
});

// POST /api/domains — Register new custom domain
domainsRouter.post("/domains", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { hostname, projectId, projectName } = req.body;
  const workspaceId = req.workspaceId!;
  const userId = (req as any).user.id;

  if (!hostname) {
    return res.status(400).json({ success: false, error: "Hostname is required" });
  }

  const cleanHost = hostname.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  
  if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) {
    return res.status(500).json({ success: false, error: "Cloudflare credentials not configured" });
  }

  try {
    // 1. Call Cloudflare API to create the zone
    const cfResponse = await fetch("https://api.cloudflare.com/client/v4/zones", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: cleanHost,
        account: { id: process.env.CLOUDFLARE_ACCOUNT_ID },
        type: "full",
        jump_start: false
      })
    });

    const cfData = await cfResponse.json();
    
    if (!cfResponse.ok || !cfData.success) {
      console.error("Cloudflare Zone Creation Error:", cfData.errors);
      return res.status(400).json({ 
        success: false, 
        error: "Failed to register domain with hosting provider",
        details: cfData.errors 
      });
    }

    const zoneId = cfData.result.id;
    const nameservers = cfData.result.name_servers || [];

    // The user needs to point their domain to these nameservers
    const dnsRecords = nameservers.map((ns: string) => ({
      type: 'NS',
      name: '@',
      value: ns,
      status: 'pending'
    }));

    const [domainRecord] = await db
      .insert(domainsTable)
      .values({
        workspaceId,
        userId,
        projectId: projectId || null,
        domain: cleanHost,
        status: "PENDING",
        cloudflareZoneId: zoneId,
        dnsRecordsJson: JSON.stringify(dnsRecords),
        verified: false,
        sslActive: false
      })
      .returning();

    return res.status(201).json({
      success: true,
      domain: {
        id: domainRecord.id,
        projectId: domainRecord.projectId,
        hostname: domainRecord.domain,
        status: domainRecord.status,
        cloudflareZoneId: domainRecord.cloudflareZoneId,
        dnsRecords,
        sslStatus: 'issuing',
        createdAt: domainRecord.createdAt.toISOString()
      },
      message: `Domain registered. Please configure NS records for ${cleanHost} pointing to: ${nameservers.join(", ")}`
    });
  } catch (err) {
    console.error("Domain registration error:", err);
    return res.status(500).json({ success: false, error: "Failed to register domain" });
  }
});

// POST /api/domains/:id/verify — Check Cloudflare zone activation status
domainsRouter.post("/domains/:id/verify", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const id = String(req.params.id);
  const workspaceId = req.workspaceId!;

  try {
    const [domain] = await db
      .select()
      .from(domainsTable)
      .where(and(eq(domainsTable.workspaceId, workspaceId), eq(domainsTable.id, id)))
      .limit(1);

    if (!domain) {
      return res.status(404).json({ success: false, error: "Domain record not found" });
    }

    if (!domain.cloudflareZoneId) {
      return res.status(400).json({ success: false, error: "Domain has no associated Cloudflare zone" });
    }

    if (!process.env.CLOUDFLARE_API_TOKEN) {
      return res.status(500).json({ success: false, error: "Cloudflare credentials not configured" });
    }

    // Call Cloudflare API to get zone status
    const cfResponse = await fetch(`https://api.cloudflare.com/client/v4/zones/${domain.cloudflareZoneId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json"
      }
    });

    const cfData = await cfResponse.json();

    if (!cfResponse.ok || !cfData.success) {
      console.error("Cloudflare Zone Check Error:", cfData.errors);
      return res.status(500).json({ success: false, error: "Failed to check zone status with hosting provider" });
    }

    const zoneStatus = cfData.result.status; // e.g. "active", "pending", "initializing"

    if (zoneStatus === "active") {
      const verifiedAt = new Date();
      
      // Update DNS records to show as configured
      let updatedDnsRecords = [];
      if (domain.dnsRecordsJson) {
        try {
          const parsedRecords = JSON.parse(domain.dnsRecordsJson);
          updatedDnsRecords = parsedRecords.map((r: any) => ({ ...r, status: 'configured' }));
        } catch(e) {}
      }

      // Add to Cloudflare KV for the routing worker
      if (process.env.CLOUDFLARE_KV_NAMESPACE_ID && domain.projectId) {
        const kvResponse = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CLOUDFLARE_KV_NAMESPACE_ID}/values/${domain.domain}`,
          {
            method: "PUT",
            headers: {
              "Authorization": `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
              "Content-Type": "text/plain"
            },
            body: domain.projectId
          }
        );
        if (!kvResponse.ok) {
          console.error("Failed to write to KV:", await kvResponse.text());
        }
      }

      const [updated] = await db
        .update(domainsTable)
        .set({
          status: "ACTIVE",
          verified: true,
          sslActive: true,
          verifiedAt,
          dnsRecordsJson: JSON.stringify(updatedDnsRecords)
        })
        .where(eq(domainsTable.id, domain.id))
        .returning();

      return res.json({
        success: true,
        verified: true,
        domain: {
          id: updated.id,
          hostname: updated.domain,
          status: updated.status,
          dnsRecords: updatedDnsRecords,
          sslStatus: 'active',
          verifiedAt: updated.verifiedAt?.toISOString()
        },
        message: "Nameservers verified successfully! Domain is now ACTIVE."
      });
    }

    // Zone not active yet
    return res.status(400).json({
      success: false,
      verified: false,
      status: "PENDING",
      error: `Cloudflare zone status is still "${zoneStatus}"`,
      message: `Nameserver verification pending. Status: ${zoneStatus}. Please ensure you've updated your nameservers.`
    });
  } catch (err) {
    console.error("Verification error:", err);
    return res.status(500).json({ success: false, error: "Error during domain verification check" });
  }
});

// DELETE /domains/:id — Remove custom domain
domainsRouter.delete("/domains/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const id = String(req.params.id);
  const workspaceId = req.workspaceId!;

  try {
    const [domain] = await db
      .select()
      .from(domainsTable)
      .where(and(eq(domainsTable.workspaceId, workspaceId), eq(domainsTable.id, id)))
      .limit(1);

    if (domain && process.env.CLOUDFLARE_KV_NAMESPACE_ID && process.env.CLOUDFLARE_API_TOKEN) {
      // Remove from KV
      const kvResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CLOUDFLARE_KV_NAMESPACE_ID}/values/${domain.domain}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`
          }
        }
      );
      if (!kvResponse.ok) {
        console.error("Failed to delete from KV:", await kvResponse.text());
      }
      
      // Optionally remove the zone from CF here if needed, but KV is the main requirement
    }

    await db
      .delete(domainsTable)
      .where(and(eq(domainsTable.workspaceId, workspaceId), eq(domainsTable.id, id)));

    return res.json({
      success: true,
      message: "Domain removed from project routing"
    });
  } catch (err) {
    console.error("Delete domain error:", err);
    return res.status(500).json({ success: false, error: "Failed to delete domain" });
  }
});

export default domainsRouter;
