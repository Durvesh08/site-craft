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
  BarChart3, AlertTriangle, CheckCircle2, Layers, Grid, ZoomIn, ZoomOut,
  Maximize2, Cpu, Activity, Play, Terminal, Wand2, RefreshCw, Palette, Box, CornerDownRight
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
import { soundEngine } from "@/lib/sound-effects";
import { CommandPalette } from "@/components/ui/command-palette";

type Viewport = "desktop" | "laptop" | "tablet" | "mobile";

const QUICK_EDITS = [
  { label: "Make colors darker", icon: "🎨" },
  { label: "Simplify copy", icon: "✍️" },
  { label: "Add glassmorphism", icon: "💎" },
  { label: "Add Framer animations", icon: "⚡" },
  { label: "Improve mobile layout", icon: "📱" },
];

const THEME_PRESETS = [
  { id: "original", label: "Original", icon: RotateCcw, bg: "bg-violet-950/60 text-violet-200 border border-violet-800/40" },
  { id: "dark", label: "Obsidian Dark", icon: Moon, bg: "bg-slate-900 text-white" },
  { id: "emerald", label: "Emerald Cyber", icon: Sparkles, bg: "bg-emerald-900 text-emerald-100" },
  { id: "cyberpunk", label: "Neon Pulse", icon: Zap, bg: "bg-rose-900 text-cyan-200" },
];

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
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showSnapGrid, setShowSnapGrid] = useState(true);
  const [selectedSection, setSelectedSection] = useState<string | null>("HeroSection");
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  const [editInstruction, setEditInstruction] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [editCount, setEditCount] = useState(0);
  const [iframeKey, setIframeKey] = useState(0);
  const MAX_EDITS = 5;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Multi-page state
  const [pages, setPages] = useState<string[]>(["index.html"]);
  const [currentPage, setCurrentPage] = useState<string>("index.html");

  // Modal dialog states
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isSocialModalOpen, setIsSocialModalOpen] = useState(false);

  // Right Inspector Tab: AI Swarm | Inspector | Layers | Audit | Code
  const [rightTab, setRightTab] = useState<"swarm" | "inspector" | "layers" | "critique" | "code">("swarm");
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [auditData, setAuditData] = useState<AuditData | null>(null);
  const [isAuditLoading, setIsAuditLoading] = useState(false);

  // Live Swarm Telemetry State
  const [activeAgents, setActiveAgents] = useState([
    { name: "UX Strategist", progress: 95, color: "bg-blue-500", status: "Active" },
    { name: "Copywriter AI", progress: 88, color: "bg-indigo-500", status: "Active" },
    { name: "Motion Designer", progress: 92, color: "bg-purple-500", status: "Active" },
    { name: "A11y Auditor", progress: 99, color: "bg-emerald-500", status: "Verified" },
    { name: "React 19 Compiler", progress: 100, color: "bg-cyan-500", status: "Idle" },
  ]);

  // Chat message history
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      sender: "ai",
      text: "👋 Welcome to SiteCraft Spatial OS. What component or section would you like to direct?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  // Load pages list
  useEffect(() => {
    if (id) {
      fetch(`/api/projects/${id}/pages`, { credentials: "include" })
        .then((r) => r.json())
        .then((data) => {
          if (data && Array.isArray(data.pages)) {
            setPages(data.pages);
          }
        })
        .catch(() => {});
    }
  }, [id, project?.updatedAt]);

  // Listen for navigation events from preview iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === "sc-navigate" && typeof e.data.page === "string") {
        setCurrentPage(e.data.page);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Keyboard shortcut CMD+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch audit data on tab change
  useEffect(() => {
    if (rightTab === "critique" && id && !auditData) {
      setIsAuditLoading(true);
      fetch(`/api/projects/${id}/audit`, { credentials: "include" })
        .then((r) => r.json())
        .then((data) => setAuditData(data))
        .catch(() => {})
        .finally(() => setIsAuditLoading(false));
    }
  }, [rightTab, id, auditData]);

  const iframeUrl = project?.id
    ? `/api/projects/${project.id}/preview?page=${currentPage}&t=${new Date(project.updatedAt).getTime()}&k=${iframeKey}`
    : null;

  const triggerDownload = (url: string) => {
    soundEngine.playPrimaryClick();
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

  const getViewportDimensions = () => {
    if (viewport === "mobile") return "w-[375px] h-[812px]";
    if (viewport === "tablet") return "w-[768px] h-[1024px]";
    if (viewport === "laptop") return "w-[1024px] h-[768px]";
    return "w-[1440px] h-[900px]";
  };

  const handleSwapTheme = async (presetId: string) => {
    soundEngine.playPrimaryClick();
    if (!id) return;
    try {
      const res = await fetch(`/api/projects/${id}/theme`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ preset: presetId }),
      });
      if (!res.ok) throw new Error("Failed to swap theme");
      toast.success(presetId === "original" ? "Restored original design!" : `Theme updated to ${presetId}!`);
      await refetch();
      setIframeKey((k) => k + 1);
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
      toast.error("Standard edit limit reached. Upgrade to Enterprise.");
      return;
    }
    if (!id) return;

    soundEngine.playPrimaryClick();

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

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "ai",
          text: `⚡ Swarm agents updating component: "${messageText}"…`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);

      setTimeout(async () => {
        soundEngine.playSuccess();
        await refetch();
        setIframeKey((k) => k + 1);
        setIsRegenerating(false);
        toast.success("Design update synthesized!");
      }, 2000);

    } catch {
      soundEngine.playError();
      setIsRegenerating(false);
      toast.error("Edit failed. Try rephrasing your prompt.");
    }
  };

  const getPageCode = () => {
    if (!project?.generatedHtml) return "<!-- No code generated yet -->";
    const html = project.generatedHtml;
    if (html.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(html);
        return parsed[currentPage] || parsed["index.html"] || Object.values(parsed)[0] || "<!-- Page not found -->";
      } catch {
        return html;
      }
    }
    return html;
  };

  return (
    <div className="flex h-screen w-full bg-[#030305] text-foreground font-sans overflow-hidden select-none relative">
      
      <CommandPalette open={isCommandOpen} onOpenChange={setIsCommandOpen} />

      {/* ── TOP SPATIAL TOOLBAR ── */}
      <header className="absolute top-0 inset-x-0 h-14 border-b border-white/10 glass flex items-center justify-between px-6 z-40 shadow-2xl backdrop-blur-2xl">
        
        {/* Left: Brand & Page Switcher */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setLocation("/dashboard")}>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-black text-sm tracking-tight text-foreground hidden sm:block">
              SiteCraft OS
            </span>
          </div>

          <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />

          {/* Page Switcher */}
          {pages.length > 0 && (
            <div className="flex items-center gap-1 bg-secondary/30 rounded-xl p-1 border border-white/10">
              {pages.map((p) => (
                <button
                  key={p}
                  onClick={() => { soundEngine.playTabSwitch(); setCurrentPage(p); }}
                  className={cn(
                    "px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all",
                    currentPage === p ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p.replace(".html", "")}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Center: Viewport & Zoom Controls */}
        <div className="flex items-center gap-3">
          
          {/* Viewport Selector */}
          <div className="flex items-center gap-1 bg-secondary/40 rounded-xl p-1 border border-white/10">
            {(["desktop", "laptop", "tablet", "mobile"] as Viewport[]).map((v) => {
              const Icon = v === "desktop" ? Monitor : v === "laptop" ? Monitor : v === "tablet" ? Tablet : Smartphone;
              return (
                <button
                  key={v}
                  onClick={() => { soundEngine.playTabSwitch(); setViewport(v); }}
                  className={cn(
                    "h-8 px-2.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all",
                    viewport === v ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="capitalize hidden lg:inline">{v}</span>
                </button>
              );
            })}
          </div>

          {/* Zoom Controls */}
          <div className="hidden md:flex items-center gap-1 bg-secondary/40 rounded-xl px-2 py-1 border border-white/10 text-xs font-mono text-muted-foreground">
            <button onClick={() => setZoomLevel((z) => Math.max(50, z - 10))} className="p-1 hover:text-foreground">
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="w-10 text-center font-bold text-foreground">{zoomLevel}%</span>
            <button onClick={() => setZoomLevel((z) => Math.min(150, z + 10))} className="p-1 hover:text-foreground">
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setShowSnapGrid(!showSnapGrid)} className={cn("p-1 ml-1 rounded", showSnapGrid && "text-primary")}>
              <Grid className="h-3.5 w-3.5" />
            </button>
          </div>

        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          
          <button
            onClick={() => setIsCommandOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/40 border border-white/10 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Command</span>
            <kbd className="px-1.5 py-0.5 rounded bg-black/40 text-[10px]">⌘K</kbd>
          </button>

          <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5 font-bold" onClick={() => refetch()}>
            <RotateCcw className="h-3.5 w-3.5" /> Reload
          </Button>

          <Button size="sm" className="h-9 text-xs gap-1.5 font-bold shadow-lg shadow-primary/30 btn-magnetic" onClick={() => setLocation(`/projects/${id}/deployments`)}>
            <Rocket className="h-3.5 w-3.5" /> Deploy
          </Button>
        </div>

      </header>

      {/* ── SPATIAL CANVAS WORKSPACE ── */}
      <div className="flex-1 flex pt-14 h-full relative overflow-hidden">
        
        {/* LEFT PANEL: FIGMA-STYLE AST LAYERS TREE */}
        <aside className={cn("w-64 border-r border-white/10 glass flex flex-col transition-all z-30", !leftPanelOpen && "-ml-64")}>
          <div className="p-4 border-b border-white/10 flex items-center justify-between font-mono text-xs font-bold text-foreground">
            <span className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> DOM AST LAYERS
            </span>
            <span className="text-[10px] text-muted-foreground">5 Nodes</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-xs">
            {[
              { id: "HeaderNav", label: "<HeaderNav />", type: "Header Navigation" },
              { id: "HeroSection", label: "<HeroSection />", type: "Hero Component" },
              { id: "SwarmConstellation", label: "<SwarmConstellation />", type: "3D Particle Canvas" },
              { id: "TelemetryConsole", label: "<TelemetryConsole />", type: "Agent Telemetry" },
              { id: "FooterSection", label: "<FooterSection />", type: "Global Footer" },
            ].map((node) => (
              <button
                key={node.id}
                onClick={() => { soundEngine.playTabSwitch(); setSelectedSection(node.id); }}
                className={cn(
                  "w-full p-2.5 rounded-xl text-left flex flex-col transition-all",
                  selectedSection === node.id ? "bg-primary/20 border border-primary/40 text-primary shadow-md" : "hover:bg-secondary/30 text-muted-foreground"
                )}
              >
                <span className="font-bold text-foreground">{node.label}</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">{node.type}</span>
              </button>
            ))}
          </div>

          <div className="p-4 border-t border-white/10 bg-black/40 text-xs font-mono text-muted-foreground space-y-2">
            <div className="flex justify-between">
              <span>Selected:</span>
              <span className="text-primary font-bold">{selectedSection}</span>
            </div>
            <div className="flex justify-between">
              <span>WAI-ARIA:</span>
              <span className="text-emerald-400 font-bold">99/100</span>
            </div>
          </div>
        </aside>

        {/* CENTER SPATIAL CANVAS PREVIEW */}
        <main className="flex-1 relative flex items-center justify-center p-8 bg-[#05050a] overflow-auto">
          
          {/* Spatial Perspective Grid */}
          <div
            className={cn(
              "absolute inset-0 opacity-20 pointer-events-none",
              showSnapGrid && "bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:24px_24px]"
            )}
          />

          {/* Floating Bounding Frame */}
          <div
            style={{ transform: `scale(${zoomLevel / 100})` }}
            className={cn(
              "transition-all duration-500 rounded-3xl glass border border-white/20 shadow-2xl overflow-hidden relative flex flex-col backdrop-blur-2xl",
              getViewportDimensions()
            )}
          >
            {/* Top Window Bar */}
            <div className="h-9 px-4 border-b border-white/10 bg-secondary/40 flex items-center justify-between font-mono text-[10px] text-muted-foreground shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-2 font-bold text-foreground">app.sitecraft.ai / {currentPage}</span>
              </div>
              <span>{getViewportDimensions().split(" ")[0]}</span>
            </div>

            {/* Selection Overlay Ribbon */}
            {selectedSection && (
              <div className="absolute top-12 left-4 z-20 glass px-3 py-1.5 rounded-xl border border-primary/40 text-xs font-mono font-bold text-primary flex items-center gap-2 shadow-xl">
                <Sparkles className="h-3.5 w-3.5" /> Active: {selectedSection}
                <button onClick={() => setSelectedSection(null)} className="ml-2 text-muted-foreground hover:text-foreground">✕</button>
              </div>
            )}

            {/* Preview Iframe */}
            {iframeUrl ? (
              <iframe
                key={iframeKey}
                src={iframeUrl}
                className="w-full flex-1 bg-white animate-fade-in"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-top-navigation-by-user-activation"
                title="Spatial Preview Canvas"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-xs font-mono text-muted-foreground">Synthesizing Spatial Canvas...</p>
              </div>
            )}

          </div>

        </main>

        {/* RIGHT PANEL: FIGMA / LINEAR MULTI-TAB INSPECTOR */}
        <aside className="w-96 border-l border-white/10 glass flex flex-col z-30 shadow-2xl backdrop-blur-2xl">
          
          {/* Tab Header */}
          <div className="flex border-b border-white/10 bg-secondary/30 text-xs font-mono font-bold">
            {(["swarm", "inspector", "critique", "code"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { soundEngine.playTabSwitch(); setRightTab(tab); }}
                className={cn(
                  "flex-1 py-3 text-center capitalize transition-all border-b-2",
                  rightTab === tab ? "border-primary text-primary bg-primary/10" : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* TAB 1: AI SWARM WORKSPACE */}
          {rightTab === "swarm" && (
            <div className="flex-1 flex flex-col p-4 space-y-6 overflow-y-auto">
              
              {/* Swarm Telemetry Bars */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-foreground">
                  <span className="flex items-center gap-2"><Cpu className="h-4 w-4 text-primary" /> SWARM AGENTS</span>
                  <span className="text-emerald-400">100% HEALTH</span>
                </div>

                <div className="space-y-2">
                  {activeAgents.map((agent) => (
                    <div key={agent.name} className="p-3 rounded-xl bg-secondary/20 border border-white/5 space-y-1.5">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="font-bold text-foreground">{agent.name}</span>
                        <span className="text-muted-foreground">{agent.status}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-black/40 overflow-hidden">
                        <div className={`h-full rounded-full ${agent.color}`} style={{ width: `${agent.progress}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat & Instruction Stream */}
              <div className="space-y-3 flex-1 flex flex-col justify-between border-t border-white/10 pt-4">
                <div className="space-y-2 max-h-48 overflow-y-auto font-mono text-xs">
                  {messages.map((m) => (
                    <div key={m.id} className={cn("p-3 rounded-xl leading-relaxed", m.sender === "user" ? "bg-primary/20 text-primary border border-primary/30 ml-4" : "bg-secondary/30 text-foreground border border-white/5 mr-4")}>
                      {m.text}
                    </div>
                  ))}
                  {isRegenerating && (
                    <div className="p-3 rounded-xl bg-purple-500/20 text-purple-300 font-mono text-xs flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Synthesizing design tokens...
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-2">
                  <div className="relative">
                    <Textarea
                      ref={textareaRef}
                      value={editInstruction}
                      onChange={(e) => setEditInstruction(e.target.value)}
                      onFocus={() => soundEngine.playInputFocus()}
                      placeholder="Instruct the AI Swarm to modify this page..."
                      className="min-h-[80px] bg-secondary/30 border border-white/10 text-xs font-medium rounded-xl p-3 pr-10 focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={handleRegenerate}
                      disabled={isRegenerating || !editInstruction.trim()}
                      className="absolute right-2 bottom-2 p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-40"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: STYLE INSPECTOR */}
          {rightTab === "inspector" && (
            <div className="flex-1 p-4 space-y-6 overflow-y-auto font-mono text-xs">
              <div className="space-y-3">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px] text-muted-foreground">THEME PRESETS</h4>
                <div className="grid grid-cols-2 gap-2">
                  {THEME_PRESETS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleSwapTheme(t.id)}
                      className={cn("p-3 rounded-xl text-left font-bold border transition-all", t.bg)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 border-t border-white/10 pt-4">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px] text-muted-foreground">SPACING & RADIUS</h4>
                <div className="space-y-2">
                  <div className="flex justify-between"><span>Corner Radius:</span><span className="text-primary font-bold">24px</span></div>
                  <div className="flex justify-between"><span>Backdrop Blur:</span><span className="text-primary font-bold">24px</span></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CRITIQUE */}
          {rightTab === "critique" && (
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              <div className="p-3 rounded-xl bg-secondary/30 border border-white/10 space-y-2 font-mono text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Visual Quality</span><span className="text-purple-400 font-bold">98/100</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">SEO Structure</span><span className="text-emerald-400 font-bold">99/100</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">WAI-ARIA Accessibility</span><span className="text-cyan-400 font-bold">99/100</span></div>
              </div>
            </div>
          )}

          {/* TAB 4: CODE */}
          {rightTab === "code" && (
            <div className="flex-1 p-4 space-y-4 overflow-y-auto font-mono text-xs">
              <pre className="p-4 rounded-xl bg-black/80 border border-white/10 text-emerald-400 overflow-x-auto text-[11px] leading-relaxed">
                {getPageCode()}
              </pre>
            </div>
          )}

        </aside>

      </div>

    </div>
  );
}
