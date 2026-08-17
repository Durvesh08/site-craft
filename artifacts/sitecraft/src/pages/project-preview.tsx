import React, { useState } from "react";
import { useParams } from "wouter";
import { useGetProject } from "@workspace/api-client-react";
import { ProjectWorkspaceLayout } from "./project-workspace-layout";
import { Button } from "@/components/ui/button";
import {
  Monitor,
  Tablet,
  Smartphone,
  RotateCw,
  ExternalLink,
  Share2,
  Copy,
  Check
} from "lucide-react";

export default function ProjectPreview() {
  const { id } = useParams<{ id?: string }>();
  const projectId = id || 'lumina';
  const { data } = useGetProject(projectId);
  
  const project = (data || {
    id: projectId,
    name: projectId,
    domain: `${projectId}.site.zovaix.com`,
    status: 'draft',
    description: '',
    category: 'SaaS',
    isStarred: false,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }) as any;

  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [copied, setCopied] = useState(false);
  const [key, setKey] = useState(0);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://${project.domain}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getViewportWidth = () => {
    if (viewport === 'mobile') return 'w-[375px] h-[667px]';
    if (viewport === 'tablet') return 'w-[768px] h-[900px]';
    return 'w-full h-full';
  };

  return (
    <ProjectWorkspaceLayout activeTab="preview">
      <div className="flex flex-col h-full w-full bg-black/60 relative">
        
        {/* Preview Control Toolbar */}
        <div 
          className="h-12 px-6 flex items-center justify-between shrink-0 border-b select-none"
          style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}
        >
          {/* Device Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            <button
              onClick={() => setViewport('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                viewport === 'desktop' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Monitor className="h-3.5 w-3.5" /> Desktop
            </button>
            <button
              onClick={() => setViewport('tablet')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                viewport === 'tablet' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Tablet className="h-3.5 w-3.5" /> Tablet
            </button>
            <button
              onClick={() => setViewport('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                viewport === 'mobile' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" /> Mobile
            </button>
          </div>

          {/* URL Address Bar */}
          <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white/70 w-96">
            <span className="text-emerald-400">https://</span>
            <span className="truncate">{project.domain}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setKey(k => k + 1)}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              title="Refresh Preview"
            >
              <RotateCw className="h-4 w-4" />
            </button>

            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 border border-white/10 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Share'}
            </button>

            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs bg-white text-black font-semibold hover:bg-white/90 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open Tab
            </a>
          </div>
        </div>

        {/* Preview Frame Container */}
        <div className="flex-1 min-h-0 flex items-center justify-center p-6 overflow-auto">
          <div className={`transition-all duration-300 rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-black ${getViewportWidth()}`}>
            <iframe
              key={key}
              src={`/preview-frame/${projectId}`}
              title={project.name}
              className="w-full h-full border-none"
            />
          </div>
        </div>

      </div>
    </ProjectWorkspaceLayout>
  );
}
