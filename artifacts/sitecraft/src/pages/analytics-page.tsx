import React from "react";
import { useParams } from "wouter";
import { analyticsService } from "@/services/analytics";
import { projectsService } from "@/services/projects";
import { ProjectWorkspaceLayout } from "./project-workspace-layout";
import {
  Users,
  Eye,
  Activity,
  ArrowUpRight,
  TrendingUp,
  Clock,
  Globe,
  Monitor,
  Smartphone,
  Tablet
} from "lucide-react";

export default function AnalyticsPage() {
  const { id } = useParams<{ id?: string }>();
  const isProjectContext = Boolean(id);
  const projectId = id || 'lumina';
  const project = projectsService.getById(projectId) || projectsService.getAll()[0];

  const analytics = analyticsService.getAnalyticsForProject(projectId);

  const content = (
    <div className="p-6 space-y-8 max-w-6xl mx-auto h-full overflow-y-auto">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Project Analytics</h1>
        <p className="text-sm text-muted-foreground">Real-time visitor telemetry, session engagement, and top pages</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticsStatCard title="Unique Visitors" value={analytics.visitors} change={analytics.visitorsChange} icon={Users} />
        <AnalyticsStatCard title="Total Sessions" value={analytics.sessions} change={analytics.sessionsChange} icon={Activity} />
        <AnalyticsStatCard title="Page Views" value={analytics.pageViews} change={analytics.pageViewsChange} icon={Eye} />
        <AnalyticsStatCard title="Avg. Session" value={analytics.avgSessionDuration} change={analytics.bounceRateChange} icon={Clock} />
      </div>

      {/* Traffic Time-Series Visualization */}
      <div className="p-6 rounded-2xl border space-y-6" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-bold text-base text-foreground">Traffic Analytics</h3>
            <p className="text-xs text-muted-foreground">Weekly pageviews & unique visitors trend</p>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-semibold flex items-center gap-1">
            <TrendingUp className="h-4 w-4" /> Live telemetry
          </span>
        </div>

        {/* Bar Chart Visualizer */}
        <div className="h-56 flex items-end justify-between gap-2 pt-8 pb-2 border-b" style={{ borderColor: 'var(--surface-border)' }}>
          {analytics.trafficData.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
              <div className="w-full flex items-end justify-center gap-1 h-full">
                <div 
                  className="w-full max-w-[28px] bg-primary/30 group-hover:bg-primary/50 rounded-t-lg transition-all"
                  style={{ height: `${(d.visitors / 8000) * 100}%` }} 
                />
                <div 
                  className="w-full max-w-[28px] bg-primary rounded-t-lg transition-all"
                  style={{ height: `${(d.views / 12000) * 100}%` }} 
                />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">{d.date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Device Breakdown & Top Pages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Top Pages */}
        <div className="p-6 rounded-2xl border space-y-4" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
          <h3 className="font-bold text-base text-foreground">Top Performing Pages</h3>
          <div className="space-y-3">
            {analytics.topPages.map(page => (
              <div key={page.path} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-white/5 border border-white/10 font-mono">
                <span className="text-foreground font-semibold">{page.path}</span>
                <span className="text-muted-foreground">{page.views.toLocaleString()} views</span>
              </div>
            ))}
          </div>
        </div>

        {/* Device Distribution */}
        <div className="p-6 rounded-2xl border space-y-4" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
          <h3 className="font-bold text-base text-foreground">Device Distribution</h3>
          <div className="space-y-4">
            {analytics.deviceBreakdown.map(dev => (
              <div key={dev.device} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">{dev.device}</span>
                  <span className="text-foreground font-bold">{dev.percentage}%</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${dev.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );

  if (isProjectContext) {
    return <ProjectWorkspaceLayout activeTab="analytics">{content}</ProjectWorkspaceLayout>;
  }

  return content;
}

function AnalyticsStatCard({ title, value, change, icon: Icon }: { title: string; value: string; change: string; icon: any }) {
  return (
    <div className="p-5 rounded-2xl border space-y-3" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-mono uppercase tracking-wider">{title}</span>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-extrabold text-foreground">{value}</span>
        <span className="text-xs font-mono text-emerald-400 font-semibold">{change}</span>
      </div>
    </div>
  );
}
