export interface LogEntry {
  id: string;
  timestamp: string;
  category: 'Build' | 'Runtime' | 'Deployment' | 'Database' | 'AI Agent';
  severity: 'info' | 'warning' | 'error';
  message: string;
}

class LogsService {
  getLogsForProject(projectId: string): LogEntry[] {
    return [
      { id: 'log-1', timestamp: '10:14:02', category: 'Deployment', severity: 'info', message: 'Initializing pipeline build for commit 082481f...' },
      { id: 'log-2', timestamp: '10:14:05', category: 'Build', severity: 'info', message: 'Vite v7.3.6 compiled 2481 modules in 2.05s' },
      { id: 'log-3', timestamp: '10:14:08', category: 'AI Agent', severity: 'info', message: 'Agent applied refactor to Hero.tsx component' },
      { id: 'log-4', timestamp: '10:14:10', category: 'Database', severity: 'info', message: 'Postgres connection pool established (3 active clients)' },
      { id: 'log-5', timestamp: '10:14:12', category: 'Deployment', severity: 'info', message: 'SSL certificate verified. Edge CDN route LIVE.' },
    ];
  }
}

export const logsService = new LogsService();
