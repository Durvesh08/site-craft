import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useGetProject } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  RotateCcw, Download, FileCode2, FolderArchive, ChevronDown,
  Monitor, Tablet, Smartphone, Sparkles, Send, Zap,
  ExternalLink, Rocket, Loader2, Share2, Code, Moon, Sun,
  Check, Copy, Eye, Sliders, MessageSquare,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const THEME_PRESETS = [
  { id: "dark", label: "Dark Mode", icon: Moon, bg: "bg-slate-900 text-white" },
  { id: "light", label: "Light Mode", icon: Sun, bg: "bg-slate-100 text-slate-900 border" },
  { id: "emerald", label: "Emerald Luxury", icon: Sparkles, bg: "bg-emerald-900 text-emerald-100" },
  { id: "cyberpunk", label: "Cyberpunk Neon", icon: Zap, bg: "bg-rose-900 text-cyan-200" },
  { id: "ocean", label: "Ocean Blue", icon: Monitor, bg: "bg-sky-900 text-sky-100" },
  { id: "sunset", label: "Sunset Orange", icon: FlameIcon, bg: "bg-orange-900 text-amber-100" },
];

function FlameIcon(props: any) {
  return <span {...props}>🔥</span>;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

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
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Dialog states
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isSocialModalOpen, setIsSocialModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Chat message history
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      sender: "ai",
      text: "👋 Hi! I'm your AI Design Assistant. What would you like to edit on this landing page?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  // Load edit count from localStorage per project
  useEffect(() => {
    if (id) {
      const saved = localStorage.getItem(`sc_edits_${id}`);
      setEditCount(saved ? parseInt(saved, 10) : 0);
    }
  }, [id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isRegenerating]);

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

  // Instant Theme Swapper (0-second CSS swap, 0 edits used)
  const handleSwapTheme = async (presetId: string) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/projects/${id}/theme`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ preset: presetId }),
      });
      if (!res.ok) throw new Error("Failed to swap theme");
      toast.success(`Theme updated to ${presetId}!`);
      refetch();
    } catch {
      toast.error("Failed to change theme.");
    }
  };

  const handleRegenerate = async () => {
    const messageText = editInstruction.trim();
    if (!messageText) {
      toast.error("Tell the AI what to change first.");
      return;
    }
    if (editCount >= MAX_EDITS) {
      toast.error("You've used all 2 edits for this project. Upgrade to get more edits.");
      return;
    }
    if (!id) return;

    // Add user message to feed
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setEditInstruction("");
    setIsRegenerating(true);

    try {
      const res = await fetch(`/api/projects/${id}/chat-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: messageText }),
      });

      if (!res.ok) throw new Error("Edit request failed");

      const newCount = editCount + 1;
      setEditCount(newCount);
      localStorage.setItem(`sc_edits_${id}`, String(newCount));

      // Add AI success response
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: `✅ Applied your edit: "${messageText}". Updating preview…`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      toast.success("Edit applied!");
      setTimeout(() => refetch(), 2000);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: "❌ Edit failed to apply. Please try describing your request with more detail.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      toast.error("Edit failed. Please try again.");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopyCode = () => {
    if (!project?.generatedHtml) return;
    navigator.clipboard.writeText(project.generatedHtml);
    setCopiedCode(true);
    toast.success("HTML copied to clipboard!");
    setTimeout(() => setCopiedCode(false), 2000);
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
              onClick={() => setIsCodeModalOpen(true)}
            >
              <Code className="h-3.5 w-3.5" /> Code
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-8"
              onClick={() => setIsSocialModalOpen(true)}
            >
              <Share2 className="h-3.5 w-3.5" /> Social Preview
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

      {/* ── Right panel: AI Chat Agent Feed ── */}
      <div className="w-88 shrink-0 border-l border-border bg-card flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">AI Agent Editor</h3>
              <p className="text-[10px] text-muted-foreground">Direct your page edits in real-time</p>
            </div>
          </div>

          <span className={cn(
            "text-[10px] px-2 py-0.5 rounded-full font-mono font-medium border",
            editsRemaining > 0 ? "bg-primary/10 text-primary border-primary/20" : "bg-destructive/10 text-destructive border-destructive/20"
          )}>
            {editCount}/{MAX_EDITS} edits
          </span>
        </div>

        {/* Instant Palette Swapper */}
        <div className="p-3 border-b border-border/60 bg-muted/20 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Sliders className="h-3 w-3" /> Instant Theme Swapper (0 edits used)
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {THEME_PRESETS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSwapTheme(t.id)}
                className={cn(
                  "px-2 py-1.5 rounded-md text-[11px] font-medium flex items-center gap-1 truncate transition-transform hover:scale-105",
                  t.bg,
                )}
                title={`Swap to ${t.label}`}
              >
                <t.icon className="h-3 w-3 shrink-0" />
                <span className="truncate">{t.label.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat message feed */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-muted/10">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex flex-col max-w-[90%] rounded-xl p-3 text-xs leading-relaxed",
                m.sender === "user"
                  ? "ml-auto bg-primary text-primary-foreground rounded-br-none shadow-sm"
                  : "mr-auto bg-muted/60 text-foreground border border-border/50 rounded-bl-none",
              )}
            >
              <p>{m.text}</p>
              <span className="text-[9px] opacity-60 mt-1 self-end">{m.timestamp}</span>
            </div>
          ))}
          {isRegenerating && (
            <div className="mr-auto bg-muted/60 text-foreground border border-border/50 rounded-xl rounded-bl-none p-3 text-xs flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>Agents updating page code…</span>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Quick action chips */}
        <div className="p-2 border-t border-border bg-card flex gap-1.5 overflow-x-auto scrollbar-none">
          {QUICK_EDITS.map((qe) => (
            <button
              key={qe.label}
              type="button"
              onClick={() => applyQuickEdit(qe.label)}
              disabled={editsRemaining === 0 || isRegenerating}
              className="px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap bg-muted/40 hover:bg-primary/10 hover:text-primary border border-border/50 transition-colors shrink-0 disabled:opacity-40"
            >
              {qe.icon} {qe.label}
            </button>
          ))}
        </div>

        {/* Input box */}
        <div className="p-3 border-t border-border bg-card space-y-2">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              placeholder="Tell the AI what to change..."
              value={editInstruction}
              onChange={(e) => setEditInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleRegenerate();
                }
              }}
              disabled={editsRemaining === 0 || isRegenerating}
              className="min-h-[70px] text-xs resize-none pr-10 bg-background/50"
            />
            <Button
              size="icon"
              className="absolute right-2 bottom-2 h-7 w-7 rounded-lg"
              onClick={handleRegenerate}
              disabled={!editInstruction.trim() || editsRemaining === 0 || isRegenerating}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Footer deploy CTA */}
        <div className="p-3 border-t border-border bg-muted/30">
          <Button
            className="w-full gap-2 h-9 text-xs"
            onClick={() => setLocation(`/projects/${id}/deployments`)}
          >
            <Rocket className="h-3.5 w-3.5" />
            Deploy (FTP · Netlify · GitHub)
          </Button>
        </div>
      </div>

      {/* ── CODE INSPECTOR MODAL ── */}
      <Dialog open={isCodeModalOpen} onOpenChange={setIsCodeModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                Raw HTML / CSS Code
              </span>
              <Button size="sm" variant="outline" className="gap-2" onClick={handleCopyCode}>
                {copiedCode ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                {copiedCode ? "Copied" : "Copy Code"}
              </Button>
            </DialogTitle>
            <DialogDescription>
              Exportable single-file HTML bundle. Can be hosted anywhere.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto rounded-lg border border-border bg-[#0d1117] p-4 text-xs font-mono text-slate-200">
            <pre className="whitespace-pre-wrap break-all">
              {project?.generatedHtml || "<!-- No code generated yet -->"}
            </pre>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── SOCIAL SHARE PREVIEW MODAL ── */}
      <Dialog open={isSocialModalOpen} onOpenChange={setIsSocialModalOpen}>
        <DialogContent className="sm:max-w-[550px] bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              Social Share / OpenGraph Card Preview
            </DialogTitle>
            <DialogDescription>
              How your website link will appear when shared on WhatsApp, LinkedIn, or Twitter.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* WhatsApp Card */}
            <div className="rounded-xl border border-border bg-emerald-950/20 p-4 space-y-2">
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                💬 WhatsApp / iMessage Preview
              </p>
              <div className="rounded-lg border border-emerald-500/20 bg-background/80 p-3 space-y-1 shadow-sm">
                <p className="font-semibold text-sm text-foreground">{project?.name || "My Landing Page"}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {project?.businessDescription || "Check out our landing page."}
                </p>
                <p className="text-[10px] text-emerald-500 font-mono">
                  {project?.liveUrl || `https://${(project?.name || "site").toLowerCase().replace(/\s+/g, "-")}.sitecraft.app`}
                </p>
              </div>
            </div>

            {/* LinkedIn / Twitter Card */}
            <div className="rounded-xl border border-border bg-blue-950/20 p-4 space-y-2">
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                🌐 LinkedIn / X (Twitter) Card
              </p>
              <div className="rounded-lg border border-blue-500/20 bg-background/80 overflow-hidden shadow-sm">
                <div className="h-32 bg-gradient-to-br from-primary/30 to-blue-600/20 flex items-center justify-center border-b border-border">
                  <Sparkles className="h-8 w-8 text-primary opacity-60" />
                </div>
                <div className="p-3 space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-mono">
                    {project?.liveUrl?.replace(/^https?:\/\//, "") || "yoursite.com"}
                  </p>
                  <p className="font-semibold text-sm">{project?.name || "My Landing Page"}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {project?.businessDescription || "Official landing page built with SiteCraft AI."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
