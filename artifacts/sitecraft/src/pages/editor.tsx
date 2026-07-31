import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useGetProject } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  RotateCcw, Download, FileCode2, FolderArchive, ChevronDown,
  Monitor, Tablet, Smartphone, Sparkles, Send, Zap,
  ExternalLink, Rocket, Loader2,
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

const QUICK_EDITS = [
  { label: "Make colors darker", icon: "🎨" },
  { label: "Simplify the copy", icon: "✍️" },
  { label: "Add a testimonials section", icon: "💬" },
  { label: "Make it more modern", icon: "⚡" },
  { label: "Improve mobile layout", icon: "📱" },
  { label: "Make the hero bolder", icon: "🔥" },
];

export default function ProjectEditor() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: project, refetch } = useGetProject(id ?? "", {
    query: { enabled: !!id, queryKey: [] as unknown[] },
  });

  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [editInstruction, setEditInstruction] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [editCount, setEditCount] = useState(0);
  const MAX_EDITS = 2;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load edit count from localStorage per project
  useEffect(() => {
    if (id) {
      const saved = localStorage.getItem(`sc_edits_${id}`);
      setEditCount(saved ? parseInt(saved, 10) : 0);
    }
  }, [id]);

  const iframeUrl = project?.id
    ? `/api/projects/${project.id}/preview?t=${new Date(project.updatedAt).getTime()}`
    : null;

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

  const applyQuickEdit = (label: string) => {
    setEditInstruction(label);
    textareaRef.current?.focus();
  };

  const handleRegenerate = async () => {
    if (!editInstruction.trim()) {
      toast.error("Tell the AI what to change first.");
      return;
    }
    if (editCount >= MAX_EDITS) {
      toast.error("You've used all 2 edits for this project. Upgrade to get more edits.");
      return;
    }
    if (!id) return;

    setIsRegenerating(true);
    try {
      const res = await fetch(`/api/projects/${id}/sections/regenerate-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ instruction: editInstruction }),
      });

      if (!res.ok) {
        // Fallback: try the chat/edit endpoint
        const res2 = await fetch(`/api/projects/${id}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ message: editInstruction }),
        });
        if (!res2.ok) throw new Error("Edit failed");
      }

      const newCount = editCount + 1;
      setEditCount(newCount);
      localStorage.setItem(`sc_edits_${id}`, String(newCount));
      setEditInstruction("");
      toast.success("Edit applied! Refreshing preview…");
      setTimeout(() => refetch(), 2000);
    } catch {
      toast.error("Edit failed. Please try again.");
    } finally {
      setIsRegenerating(false);
    }
  };

  const editsRemaining = MAX_EDITS - editCount;

  return (
    <div className="flex h-[calc(100vh-64px)] md:h-screen w-full bg-background overflow-hidden">

      {/* ── Preview canvas ── */}
      <div className="flex-1 flex flex-col relative bg-muted/30 min-w-0">
        {/* Toolbar */}
        <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
          {/* Viewport switcher */}
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1 border border-border/50">
            {(["desktop", "tablet", "mobile"] as Viewport[]).map((v) => {
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
              <RotateCcw className="h-3.5 w-3.5" /> Reload
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-8"
              onClick={() => setLocation(`/projects/${id}/deployments`)}
            >
              <Rocket className="h-3.5 w-3.5" /> Deploy
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-8" disabled={!project?.generatedHtml}>
                  <Download className="h-3.5 w-3.5" /> Export <ChevronDown className="h-3 w-3 opacity-60" />
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

            <Button variant="ghost" size="sm" className="gap-1 h-8 text-xs" disabled={!iframeUrl} asChild>
              <a href={iframeUrl || "#"} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>

        {/* Iframe */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-4 lg:p-8 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px]">
          <div
            className={cn(
              "transition-all duration-500 ease-in-out bg-white border border-border rounded-lg shadow-2xl overflow-hidden relative flex flex-col",
              getViewportWidth(),
              viewport !== "desktop" ? "h-[800px] max-h-full" : "h-full",
            )}
          >
            {viewport !== "desktop" && (
              <div className="h-6 bg-muted/80 border-b border-border flex items-center justify-center shrink-0">
                <div className="w-12 h-1.5 bg-border rounded-full" />
              </div>
            )}
            {iframeUrl ? (
              <iframe
                src={iframeUrl}
                className="w-full h-full bg-white animate-fade-in"
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

      {/* ── Right panel: AI Edit ── */}
      <div className="w-80 shrink-0 border-l border-border bg-card flex flex-col overflow-hidden">
        {/* Panel header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold text-sm">AI Editor</h3>
          </div>
          <p className="text-xs text-muted-foreground">Type a change or pick a quick action below</p>
        </div>

        {/* Edit counter */}
        <div className={cn(
          "mx-4 mt-4 px-3 py-2 rounded-lg text-xs flex items-center justify-between",
          editsRemaining === 0
            ? "bg-destructive/10 text-destructive border border-destructive/20"
            : editsRemaining === 1
              ? "bg-orange-500/10 text-orange-500 border border-orange-500/20"
              : "bg-primary/10 text-primary border border-primary/20",
        )}>
          <span className="font-medium">
            {editsRemaining > 0 ? `${editsRemaining} edit${editsRemaining === 1 ? "" : "s"} remaining` : "No edits remaining"}
          </span>
          <span className="font-mono">{editCount}/{MAX_EDITS}</span>
        </div>

        {/* Quick actions */}
        <div className="p-4 border-b border-border space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Zap className="h-3 w-3" /> Quick edits
          </p>
          <div className="flex flex-col gap-1.5">
            {QUICK_EDITS.map((qe) => (
              <button
                key={qe.label}
                type="button"
                onClick={() => applyQuickEdit(qe.label)}
                disabled={editsRemaining === 0 || isRegenerating}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-all duration-150 border",
                  "border-border bg-muted/20 hover:bg-primary/5 hover:border-primary/30 hover:text-foreground",
                  "disabled:opacity-40 disabled:cursor-not-allowed",
                )}
              >
                <span>{qe.icon}</span>
                <span>{qe.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom instruction */}
        <div className="flex-1 p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Custom instruction
          </p>
          <Textarea
            ref={textareaRef}
            placeholder="e.g. Make the hero section full-screen, use a gradient background, and add a floating nav"
            value={editInstruction}
            onChange={(e) => setEditInstruction(e.target.value)}
            disabled={editsRemaining === 0 || isRegenerating}
            className="flex-1 min-h-[120px] text-sm resize-none bg-background/50"
          />
          <Button
            onClick={handleRegenerate}
            disabled={!editInstruction.trim() || editsRemaining === 0 || isRegenerating}
            className="w-full gap-2"
            size="sm"
          >
            {isRegenerating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Applying edit…</>
            ) : (
              <><Send className="h-4 w-4" /> Apply Edit</>
            )}
          </Button>

          {editsRemaining === 0 && (
            <p className="text-xs text-muted-foreground text-center">
              You've used all edits. Contact support to get more.
            </p>
          )}
        </div>

        {/* Deploy button */}
        <div className="p-4 border-t border-border">
          <Button
            className="w-full gap-2"
            variant="default"
            onClick={() => setLocation(`/projects/${id}/deployments`)}
          >
            <Rocket className="h-4 w-4" />
            Deploy Site
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            FTP · Netlify · GitHub Pages
          </p>
        </div>
      </div>
    </div>
  );
}
