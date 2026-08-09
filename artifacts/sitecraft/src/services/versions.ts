export interface VersionSnapshot {
  id: string;
  version: string;
  projectId: string;
  message: string;
  author: string;
  timestamp: string;
  filesChanged: string[];
}

class VersionsService {
  private versionsByProject: Record<string, VersionSnapshot[]> = {};

  async fetchVersionsForProject(projectId: string): Promise<VersionSnapshot[]> {
    try {
      const res = await fetch(`/api/projects/${projectId}/versions`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.versions || [];
        const mapped: VersionSnapshot[] = list.map((v: any, idx: number) => ({
          id: v.id || `ver-${idx}`,
          version: v.label || `v${v.versionNumber || idx + 1}`,
          projectId,
          message: v.label || `Version snapshot ${v.versionNumber || idx + 1}`,
          author: v.authorName || 'Zovaix AI Agent',
          timestamp: v.createdAt ? new Date(v.createdAt).toLocaleString() : 'Just now',
          filesChanged: ['index.html', 'src/App.tsx', 'src/index.css'],
        }));
        this.versionsByProject[projectId] = mapped;
      }
    } catch {
      // Keep existing cache
    }
    return this.versionsByProject[projectId] || [];
  }

  getVersionsForProject(projectId: string): VersionSnapshot[] {
    return this.versionsByProject[projectId] || [];
  }

  async restoreVersion(projectId: string, versionId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/projects/${projectId}/versions/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ versionId }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const versionsService = new VersionsService();
