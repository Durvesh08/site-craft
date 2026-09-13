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
    aiCreditsUsed: 0,
    aiCreditsTotal: 500000,
    storageUsedMB: 0,
    storageTotalMB: 10000,
    deploymentsCount: 0,
    deploymentsTotal: 100,
    planName: 'Pro Creator',
  };

  constructor() {
    this.syncFromBackend();
  }

  async syncFromBackend(): Promise<WorkspaceUsage> {
    try {
      const res = await fetch('/api/workspace/usage', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.usage) {
          this.usage = {
            ...data.usage,
            planName: 'Pro Creator'
          };
        }
      }
    } catch (err) {
      console.error('[workspace] syncFromBackend failed:', err);
    }
    return this.usage;
  }

  getMembers(): WorkspaceMember[] {
    // The real members endpoint should be used directly
    return [];
  }

  getUsage(): WorkspaceUsage {
    return this.usage;
  }
}

export const workspaceService = new WorkspaceService();
