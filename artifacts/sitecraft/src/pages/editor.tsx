import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useGetProject } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  RotateCcw, Download, FileCode2, FolderArchive, ChevronDown,
  Monitor, Tablet, Smartphone, Sparkles, Send, Zap,
  ExternalLink, Rocket, Loader2, Share2, Code, Moon, Sun,
  Check, Copy, Eye, Sliders, MessageSquare, FileText, ShieldCheck,
  BarChart3, AlertTriangle, CheckCircle2,
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

interface AuditIssue {
  category: string;
  severity: string;
  element: string;
  description: string;
  recommendation: string;
}

interface AuditData {
  scores: { visual: number; seo: number; accessibility: number; performance: number };
  issues: AuditIssue[];
  suggestions: string[];
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
  const [iframeKey, setIframeKey] = useState(0);
  const MAX_EDITS = 2;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Dialog states
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isSocialModalOpen, setIsSocialModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Critique & Audit panel
  const [rightTab, setRightTab] = useState<"chat" | "critique">("chat");
  const [auditData, setAuditData] = useState<AuditData | null>(null);
  const [isAuditLoading, setIsAuditLoading] = useState(false);

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

  // Fetch audit data when the Critique tab opens or project changes
  useEffect(() => {
    if (rightTab === "critique" && id && !auditData) {
      setIsAuditLoading(true);
      fetch(`/api/projects/${id}/audit`, { credentials: "include" })
        .then((r) => r.json())
        .then((data) => {
          setAuditData(data);
        })
        .catch(() => {
          // Silently fail; show empty state
        })
        .finally(() => setIsAuditLoading(false));
    }
  }, [rightTab, id, auditData]);

  const iframeUrl = project?.id
    ? `/api/projects/${project.id}/preview?t=${new Date(project.updatedAt).getTime()}&k=${iframeKey}`
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


  const pollJob = async (jobId: string): Promise<"completed" | "failed"> => {
    const MAX_POLLS = 60; // 3s * 60 = 3 minutes max
    let polls = 0;
    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        polls++;
        try {
          const res = await fetch(`/api/jobs/${jobId}`, { credentials: "include" });
          if (!res.ok) { clearInterval(interval); resolve("failed"); return; }
          const job = await res.json();
          // Show current step in chat as a progress message (only once per step change)
          if (job.currentStep) {
            setMessages((prev) => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg?.id === `step-${jobId}`) {
                return prev.map((m) =>
                  m.id === `step-${jobId}`
                    ? { ...m, text: `⏳ Running: ${job.currentStep} (${job.progress}%)…` }
                    : m
                );
              }
              return [
                ...prev,
                {
                  id: `step-${jobId}`,
                  sender: "ai" as const,
                  text: `⏳ Running: ${job.currentStep} (${job.progress}%)…`,
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                },
              ];
            });
          }

