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
    return this.projects.find(p => p.id === id);
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
      domain: `${id}.zovaix.site`,
      thumbnail: undefined, // Neutral placeholder by default, no stock images
      isStarred: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: 'Just now',
    };
    this.projects.unshift(newProject);
    return newProject;
  }

  toggleStar(id: string): Project | undefined {
    const project = this.getById(id);
    if (project) {
      project.isStarred = !project.isStarred;
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
      domain: `${newId}.zovaix.site`,
      status: 'draft',
      updatedAt: 'Just now',
    };
    this.projects.unshift(copy);
    return copy;
  }

  archive(id: string): boolean {
    const project = this.getById(id);
    if (project) {
      project.isArchived = true;
      return true;
    }
    return false;
  }

  restore(id: string): boolean {
    const project = this.projects.find(p => p.id === id);
    if (project) {
      project.isArchived = false;
      return true;
    }
    return false;
  }

  delete(id: string): boolean {
    const idx = this.projects.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.projects.splice(idx, 1);
      return true;
    }
    return false;
  }
}

export const projectsService = new ProjectsService();
