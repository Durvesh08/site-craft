export interface Project {
  id: string;
  name: string;
  description: string;
  category: 'SaaS' | 'E-Commerce' | 'Portfolio' | 'Restaurant' | 'Agency' | 'Web3' | 'Web App' | 'Dashboard' | 'Internal Tool';
  status: 'published' | 'draft' | 'building';
  domain?: string;
  thumbnail?: string; // Real screenshot URL if available; undefined renders neutral SVG code placeholder
  isStarred: boolean;
  isArchived: boolean;
  folderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  color?: string;
  count: number;
}

const INITIAL_PROJECTS: Project[] = [];
const INITIAL_FOLDERS: Folder[] = [];

class ProjectsService {
  private projects: Project[] = [...INITIAL_PROJECTS];
  private folders: Folder[] = [...INITIAL_FOLDERS];

  constructor() {
    // Disabled automatic unawaited fetch in constructor to prevent race conditions.
    // List/dashboard components should fetch reactively using React Query.
  }

  async fetchRemoteProjects(): Promise<Project[]> {
    try {
      const res = await fetch("/api/projects", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const items = data.projects || data;
        if (Array.isArray(items)) {
          const mapped: Project[] = items.map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.businessDescription || p.description || `Bespoke ${p.category || 'SaaS'} web application`,
            category: (p.category || 'SaaS') as any,
            status: p.status === 'deployed' ? 'published' : 'draft',
            domain: p.domain || `${p.id}.site.zovaix.com`,
            thumbnail: p.thumbnailUrl || undefined,
            isStarred: !!p.isStarred,
            isArchived: p.status === 'archived',
            createdAt: p.createdAt || new Date().toISOString(),
            updatedAt: p.updatedAt ? new Date(p.updatedAt).toLocaleTimeString() : 'Just now',
          }));
          this.projects = mapped;
          return mapped;
        }
      }
    } catch {
      // Fallback
    }
    return this.projects;
  }

  getAll(): Project[] {
    return this.projects.filter(p => !p.isArchived);
  }

  getRecent(limit: number = 4): Project[] {
    return this.getAll().slice(0, limit);
  }

  getStarred(): Project[] {
    return this.projects.filter(p => p.isStarred && !p.isArchived);
  }

  getArchived(): Project[] {
    return this.projects.filter(p => p.isArchived);
  }

  getById(id: string): Project | undefined {
    if (!id) return undefined;
    const cleanId = id.toLowerCase();
    return this.projects.find(p =>
      p.id === id ||
      p.id.toLowerCase() === cleanId ||
      p.name.toLowerCase().replace(/[^a-z0-9]/g, '-') === cleanId ||
      cleanId.includes(p.id.toLowerCase())
    );
  }

  getFolders(): Folder[] {
    return this.folders;
  }

  create(name: string, category: Project['category'], description: string = ''): Project {
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || `proj-${Date.now()}`;
    const newProject: Project = {
      id,
      name,
      description: description || `Bespoke ${category} web experience built with Zovaix AI`,
      category,
      status: 'draft',
      domain: `${id}.site.zovaix.com`,
      thumbnail: undefined,
      isStarred: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: 'Just now',
    };
    this.projects.unshift(newProject);
    return newProject;
  }

  async createRemoteProject(name: string, category: Project['category'], description: string = ''): Promise<Project> {
    const localProj = this.create(name, category, description);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: localProj.name,
          category: localProj.category,
          businessDescription: description || localProj.description,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.id) {
          localProj.id = data.id;
          this.fetchRemoteProjects().catch(() => {});
        }
      }
    } catch {
      // Keep localProj fallback
    }

    return localProj;
  }

  async toggleStar(id: string): Promise<Project | undefined> {
    const project = this.getById(id);
    if (project) {
      project.isStarred = !project.isStarred;
      try {
        await fetch(`/api/projects/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ isStarred: project.isStarred }),
        });
      } catch {}
    }
    return project;
  }

  duplicate(id: string): Project | undefined {
    const original = this.getById(id);
    if (!original) return undefined;
    
    const newId = `${original.id}-copy-${Date.now().toString().slice(-4)}`;
    const copy: Project = {
      ...original,
      id: newId,
      name: `${original.name} (Copy)`,
      domain: `${newId}.site.zovaix.com`,
      status: 'draft',
      updatedAt: 'Just now',
    };
    this.projects.unshift(copy);
    this.createRemoteProject(copy.name, copy.category, copy.description);
    return copy;
  }

  async archive(id: string): Promise<boolean> {
    const project = this.getById(id);
    if (project) {
      project.isArchived = true;
      try {
        await fetch(`/api/projects/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: "archived" }),
        });
      } catch {}
      return true;
    }
    return false;
  }

  async restore(id: string): Promise<boolean> {
    const project = this.projects.find(p => p.id === id);
    if (project) {
      project.isArchived = false;
      try {
        await fetch(`/api/projects/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: "draft" }),
        });
      } catch {}
      return true;
    }
    return false;
  }

  async delete(id: string): Promise<boolean> {
    const idx = this.projects.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.projects.splice(idx, 1);
      try {
        await fetch(`/api/projects/${id}`, {
          method: "DELETE",
          credentials: "include",
        });
      } catch {}
      return true;
    }
    return false;
  }
}

export const projectsService = new ProjectsService();
