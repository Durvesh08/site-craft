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
  getMembers(): WorkspaceMember[] {
    return [
      { id: 'mem-1', name: 'Durvesh Narkhede', email: 'durvesh@zovaix.site', role: 'Owner', status: 'active' },
      { id: 'mem-2', name: 'Alex Chen', email: 'alex@zovaix.site', role: 'Developer', status: 'active' },
      { id: 'mem-3', name: 'Sarah Jenkins', email: 'sarah@agency.com', role: 'Admin', status: 'invited' },
    ];
  }

  getUsage(): WorkspaceUsage {
    return {
      aiCreditsUsed: 4250,
      aiCreditsTotal: 10000,
      storageUsedMB: 1850,
      storageTotalMB: 10000,
      deploymentsCount: 42,
      deploymentsTotal: 100,
      planName: 'Pro Creator',
    };
  }
}

export const workspaceService = new WorkspaceService();
