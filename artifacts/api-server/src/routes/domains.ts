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
domainsRouter.get("/api/domains", async (req: Request, res: Response) => {
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
          { type: 'CNAME', name: 'www', value: 'cname.zovaix.site', status: d.verified ? 'configured' : 'pending' }
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
domainsRouter.post("/api/domains", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { hostname, projectId, projectName } = req.body;
  const workspaceId = req.workspaceId!;
  const userId = (req as any).user.id;

  if (!hostname) {
    return res.status(400).json({ success: false, error: "Hostname is required" });
  }

  const cleanHost = hostname.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const verificationToken = `zovaix-verify-${crypto.randomBytes(12).toString("hex")}`;
  const dnsRecords = [
    { type: 'TXT', name: `_zovaix-challenge.${cleanHost}`, value: verificationToken, status: 'pending' },
    { type: 'A', name: '@', value: '76.76.21.21', status: 'pending' },
    { type: 'CNAME', name: 'www', value: 'cname.zovaix.site', status: 'pending' }
  ];

  try {
    const [domainRecord] = await db
      .insert(domainsTable)
      .values({
        workspaceId,
        userId,
        projectId: projectId || null,
        domain: cleanHost,
        status: "PENDING",
        txtVerificationToken: verificationToken,
        txtRecord: verificationToken,
        cnameRecord: 'cname.zovaix.site',
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
        txtVerificationToken: domainRecord.txtVerificationToken,
        dnsRecords,
        sslStatus: 'issuing',
        createdAt: domainRecord.createdAt.toISOString()
      },
      message: `Domain registered. Please configure TXT record _zovaix-challenge.${cleanHost} with value ${verificationToken}`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to register domain" });
  }
});

// POST /api/domains/:id/verify — Perform real DNS lookup verification
domainsRouter.post("/api/domains/:id/verify", async (req: Request, res: Response) => {
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

    const cleanHost = domain.domain;
    const challengeHost = `_zovaix-challenge.${cleanHost}`;
    let isVerified = false;
    let verificationError = "";

    try {
      // Perform real DNS TXT lookup
      const txtRecords = await dns.resolveTxt(challengeHost);
      const flattenedTxt = txtRecords.flat();
      if (flattenedTxt.includes(domain.txtVerificationToken || "")) {
        isVerified = true;
      } else {
        verificationError = `TXT record found but value did not match expected verification token "${domain.txtVerificationToken}"`;
      }
    } catch (dnsErr: any) {
      // Fallback DNS A record check or detailed message
      try {
        const aRecords = await dns.resolve4(cleanHost);
        if (aRecords.includes("76.76.21.21")) {
          isVerified = true;
        } else {
          verificationError = `DNS A record for ${cleanHost} points to [${aRecords.join(", ")}] instead of 76.76.21.21`;
        }
      } catch (aErr: any) {
        verificationError = `DNS lookup failed for ${challengeHost}: ${dnsErr.message || dnsErr.code || "ENOTFOUND"}`;
      }
    }

    if (isVerified) {
      const verifiedAt = new Date();
      const updatedDnsRecords = [
        { type: 'TXT', name: `_zovaix-challenge.${cleanHost}`, value: domain.txtVerificationToken, status: 'configured' },
        { type: 'A', name: '@', value: '76.76.21.21', status: 'configured' },
        { type: 'CNAME', name: 'www', value: 'cname.zovaix.site', status: 'configured' }
      ];

      const [updated] = await db
        .update(domainsTable)
        .set({
          status: "VERIFIED",
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
        message: "DNS verification succeeded! Domain is now ACTIVE with SSL enabled."
      });
    }

    // DNS check did not match
    await db
      .update(domainsTable)
      .set({ status: "FAILED" })
      .where(eq(domainsTable.id, domain.id));

    return res.status(400).json({
      success: false,
      verified: false,
      status: "FAILED",
      error: verificationError,
      message: `DNS verification pending: ${verificationError}. Please check your DNS provider settings.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Error during DNS verification check" });
  }
});

// DELETE /api/domains/:id — Remove custom domain
domainsRouter.delete("/api/domains/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const id = String(req.params.id);
  const workspaceId = req.workspaceId!;

  try {
    await db
      .delete(domainsTable)
      .where(and(eq(domainsTable.workspaceId, workspaceId), eq(domainsTable.id, id)));

    return res.json({
      success: true,
      message: "Domain removed from project routing"
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to delete domain" });
  }
});

export default domainsRouter;
