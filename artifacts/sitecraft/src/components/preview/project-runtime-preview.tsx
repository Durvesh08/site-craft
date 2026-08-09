import React, { useState, useEffect } from "react";
import { Loader2, Sparkles, AlertTriangle } from "lucide-react";

interface ProjectRuntimePreviewProps {
  projectId: string;
}

export function ProjectRuntimePreview({ projectId }: ProjectRuntimePreviewProps) {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let pollTimer: any = null;

    const fetchProjectData = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (!isMounted) return;

          if (data.generatedHtml) {
            setHtmlContent(data.generatedHtml);
            setLoading(false);
          } else if (data.activeJobId || data.status === "building") {
            setJobStatus("AI Agent is generating website layout and design system...");
            // Poll active job
            if (data.activeJobId) {
              const jobRes = await fetch(`/api/jobs/${data.activeJobId}`, { credentials: "include" });
              if (jobRes.ok) {
                const jobData = await jobRes.json();
                if (jobData.currentStep) {
                  setJobStatus(`AI Step: ${jobData.currentStep} (${Math.round(jobData.progress || 0)}%)`);
                }
              }
            }
            pollTimer = setTimeout(fetchProjectData, 2000);
          } else {
            setLoading(false);
          }
        } else {
          // Try fallback by project slug search if UUID mismatch
          const listRes = await fetch("/api/projects", { credentials: "include" });
          if (listRes.ok) {
            const listData = await listRes.json();
            const items = listData.projects || listData;
            const matched = Array.isArray(items) && items.find((p: any) =>
              p.id === projectId || p.name.toLowerCase().replace(/[^a-z0-9]/g, "-") === projectId
            );
            if (matched && matched.generatedHtml) {
              setHtmlContent(matched.generatedHtml);
              setLoading(false);
              return;
            }
          }
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || "Failed to load project preview");
          setLoading(false);
        }
      }
    };

    fetchProjectData();

    return () => {
      isMounted = false;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [projectId]);

  if (loading || jobStatus) {
    return (
      <div className="min-h-screen bg-[#090A0C] text-white flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="h-12 w-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary animate-pulse">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Synthesizing Website Codebase</h2>
          <p className="text-xs text-zinc-400 mt-1 font-mono">{jobStatus || "Fetching generated HTML & components..."}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-primary font-mono bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Generating design tokens & fluid layouts...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#090A0C] text-white flex flex-col items-center justify-center p-8 text-center space-y-3">
        <AlertTriangle className="h-8 w-8 text-amber-400" />
        <h2 className="text-base font-bold text-white">Preview Generation Notice</h2>
        <p className="text-xs text-zinc-400 max-w-md">{error}</p>
      </div>
    );
  }

  if (htmlContent) {
    return (
      <iframe
        srcDoc={htmlContent}
        title="Project Preview"
        className="w-full h-full min-h-screen border-none bg-white"
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    );
  }

  // Fallback if no HTML generated yet
  return (
    <div className="min-h-screen bg-[#090A0C] text-[#F4F4F5] font-sans p-8 space-y-12 select-none">
      <header className="flex items-center justify-between border-b border-white/10 pb-6">
        <span className="font-bold text-lg text-white font-sans">{projectId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
        <nav className="flex items-center gap-6 text-sm text-zinc-400 font-medium">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#about" className="hover:text-white transition-colors">About</a>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto text-center space-y-6 pt-16">
        <span className="px-3 py-1 rounded-full text-xs font-mono bg-primary/10 text-primary border border-primary/20 uppercase">
          Draft State
        </span>
        <h1 className="text-5xl font-extrabold tracking-tight text-white leading-tight">
          {projectId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </h1>
        <p className="text-zinc-400 text-base max-w-xl mx-auto leading-relaxed">
          AI Application workspace initialized. Use the AI Chat on the right to build components and pages.
        </p>
      </main>
    </div>
  );
}