          if (job.status === "completed") {
            clearInterval(interval);
            resolve("completed");
          } else if (job.status === "failed") {
            clearInterval(interval);
            resolve("failed");
          } else if (polls >= MAX_POLLS) {
            clearInterval(interval);
            resolve("failed");
          }
        } catch {
          clearInterval(interval);
          resolve("failed");
        }
      }, 3000);
    });
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

      const job = await res.json();
      const jobId: string = job.id;

      // Add "thinking" message
      setMessages((prev) => [
        ...prev,
        {
          id: `thinking-${jobId}`,
          sender: "ai" as const,
          text: `🤖 AI agents are analysing your request and editing the page…`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);

      // Poll until the job finishes — this is the KEY fix
      const finalStatus = await pollJob(jobId);

      const newCount = editCount + 1;
      setEditCount(newCount);
      localStorage.setItem(`sc_edits_${id}`, String(newCount));

      if (finalStatus === "completed") {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== `step-${jobId}`),
          {
            id: (Date.now() + 1).toString(),
            sender: "ai" as const,
            text: `✅ Done! Applied your edit: "${messageText}". Preview is refreshing…`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        toast.success("Edit applied! Refreshing preview…");
        // Refetch project data to get updated HTML
        await refetch();
        setIframeKey((k) => k + 1);
      } else {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== `step-${jobId}`),
          {
            id: (Date.now() + 1).toString(),
            sender: "ai" as const,
            text: "❌ The edit timed out or failed. Try rephrasing your request with more specific detail.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        toast.error("Edit failed. Please try again with a more specific request.");
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai" as const,
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
              <DropdownMenuContent align="end" className="w-56">
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
                    <p className="text-xs text-muted-foreground">+ DESIGN.md · .htaccess · sitemap</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => triggerDownload(`/api/projects/${id}/export/design-contract`)}
                  className="gap-2 cursor-pointer"
                >
                  <FileText className="h-4 w-4 text-violet-500" />
                  <div>
                    <p className="font-medium text-sm text-violet-500">Brand Contract</p>
                    <p className="text-xs text-muted-foreground">DESIGN.md · colors, tone, UX plan</p>
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
                key={iframeKey}
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

      {/* ── Right panel: AI Chat + Critique tabs ── */}
      <div className="w-88 shrink-0 border-l border-border bg-card flex flex-col overflow-hidden">
        {/* Tab Header */}
        <div className="border-b border-border bg-card">
          <div className="flex">
            <button
              type="button"
              onClick={() => setRightTab("chat")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors border-b-2",
                rightTab === "chat"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare className="h-3.5 w-3.5" /> AI Chat
            </button>
            <button
              type="button"
              onClick={() => setRightTab("critique")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors border-b-2",
                rightTab === "critique"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Critique
            </button>
          </div>
          {rightTab === "chat" && (
            <div className="px-4 py-2 flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground">Direct your page edits in real-time</p>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-mono font-medium border",
                editsRemaining > 0 ? "bg-primary/10 text-primary border-primary/20" : "bg-destructive/10 text-destructive border-destructive/20"
              )}>
                {editCount}/{MAX_EDITS} edits
              </span>
            </div>
          )}
        </div>

        {/* ── Chat Tab ── */}
        {rightTab === "chat" && (
          <>
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
          </>
        )}

        {/* ── Critique & Audit Tab ── */}
        {rightTab === "critique" && (
          <div className="flex-1 overflow-y-auto">
            {isAuditLoading ? (
              <div className="flex items-center justify-center h-40 gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Loading design critique…</span>
              </div>
            ) : !auditData ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-center px-4">
                <ShieldCheck className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">No audit data yet. Generate or edit your site to get a full design critique.</p>
              </div>
            ) : (
              <>
                {/* Score cards */}
                <div className="p-3 border-b border-border/60 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" /> Quality Scores
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { key: "visual", label: "Visual", color: "text-violet-400" },
                      { key: "seo", label: "SEO", color: "text-emerald-400" },
                      { key: "accessibility", label: "A11y", color: "text-blue-400" },
                      { key: "performance", label: "Perf", color: "text-amber-400" },
                    ] as const).map(({ key, label, color }) => {
                      const score = Math.round(auditData.scores[key]);
                      return (
                        <div key={key} className="bg-muted/30 rounded-xl p-2.5 border border-border/50 flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">{label}</span>
                            <span className={cn("text-sm font-bold", color)}>{score}</span>
                          </div>
                          <div className="w-full h-1 rounded-full bg-border overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all",
                                score >= 85 ? "bg-emerald-500" : score >= 70 ? "bg-amber-500" : "bg-red-500"
                              )}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Issues */}
                {auditData.issues.length > 0 && (
                  <div className="p-3 border-b border-border/60 space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-amber-400" /> Issues ({auditData.issues.length})
                    </p>
                    <div className="space-y-2">
                      {auditData.issues.slice(0, 8).map((issue, i) => (
                        <div key={i} className="rounded-lg border border-border/50 bg-muted/20 p-2.5 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase",
                              issue.severity === "critical" || issue.severity === "high"
                                ? "bg-red-500/20 text-red-400"
                                : issue.severity === "serious" || issue.severity === "medium"
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-blue-500/20 text-blue-400"
                            )}>{issue.severity}</span>
                            <span className="text-[9px] text-muted-foreground capitalize">{issue.category}</span>
                          </div>
                          <p className="text-[11px] text-foreground/80 leading-snug">{issue.description}</p>
                          {issue.recommendation && (
                            <p className="text-[10px] text-primary/70 leading-snug">→ {issue.recommendation}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {auditData.suggestions.length > 0 && (
                  <div className="p-3 space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Suggestions ({auditData.suggestions.length})
                    </p>
                    <div className="space-y-1.5">
                      {auditData.suggestions.map((sug, i) => (
                        <div key={i} className="flex gap-2 items-start">
                          <span className="text-emerald-400 text-xs mt-0.5 shrink-0">✓</span>
                          <p className="text-[11px] text-foreground/70 leading-snug">{sug}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {auditData.issues.length === 0 && auditData.suggestions.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-32 gap-2 text-center px-4">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                    <p className="text-xs text-muted-foreground">No issues found — your site passed all design checks!</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Footer deploy CTA (always visible) */}
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
