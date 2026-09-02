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

function mapBackendToFrontend(d: any, index: number, total: number, projectName: string): Deployment {
  return {
    id: d.id,
    number: total - index,
    projectId: d.projectId,
    projectName: projectName,
    commitMsg: d.error ? `Failed: ${d.error}` : 'Production Deployment',
    commitHash: d.id.substring(0, 7),
    environment: d.environment === 'production' ? 'Production' : 'Preview',
    status: d.status === 'live' ? 'live' : d.status === 'failed' ? 'failed' : 'building',
    url: d.liveUrl || `https://${d.ftpHost || d.projectId}.site.zovaix.com`,
    createdAt: new Date(d.createdAt).toLocaleString(),
    logs: d.deploymentLog ? d.deploymentLog.split('\n').filter(Boolean) : [],
  };
}

class DeploymentsService {
  async getAll(): Promise<Deployment[]> {
    return [];
  }

  async getByProject(projectId: string, projectName: string = projectId): Promise<Deployment[]> {
    const res = await fetch(`/api/projects/${projectId}/deployments`, {
      credentials: "omit", 
    });
    if (!res.ok) {
      if (res.status === 404) return [];
      throw new Error("Failed to fetch deployments");
    }
    const data = await res.json();
    const deps = data.deployments || [];
    return deps.map((d: any, i: number) => mapBackendToFrontend(d, i, deps.length, projectName));
  }

  async getLatestForProject(projectId: string, projectName?: string): Promise<Deployment | undefined> {
    const deps = await this.getByProject(projectId, projectName);
    return deps[0];
  }

  async triggerBuild(projectId: string, projectName: string, commitMsg: string): Promise<Deployment> {
    const res = await fetch(`/api/projects/${projectId}/deploy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        environment: "production",
        protocol: "default",
      }),
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to trigger deployment");
    }
    
    const backendDep = await res.json();
    return mapBackendToFrontend(backendDep, 0, 1, projectName);
  }
}

export const deploymentsService = new DeploymentsService();
