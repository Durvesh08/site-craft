export interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Developer' | 'Viewer';
  avatarUrl?: string;
  status: 'active' | 'invited';
}

export interface WorkspaceUsage {
  aiCreditsUsed: number;
  aiCreditsTotal: number;
  storageUsedMB: number;
  storageTotalMB: number;
  deploymentsCount: number;
  deploymentsTotal: number;
  planName: 'Pro Creator';
}

class WorkspaceService {
  private usage: WorkspaceUsage = {
    aiCreditsUsed: 14200,
    aiCreditsTotal: 50000,
    storageUsedMB: 1900,
    storageTotalMB: 10000,
    deploymentsCount: 8,
    deploymentsTotal: 50,
    planName: 'Pro Creator',
  };

  constructor() {
    this.syncFromBackend();
  }

  async syncFromBackend(): Promise<WorkspaceUsage> {
    try {
      const res = await fetch('/api/workspace/usage');
      if (res.ok) {
        const data = await res.json();
        if (data.usage) {
          this.usage = {
            ...data.usage,
            planName: 'Pro Creator'
          };
        }
      }
    } catch (_err) {
      // Local fallback
    }
    return this.usage;
  }

  getMembers(): WorkspaceMember[] {
    return [
      { id: 'mem-1', name: 'Durvesh Narkhede', email: 'durvesh@zovaix.site', role: 'Owner', status: 'active' },
      { id: 'mem-2', name: 'Alex Chen', email: 'alex@zovaix.site', role: 'Developer', status: 'active' },
      { id: 'mem-3', name: 'Sarah Jenkins', email: 'sarah@agency.com', role: 'Admin', status: 'invited' },
    ];
  }

  getUsage(): WorkspaceUsage {
    return this.usage;
  }
}

export const workspaceService = new WorkspaceService();
