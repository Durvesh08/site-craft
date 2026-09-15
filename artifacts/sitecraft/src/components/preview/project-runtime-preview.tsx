import React, { useState, useEffect } from "react";
import { Loader2, Sparkles, AlertTriangle } from "lucide-react";

interface ProjectRuntimePreviewProps {
  projectId: string;
  page?: string;
}

function extractPageHtml(content: string | null, targetPage: string = "index.html"): string | null {
  if (!content) return content;
  const trimmed = content.trim();
  if (trimmed.startsWith("{")) {
    try {
      const pages: Record<string, string> = JSON.parse(trimmed);
      return pages[targetPage] || pages["index.html"] || Object.values(pages)[0] || content;
    } catch {
      return content;
    }
  }
  return content;
}

export function ProjectRuntimePreview({ projectId, page }: ProjectRuntimePreviewProps) {
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const targetPage = page || searchParams?.get("page") || "index.html";
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
          } else if (data.activeJobId || data.status === "building" || data.status === "generating") {
            setJobStatus("AI Agent is crafting layout, typography, and design tokens...");
            // Poll active job
            if (data.activeJobId) {
              const jobRes = await fetch(`/api/jobs/${data.activeJobId}`, { credentials: "include" });
              if (jobRes.ok) {
                const jobData = await jobRes.json();
                if (jobData.currentStep) {
                  setJobStatus(`AI Step: ${jobData.currentStep} (${Math.round(jobData.progress || 0)}%)`);
                }
                if (jobData.status === "completed") {
                  // Job completed, re-fetch project
                  pollTimer = setTimeout(fetchProjectData, 1000);
                  return;
                }
              }
            }
            pollTimer = setTimeout(fetchProjectData, 2000);
          } else {
            // Draft with no HTML yet — keep loading or show canvas, DO NOT overwrite backend
            setLoading(false);
          }
        } else {
          // Try lookup by project slug
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

  if (loading || jobStatus || (!htmlContent && !error)) {
    return (
      <div className="min-h-screen bg-[#090A0C] text-white flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="h-12 w-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary animate-pulse">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Generating Website with AI</h2>
          <p className="text-xs text-zinc-400 mt-1">{jobStatus || "AI is synthesizing bespoke components and content..."}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 px-3.5 py-1.5 rounded-full border border-primary/20">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Building high-conversion sections...</span>
        </div>
      </div>
    );
  }

  const finalHtml = extractPageHtml(htmlContent, targetPage) || "";

  return (
    <iframe
      srcDoc={finalHtml}
      title="Project Preview"
      className="w-full h-full min-h-screen border-none bg-[#090A0C]"
      sandbox="allow-scripts allow-same-origin allow-forms"
    />
  );
}


