export interface ProjectAnalytics {
  visitors: string;
  visitorsChange: string;
  sessions: string;
  sessionsChange: string;
  pageViews: string;
  pageViewsChange: string;
  bounceRate: string;
  bounceRateChange: string;
  avgSessionDuration: string;
  trafficData: { date: string; views: number; visitors: number }[];
  deviceBreakdown: { device: string; percentage: number }[];
  topPages: { path: string; views: number }[];
}

class AnalyticsService {
  getAnalyticsForProject(projectId: string): ProjectAnalytics {
    return {
      visitors: '18,420',
      visitorsChange: '+24.5%',
      sessions: '24,180',
      sessionsChange: '+18.2%',
      pageViews: '64,910',
      pageViewsChange: '+31.0%',
      bounceRate: '34.2%',
      bounceRateChange: '-4.1%',
      avgSessionDuration: '3m 42s',
      trafficData: [
        { date: 'Mon', views: 4200, visitors: 2800 },
        { date: 'Tue', views: 5800, visitors: 3900 },
        { date: 'Wed', views: 7400, visitors: 4900 },
        { date: 'Thu', views: 6900, visitors: 4600 },
        { date: 'Fri', views: 8900, visitors: 5800 },
        { date: 'Sat', views: 11200, visitors: 7400 },
        { date: 'Sun', views: 9800, visitors: 6500 },
      ],
      deviceBreakdown: [
        { device: 'Desktop', percentage: 62 },
        { device: 'Mobile', percentage: 31 },
        { device: 'Tablet', percentage: 7 },
      ],
      topPages: [
        { path: '/', views: 28400 },
        { path: '/portfolio', views: 14200 },
        { path: '/contact', views: 9800 },
        { path: '/about', views: 7600 },
      ],
    };
  }
}

export const analyticsService = new AnalyticsService();
