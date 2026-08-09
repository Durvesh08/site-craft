export interface VersionSnapshot {
  id: string;
  version: string;
  projectId: string;
  message: string;
  author: string;
  timestamp: string;
  filesChanged: string[];
}

const INITIAL_VERSIONS: VersionSnapshot[] = [
  {
    id: 'v24',
    version: 'v24',
    projectId: 'lumina',
    message: 'Updated hero composition and typography styling',
    author: 'Zovaix AI Agent',
    timestamp: 'Today at 08:14',
    filesChanged: ['src/components/Hero.tsx', 'src/styles.css'],
  },
  {
    id: 'v23',
    version: 'v23',
    projectId: 'lumina',
    message: 'Added luxury acoustic hardware landing page section',
    author: 'Alex Chen',
    timestamp: 'Yesterday at 16:45',
    filesChanged: ['src/App.tsx', 'src/components/Features.tsx'],
  },
  {
    id: 'v22',
    version: 'v22',
    projectId: 'lumina',
    message: 'Initial project synthesis from prompt brief',
    author: 'Zovaix AI Agent',
    timestamp: 'Aug 1, 2026 at 10:00',
    filesChanged: ['src/App.tsx', 'package.json', 'README.md'],
  },
];

class VersionsService {
  private versions: VersionSnapshot[] = [...INITIAL_VERSIONS];

  getVersionsForProject(projectId: string): VersionSnapshot[] {
    return this.versions.filter(v => v.projectId === projectId);
  }

  createVersion(projectId: string, message: string, filesChanged: string[]): VersionSnapshot {
    const nextNum = (this.versions.length || 0) + 1;
    const v: VersionSnapshot = {
      id: `v${nextNum}`,
      version: `v${nextNum}`,
      projectId,
      message,
      author: 'Zovaix AI Agent',
      timestamp: 'Just now',
      filesChanged,
    };
    this.versions.unshift(v);
    return v;
  }
}

export const versionsService = new VersionsService();
