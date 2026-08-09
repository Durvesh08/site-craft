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

const INITIAL_PROJECTS: Project[] = [
  {
    id: 'lumina',
    name: 'Lumina Interior Architecture',
    description: 'Bespoke high-end residential interior architecture showcase',
    category: 'Portfolio',
    status: 'published',
    domain: 'lumina.zovaix.site',
    thumbnail: undefined,
    isStarred: true,
    isArchived: false,
    folderId: 'clients',
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '10 mins ago',
  },
  {
    id: 'pulsar',
    name: 'Pulsar Analytics Cloud',
    description: 'Real-time telemetry and data engine marketing site',
    category: 'SaaS',
    status: 'published',
    domain: 'pulsar.zovaix.site',
    thumbnail: undefined,
    isStarred: true,
    isArchived: false,
    folderId: 'saas',
    createdAt: '2026-08-03T14:30:00Z',
    updatedAt: '2 hours ago',
  },
  {
    id: 'clout',
    name: 'Clout Esports & Gaming',
    description: 'High-octane tournament community portal & merch store',
    category: 'Agency',
    status: 'published',
    domain: 'clout.zovaix.site',
    thumbnail: undefined,
    isStarred: false,
    isArchived: false,
    folderId: 'clients',
    createdAt: '2026-08-04T09:15:00Z',
    updatedAt: 'Yesterday',
  },
  {
    id: 'sonora',
    name: 'Sonora Acoustic Hardware',
    description: 'Minimal luxury wireless headphones product launch landing',
    category: 'E-Commerce',
    status: 'draft',
    domain: 'sonora.zovaix.site',
    thumbnail: undefined,
    isStarred: false,
    isArchived: false,
    folderId: 'ecommerce',
    createdAt: '2026-08-06T18:00:00Z',
    updatedAt: '3 days ago',
  },
];

const INITIAL_FOLDERS: Folder[] = [
  { id: 'clients', name: 'Client Projects', color: '#8B5CF6', count: 2 },
  { id: 'saas', name: 'SaaS Products', color: '#3B82F6', count: 1 },
  { id: 'ecommerce', name: 'E-Commerce', color: '#10B981', count: 1 },
];

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
