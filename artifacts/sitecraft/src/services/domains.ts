export interface DomainItem {
  id: string;
  domain: string;
  projectId: string;
  projectName: string;
  environment: 'production' | 'staging';
  status: 'checking' | 'pending' | 'verified' | 'live' | 'error';
  isPrimary: boolean;
  sslStatus: 'active' | 'issuing' | 'none';
  dnsRecords: {
    type: string;
    name: string;
    value: string;
    status: 'valid' | 'pending';
  }[];
  createdAt: string;
}

const INITIAL_DOMAINS: DomainItem[] = [
  {
    id: 'dom-1',
    domain: 'lumina.zovaix.site',
    projectId: 'lumina',
    projectName: 'Lumina Interior Architecture',
    environment: 'production',
    status: 'live',
    isPrimary: true,
    sslStatus: 'active',
    dnsRecords: [
      { type: 'CNAME', name: '@', value: 'cname.zovaix.site', status: 'valid' },
    ],
    createdAt: 'Aug 1, 2026',
  },
  {
    id: 'dom-2',
    domain: 'pulsar.zovaix.site',
    projectId: 'pulsar',
    projectName: 'Pulsar Analytics Cloud',
    environment: 'production',
    status: 'live',
    isPrimary: true,
    sslStatus: 'active',
    dnsRecords: [
      { type: 'CNAME', name: '@', value: 'cname.zovaix.site', status: 'valid' },
    ],
    createdAt: 'Aug 3, 2026',
  },
  {
    id: 'dom-3',
    domain: 'clout.zovaix.site',
    projectId: 'clout',
    projectName: 'Clout Esports & Gaming',
    environment: 'production',
    status: 'live',
    isPrimary: true,
    sslStatus: 'active',
    dnsRecords: [
      { type: 'CNAME', name: '@', value: 'cname.zovaix.site', status: 'valid' },
    ],
    createdAt: 'Aug 4, 2026',
  },
  {
    id: 'dom-4',
    domain: 'sonora.io',
    projectId: 'sonora',
    projectName: 'Sonora Acoustic Hardware',
    environment: 'production',
    status: 'pending',
    isPrimary: false,
    sslStatus: 'issuing',
    dnsRecords: [
      { type: 'A', name: '@', value: '76.76.21.21', status: 'pending' },
      { type: 'CNAME', name: 'www', value: 'cname.zovaix.site', status: 'pending' },
    ],
    createdAt: 'Aug 6, 2026',
  },
];

class DomainsService {
  private domains: DomainItem[] = [...INITIAL_DOMAINS];

  getAll(): DomainItem[] {
    return this.domains;
  }

  getByProject(projectId: string): DomainItem[] {
    return this.domains.filter(d => d.projectId === projectId);
  }

  addDomain(domain: string, projectId: string, projectName: string): DomainItem {
    const newDomain: DomainItem = {
      id: `dom-${Date.now()}`,
      domain,
      projectId,
      projectName,
      environment: 'production',
      status: 'pending',
      isPrimary: false,
      sslStatus: 'issuing',
      dnsRecords: [
        { type: 'A', name: '@', value: '76.76.21.21', status: 'pending' },
        { type: 'CNAME', name: 'www', value: 'cname.zovaix.site', status: 'pending' },
      ],
      createdAt: 'Just now',
    };
    this.domains.unshift(newDomain);
    return newDomain;
  }

  verify(id: string): DomainItem | undefined {
    const dom = this.domains.find(d => d.id === id);
    if (dom) {
      dom.status = 'live';
      dom.sslStatus = 'active';
      dom.dnsRecords.forEach(r => r.status = 'valid');
    }
    return dom;
  }

  setPrimary(id: string): boolean {
    const dom = this.domains.find(d => d.id === id);
    if (dom) {
      this.domains.filter(d => d.projectId === dom.projectId).forEach(d => d.isPrimary = false);
      dom.isPrimary = true;
      return true;
    }
    return false;
  }

  remove(id: string): boolean {
    const idx = this.domains.findIndex(d => d.id === id);
    if (idx !== -1) {
      this.domains.splice(idx, 1);
      return true;
    }
    return false;
  }
}

export const domainsService = new DomainsService();
