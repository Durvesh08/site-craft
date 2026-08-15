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
  errorMessage?: string;
}

const INITIAL_DOMAINS: DomainItem[] = [];

class DomainsService {
  private domains: DomainItem[] = [...INITIAL_DOMAINS];

  constructor() {
    this.syncFromBackend();
  }

  async syncFromBackend(): Promise<DomainItem[]> {
    try {
      const res = await fetch('/api/domains');
      if (res.ok) {
        const data = await res.json();
        if (data.domains && Array.isArray(data.domains)) {
          this.domains = data.domains.map((d: any) => ({
            id: d.id,
            domain: d.hostname || d.domain,
            projectId: d.projectId,
            projectName: d.projectName,
            environment: 'production',
            status: d.status === 'active' ? 'live' : 'pending',
            isPrimary: true,
            sslStatus: d.sslStatus || 'active',
            dnsRecords: d.dnsRecords || [],
            createdAt: d.createdAt || 'Just now',
          }));
        }
      }
    } catch (err) {
      console.error('[domains] syncFromBackend failed:', err);
    }
    return this.domains;
  }

  getAll(): DomainItem[] {
    return this.domains;
  }

  getByProject(projectId: string): DomainItem[] {
    return this.domains.filter(d => d.projectId === projectId);
  }

  async addDomain(domain: string, projectId: string, projectName: string): Promise<DomainItem> {
    const newDomain: DomainItem = {
      id: `dom-${Date.now()}`,
      domain,
      projectId,
      projectName,
      environment: 'production',
      status: 'pending',
      isPrimary: false,
      sslStatus: 'issuing',
      dnsRecords: [],
      createdAt: 'Just now',
    };
    
    // Optimistic insert
    this.domains.unshift(newDomain);

    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname: domain, projectId, projectName })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.domain) {
          // Update the optimistic domain with real data
          newDomain.id = data.domain.id;
          newDomain.dnsRecords = data.domain.dnsRecords || [];
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        newDomain.status = 'error';
        newDomain.errorMessage = errorData.error || errorData.message || `Request failed with status ${res.status}`;
      }
    } catch (err) {
      console.error('[domains] addDomain failed:', err);
      newDomain.status = 'error';
      newDomain.errorMessage = err instanceof Error ? err.message : 'Unknown error';
    }

    return newDomain;
  }

  async verify(id: string): Promise<DomainItem | undefined> {
    const dom = this.domains.find(d => d.id === id);
    if (dom) {
      dom.status = 'checking';
      try {
        const res = await fetch(`/api/domains/${id}/verify`, { method: 'POST', credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.verified) {
            dom.status = 'live';
            dom.sslStatus = 'active';
            dom.dnsRecords.forEach(r => r.status = 'valid');
          } else {
            dom.status = 'error';
          }
        } else {
          dom.status = 'error';
        }
      } catch (err) {
        console.error('[domains] verify failed:', err);
        dom.status = 'error';
      }
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

  async remove(id: string): Promise<boolean> {
    const idx = this.domains.findIndex(d => d.id === id);
    if (idx !== -1) {
      this.domains.splice(idx, 1);
      try {
        await fetch(`/api/domains/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.error('[domains] remove failed:', err);
      }
      return true;
    }
    return false;
  }
}

export const domainsService = new DomainsService();
