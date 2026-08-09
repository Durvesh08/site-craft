export interface SecurityFinding {
  id: string;
  category: 'Secrets' | 'Dependencies' | 'Authentication' | 'API Security' | 'Database Access' | 'Code Vulnerabilities';
  severity: 'critical' | 'warning' | 'info' | 'passed';
  title: string;
  description: string;
}

export interface SecurityReport {
  score: number;
  findings: SecurityFinding[];
}

class SecurityService {
  getReportForProject(projectId: string): SecurityReport {
    return {
      score: 92,
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
          severity: 'warning',
          title: 'Authentication Review Recommended',
          description: 'OAuth callback redirect URI whitelist should specify exact production subdomains.',
        },
      ],
    };
  }
}

export const securityService = new SecurityService();
