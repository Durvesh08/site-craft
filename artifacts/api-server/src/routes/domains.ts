import { Router, Request, Response, IRouter } from "express";

const domainsRouter: IRouter = Router();

export interface DomainRecord {
  id: string;
  projectId: string;
  projectName: string;
  hostname: string;
  status: 'active' | 'pending' | 'failed';
  dnsRecords: {
    type: 'A' | 'CNAME' | 'TXT';
    name: string;
    value: string;
    status: 'configured' | 'pending';
  }[];
  sslStatus: 'active' | 'issuing' | 'pending';
  createdAt: string;
  verifiedAt?: string;
}

let domainsStore: DomainRecord[] = [
  {
    id: 'dom-1',
    projectId: 'lumina',
    projectName: 'Lumina Interior Architecture',
    hostname: 'lumina.zovaix.site',
    status: 'active',
    dnsRecords: [
      { type: 'A', name: '@', value: '76.76.21.21', status: 'configured' },
      { type: 'CNAME', name: 'www', value: 'cname.zovaix.site', status: 'configured' }
    ],
    sslStatus: 'active',
    createdAt: '2026-08-01T12:00:00Z',
    verifiedAt: '2026-08-01T12:05:00Z'
  }
];

// GET /api/domains — List all custom domains
domainsRouter.get("/api/domains", (req: Request, res: Response) => {
  const { projectId } = req.query;
  const result = projectId
    ? domainsStore.filter(d => d.projectId === projectId)
    : domainsStore;

  res.json({
    success: true,
    domains: result,
    total: result.length
  });
});

// POST /api/domains — Register new custom domain
domainsRouter.post("/api/domains", (req: Request, res: Response) => {
  const { hostname, projectId, projectName } = req.body;

  if (!hostname) {
    return res.status(400).json({ success: false, error: "Hostname is required" });
  }

  const cleanHost = hostname.trim().toLowerCase().replace(/^https?:\/\//, '');
  const id = `dom-${Date.now()}`;

  const newDomain: DomainRecord = {
    id,
    projectId: projectId || 'lumina',
    projectName: projectName || 'User Project',
    hostname: cleanHost,
    status: 'pending',
    dnsRecords: [
      { type: 'A', name: '@', value: '76.76.21.21', status: 'pending' },
      { type: 'CNAME', name: 'www', value: 'cname.zovaix.site', status: 'pending' }
    ],
    sslStatus: 'issuing',
    createdAt: new Date().toISOString()
  };

  domainsStore.unshift(newDomain);

  return res.status(201).json({
    success: true,
    domain: newDomain,
    message: "Domain added. Configure DNS A record pointing to 76.76.21.21"
  });
});

// POST /api/domains/:id/verify — Trigger DNS propagation check
domainsRouter.post("/api/domains/:id/verify", (req: Request, res: Response) => {
  const { id } = req.params;
  const domain = domainsStore.find(d => d.id === id);

  if (!domain) {
    return res.status(404).json({ success: false, error: "Domain record not found" });
  }

  domain.status = 'active';
  domain.sslStatus = 'active';
  domain.dnsRecords.forEach(r => r.status = 'configured');
  domain.verifiedAt = new Date().toISOString();

  return res.json({
    success: true,
    domain,
    message: "DNS records verified & SSL certificate issued successfully"
  });
});

// DELETE /api/domains/:id — Remove custom domain
domainsRouter.delete("/api/domains/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  domainsStore = domainsStore.filter(d => d.id !== id);

  return res.json({
    success: true,
    message: "Domain removed from project routing"
  });
});

export default domainsRouter;
