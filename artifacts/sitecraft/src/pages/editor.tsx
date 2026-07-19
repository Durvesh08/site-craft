import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useGetProject } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  RotateCcw, Download, FileCode2, FolderArchive, ChevronDown,
  Monitor, Tablet, Smartphone, Sparkles,
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

type Viewport = "desktop" | "tablet" | "mobile";

export default function ProjectEditor() {
  const { id } = useParams<{ id: string }>();

  const { data: project, refetch } = useGetProject(id, {
    query: { enabled: !!id, queryKey: [] as unknown[] },
  });

  const [viewport, setViewport]   = useState<Viewport>("desktop");
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  // Build a blob URL from the generated HTML so the iframe is sandboxed
  useEffect(() => {
    if (project?.generatedHtml) {
      import("@/lib/injectLinkGuard").then(({ injectLinkGuard }) => {
        const guarded = injectLinkGuard(project.generatedHtml!);
        const blob = new Blob([guarded], { type: "text/html" });
        const url  = URL.createObjectURL(blob);
        setIframeUrl(url);
        return () => URL.revokeObjectURL(url);
      });
    }
    return undefined;
  }, [project?.generatedHtml]);

  const triggerDownload = (url: string) => {
    if (!project?.generatedHtml) { toast.error("No site generated yet."); return; }
    const a = document.createElement("a");
    a.href = url; a.download = "";
    document.body.appendChild(a); a.click(); a.remove();
  };

  const getViewportWidth = () => {
    if (viewport === "mobile") return "w-[375px]";
    if (viewport === "tablet") return "w-[768px]";
    return "w-full";
  };

  return (
    <div className="flex h-[calc(100vh-64px)] md:h-screen w-full bg-background overflow-hidden">

      {/* ── Preview canvas ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col relative bg-muted/30">

        {/* Toolbar */}
        <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0 shadow-sm z-10">

          {/* Viewport switcher */}
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1 border border-border/50">
            {(["desktop", "tablet", "mobile"] as Viewport[]).map(v => {
              const Icon = v === "desktop" ? Monitor : v === "tablet" ? Tablet : Smartphone;
              return (
                <Button
                  key={v}
                  variant={viewport === v ? "secondary" : "ghost"}
                  size="sm"
                  className={cn("h-8 px-2", viewport === v && "bg-background shadow-sm")}
                  onClick={() => setViewport(v)}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 h-8" onClick={() => refetch()}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reload
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline" size="sm"
                  className="gap-1.5 h-8"
                  disabled={!project?.generatedHtml}
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  onClick={() => triggerDownload(`/api/projects/${id}/export`)}
                  className="gap-2 cursor-pointer"
                >
                  <FileCode2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">HTML file</p>
                    <p className="text-xs text-muted-foreground">Single self-contained page</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => triggerDownload(`/api/projects/${id}/export/zip`)}
                  className="gap-2 cursor-pointer"
                >
                  <FolderArchive className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">ZIP package</p>
                    <p className="text-xs text-muted-foreground">+ .htaccess · robots.txt · sitemap</p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Iframe */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-4 lg:p-8 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px]">
          <div className={cn(
            "transition-all duration-500 ease-in-out bg-white border border-border rounded-lg shadow-2xl overflow-hidden relative flex flex-col",
            getViewportWidth(),
            viewport !== "desktop" ? "h-[800px] max-h-full" : "h-full",
          )}>
            {viewport !== "desktop" && (
              <div className="h-6 bg-muted/80 border-b border-border flex items-center justify-center shrink-0">
                <div className="w-12 h-1.5 bg-border rounded-full" />
              </div>
            )}
            {iframeUrl ? (
              <iframe
                src={iframeUrl}
                className="w-full h-full bg-white"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-top-navigation-by-user-activation"
                title="Editor Preview"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-card">
                <div className="animate-pulse flex flex-col items-center gap-2">
                  <Sparkles className="h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">Loading preview…</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
