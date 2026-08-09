export interface SecurityFinding {
  id: string;
  category: 'Overview' | 'Secrets' | 'Dependencies' | 'Authentication' | 'API Security' | 'Database Access' | 'Deployments' | 'Activity';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info' | 'passed';
  title: string;
  description: string;
  affectedFile?: string;
}

export interface SecurityReport {
  isScannerConnected: boolean;
  score?: number;
  findings: SecurityFinding[];
}

class SecurityService {
  private reports: Record<string, SecurityReport> = {
    lumina: {
      isScannerConnected: true,
      score: 94,
      findings: [
        {
          id: 'sec-chk-1',
          category: 'Secrets',
          severity: 'passed',
          title: 'No Exposed Secrets in Source Code',
          description: 'Zero hardcoded tokens or API keys detected in git repository history.',
        },
        {
          id: 'sec-chk-2',
          category: 'Dependencies',
          severity: 'passed',
          title: 'Dependency Vulnerability Scan Clean',
          description: 'All 248 node packages up to date with zero high-severity CVE advisories.',
        },
        {
          id: 'sec-chk-3',
          category: 'Authentication',
          severity: 'medium',
          title: 'Authentication Review Recommended',
          description: 'OAuth callback redirect URI whitelist should specify exact production subdomains.',
        },
      ],
    },
  };

  getReportForProject(projectId: string): SecurityReport {
    if (this.reports[projectId]) return this.reports[projectId];
    return {
      isScannerConnected: false,
      findings: [],
    };
  }

  connectScanner(projectId: string): SecurityReport {
    this.reports[projectId] = {
      isScannerConnected: true,
      score: 95,
      findings: [
        {
          id: 'sec-chk-init',
          category: 'Overview',
          severity: 'passed',
          title: 'Initial Security Audit Complete',
          description: 'Sub-resource integrity and CORS policies verified.',
        },
      ],
    };
    return this.reports[projectId];
  }
}

export const securityService = new SecurityService();
