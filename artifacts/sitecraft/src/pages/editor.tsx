/**
 * SiteCraft — Project Editor / Preview (Fixed)
 * 
 * File location in your repo: artifacts/sitecraft/src/pages/editor.tsx
 * 
 * FIX: The iframe preview was breaking because:
 * 1. Blob URL was created inside an async import().then() which didn't
 *    properly clean up on unmount or on rapid prop changes.
 * 2. injectLinkGuard could corrupt HTML structure.
 * 3. No loading/error states while HTML is being prepared.
 * 
 * Now: blob URL creation is synchronous and stable, with proper
 * cleanup via useEffect dependency tracking.
 */

import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useGetProject } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  RotateCcw,
  Download,
  FileCode2,
  FolderArchive,
  Monitor,
  Tablet,
  Smartphone,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { injectLinkGuard } from "@/lib/injectLinkGuard";

type Viewport = "desktop" | "tablet" | "mobile";

export default function ProjectEditor() {
  const { id } = useParams<{ id: string }>();

  const { data: project, refetch, isLoading } = useGetProject(id, {
    query: { enabled: !!id, queryKey: [] as unknown[] },
  });

  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Build a blob URL from the generated HTML — runs synchronously
  useEffect(() => {
    // Cleanup previous blob URL
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    if (project?.generatedHtml) {
      try {
        const guarded = injectLinkGuard(project.generatedHtml);
        const blob = new Blob([guarded], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setIframeUrl(url);
      } catch (err) {
        console.error("Failed to create preview blob:", err);
        setIframeUrl(null);
      }
    } else {
      setIframeUrl(null);
    }

    // Cleanup on unmount
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [project?.generatedHtml]);

  const triggerDownload = (url: string) => {
    if (!project?.generatedHtml) {
      toast.error("No site generated yet.");
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const getViewportWidth = () => {
    if (viewport === "mobile") return "w-[375px]";
    if (viewport === "tablet") return "w-[768px]";
    return "w-full";
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900">
        {/* Left: Title */}
        <div className="flex items-center gap-3 min-w-0">
          <FileCode2 className="w-5 h-5 text-indigo-400 shrink-0" />
          <span className="text-sm font-medium text-slate-200 truncate">
            {project?.name || "Untitled Project"}
          </span>
        </div>

        {/* Center: Viewport switcher */}
        <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
          {(["desktop", "tablet", "mobile"] as Viewport[]).map((v) => {
            const Icon = v === "desktop" ? Monitor : v === "tablet" ? Tablet : Smartphone;
            return (
              <button
                key={v}
                onClick={() => setViewport(v)}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  viewport === v
                    ? "bg-indigo-500 text-white"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                )}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="text-slate-300 hover:text-white hover:bg-slate-800 gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reload
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="bg-indigo-500 hover:bg-indigo-600 text-white gap-2">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => triggerDownload(`/api/projects/${id}/export`)}
                className="gap-2 cursor-pointer"
              >
                <FileCode2 className="w-4 h-4" />
                <div className="flex flex-col">
                  <span>HTML file</span>
                  <span className="text-xs text-slate-400">Single self-contained page</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => triggerDownload(`/api/projects/${id}/export/zip`)}
                className="gap-2 cursor-pointer"
              >
                <FolderArchive className="w-4 h-4" />
                <div className="flex flex-col">
                  <span>ZIP package</span>
                  <span className="text-xs text-slate-400">
                    index.html + .htaccess + sitemap
                  </span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Preview canvas */}
      <div className="flex-1 flex items-start justify-center overflow-auto bg-slate-950 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : !project?.generatedHtml ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
            <FileCode2 className="w-12 h-12 opacity-50" />
            <p className="text-sm">No preview available. Generate a landing page first.</p>
          </div>
        ) : (
          <div className={cn("h-full transition-all", getViewportWidth())}>
            {iframeUrl ? (
              <iframe
                src={iframeUrl}
                title="Landing Page Preview"
                className="w-full h-full bg-white rounded-lg shadow-2xl border border-slate-800"
                sandbox="allow-scripts allow-same-origin allow-popups"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}