export interface TelemetryTimeSeriesItem {
  name: string;
  date: string;
  views: number;
  visitors: number;
}

export interface DeviceDistributionItem {
  name: string;
  percent: number;
  count: number;
  formattedPercent: string;
}

export interface AcquisitionChannelItem {
  source: string;
  visitors: number;
  percentage: number;
}

export interface RecentVisitItem {
  id: string;
  path: string;
  referrerSource: string;
  deviceType: string;
  browser: string;
  os: string;
  country: string;
  timeAgo: string;
  createdAt: string;
}

export interface RealtimeTelemetry {
  activeVisitorsLast5Min: number;
  totalViews: number;
  totalVisitors: number;
  timeSeries: TelemetryTimeSeriesItem[];
  deviceDistribution: DeviceDistributionItem[];
  acquisitionChannels: AcquisitionChannelItem[];
  topPages: Array<{ path: string; views: number }>;
  recentVisits: RecentVisitItem[];
  isTrackingActive: boolean;
}

export interface ProjectAnalytics {
  totalGenerations: number;
  totalDeployments: number;
  lastGenerated: string | null;
  lastDeployed: string | null;
  qualityScores: {
    visual: number | null;
    seo: number | null;
    accessibility: number | null;
    performance: number | null;
  };
  chatMessages: number;
  versionsCount: number;
  realtime: RealtimeTelemetry;
}

function getDefaultRealtime(): RealtimeTelemetry {
  return {
    activeVisitorsLast5Min: 0,
    totalViews: 0,
    totalVisitors: 0,
    timeSeries: [],
    deviceDistribution: [
      { name: "Desktop", percent: 0, count: 0, formattedPercent: "0%" },
      { name: "Mobile", percent: 0, count: 0, formattedPercent: "0%" },
      { name: "Tablet", percent: 0, count: 0, formattedPercent: "0%" },
    ],
    acquisitionChannels: [],
    topPages: [],
    recentVisits: [],
    isTrackingActive: true,
  };
}

class AnalyticsService {
  private cache: Record<string, ProjectAnalytics> = {};

  async fetchAnalyticsForProject(projectId: string, timeframe = "7d"): Promise<ProjectAnalytics> {
    try {
      const res = await fetch(`/api/analytics/projects/${projectId}?timeframe=${timeframe}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        this.cache[projectId] = {
          totalGenerations: data.totalGenerations || 0,
          totalDeployments: data.totalDeployments || 0,
          lastGenerated: data.lastGenerated ? new Date(data.lastGenerated).toLocaleString() : null,
          lastDeployed: data.lastDeployed ? new Date(data.lastDeployed).toLocaleString() : null,
          qualityScores: data.qualityScores || { visual: null, seo: null, accessibility: null, performance: null },
          chatMessages: data.chatMessages || 0,
          versionsCount: data.versionsCount || 0,
          realtime: data.realtime || getDefaultRealtime(),
        };
      }
    } catch {
      // Fallback to cache or defaults
    }

    return this.cache[projectId] || {
      totalGenerations: 0,
      totalDeployments: 0,
      lastGenerated: null,
      lastDeployed: null,
      qualityScores: { visual: null, seo: null, accessibility: null, performance: null },
      chatMessages: 0,
      versionsCount: 0,
      realtime: getDefaultRealtime(),
    };
  }

  getAnalyticsForProject(projectId: string): ProjectAnalytics {
    return this.cache[projectId] || {
      totalGenerations: 0,
      totalDeployments: 0,
      lastGenerated: null,
      lastDeployed: null,
      qualityScores: { visual: null, seo: null, accessibility: null, performance: null },
      chatMessages: 0,
      versionsCount: 0,
      realtime: getDefaultRealtime(),
    };
  }

  async sendTestVisit(projectId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/analytics/projects/${projectId}/test-visit`, {
        method: "POST",
        credentials: "include",
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const analyticsService = new AnalyticsService();
