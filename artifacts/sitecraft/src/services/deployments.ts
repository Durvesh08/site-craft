export interface Deployment {
  id: string;
  number: number;
  projectId: string;
  projectName: string;
  commitMsg: string;
  commitHash: string;
  environment: 'Production' | 'Preview';
  status: 'live' | 'building' | 'failed';
  url: string;
  createdAt: string;
  logs: string[];
}

const INITIAL_DEPLOYMENTS: Deployment[] = [
  {
    id: 'dep-42',
    number: 42,
    projectId: 'lumina',
    projectName: 'Lumina Interior Architecture',
    commitMsg: 'Updated hero composition and typography styling',
    commitHash: '85e269e',
    environment: 'Production',
    status: 'live',
    url: 'https://lumina.site.zovaix.com',
    createdAt: '12 mins ago',
    logs: [
      '[08:14:02] Initializing deployment pipeline...',
      '[08:14:03] Pulling commit 85e269e (main)...',
      '[08:14:05] Running Vite production build...',
      '[08:14:08] Optimized 14 assets (1.8MB total)',
      '[08:14:10] Verifying SSL certificate for lumina.site.zovaix.com...',
      '[08:14:12] Deployment #42 is LIVE on edge global CDN.',
    ],
  },
  {
    id: 'dep-41',
    number: 41,
    projectId: 'lumina',
    projectName: 'Lumina Interior Architecture',
    commitMsg: 'Refactored navigation header and sound engine',
    commitHash: 'd0ea1f0',
    environment: 'Production',
    status: 'live',
    url: 'https://lumina-dep-41.site.zovaix.com',
    createdAt: '2 hours ago',
    logs: [
      '[06:30:00] Initializing deployment pipeline...',
      '[06:30:04] Vite build completed in 2.4s.',
      '[06:30:08] Deployment #41 LIVE.',
    ],
  },
  {
    id: 'dep-40',
    number: 40,
    projectId: 'pulsar',
    projectName: 'Pulsar Analytics Cloud',
    commitMsg: 'Connected Supabase realtime database connector',
    commitHash: '65d5e90',
    environment: 'Production',
    status: 'live',
    url: 'https://pulsar.site.zovaix.com',
    createdAt: 'Yesterday',
    logs: [
      '[14:22:00] Deployment #40 LIVE.',
    ],
  },
];

class DeploymentsService {
  private deployments: Deployment[] = [...INITIAL_DEPLOYMENTS];

  getAll(): Deployment[] {
    return this.deployments;
  }

  getByProject(projectId: string): Deployment[] {
    return this.deployments.filter(d => d.projectId === projectId);
  }

  getLatestForProject(projectId: string): Deployment | undefined {
    return this.getByProject(projectId)[0];
  }

  triggerBuild(projectId: string, projectName: string, commitMsg: string): Deployment {
    const nextNum = (this.deployments[0]?.number || 40) + 1;
    const newDep: Deployment = {
      id: `dep-${nextNum}`,
      number: nextNum,
      projectId,
      projectName,
      commitMsg: commitMsg || 'Manual trigger build via Zovaix AI',
      commitHash: Math.random().toString(16).substring(2, 9),
      environment: 'Production',
      status: 'live',
      url: `https://${projectId}.site.zovaix.com`,
      createdAt: 'Just now',
      logs: [
        `[${new Date().toLocaleTimeString()}] Initializing deployment pipeline...`,
        `[${new Date().toLocaleTimeString()}] Running Vite build...`,
        `[${new Date().toLocaleTimeString()}] Deployment #${nextNum} is LIVE.`,
      ],
    };
    this.deployments.unshift(newDep);
    return newDep;
  }
}

export const deploymentsService = new DeploymentsService();
