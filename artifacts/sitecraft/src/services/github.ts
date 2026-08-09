export interface GitHubSync {
  repo?: string;
  branch: string;
  lastSync?: string;
  status: 'connected' | 'disconnected' | 'syncing';
  recentCommits: { hash: string; message: string; author: string; time: string }[];
}

class GitHubService {
  private syncs: Record<string, GitHubSync> = {};

  getSync(projectId: string): GitHubSync {
    if (!this.syncs[projectId]) {
      this.syncs[projectId] = {
        repo: `durvesh08/${projectId}-site`,
        branch: 'main',
        lastSync: '15 minutes ago',
        status: 'connected',
        recentCommits: [
          { hash: '082481f', message: 'Updated hero section & responsive layout', author: 'Durvesh Narkhede', time: '15 mins ago' },
          { hash: '85e269e', message: 'Refactored typography design tokens', author: 'Zovaix AI Agent', time: '2 hours ago' },
        ],
      };
    }
    return this.syncs[projectId];
  }
}

export const githubService = new GitHubService();
