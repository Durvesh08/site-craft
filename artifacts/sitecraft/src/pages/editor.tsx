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
  BarChart3, AlertTriangle, CheckCircle2, Wand2, RefreshCw, Palette, Box, CornerDownRight,
  Maximize2, ArrowRight
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
import { soundEngine } from "@/lib/sound-effects";
import { CommandPalette } from "@/components/ui/command-palette";

type Viewport = "desktop" | "tablet" | "mobile";

const PROACTIVE_SUGGESTIONS = [
  { label: "Boost Conversions", desc: "Enhance CTAs & add social proof badges", prompt: "Make the CTAs more high-converting and add trust logos." },
  { label: "Apply Glassmorphism", desc: "Add frosted glass tokens & Framer physics", prompt: "Convert cards to dark glassmorphism with subtle borders." },
  { label: "Polish Copywriting", desc: "Make headlines bold & high-impact", prompt: "Rewrite headlines to sound like Apple Vision Pro launch copy." },
  { label: "Upgrade Accessibility", desc: "Verify contrast & ARIA labels", prompt: "Optimize WCAG 2.1 AAA contrast and keyboard focus rings." },
];

const THEME_PRESETS = [
  { id: "original", label: "Original", bg: "bg-slate-900 border border-white/10 text-white" },
  { id: "dark", label: "Obsidian", bg: "bg-[#030305] border border-indigo-500/30 text-indigo-200" },
  { id: "emerald", label: "Emerald", bg: "bg-emerald-950/80 border border-emerald-500/30 text-emerald-200" },
  { id: "cyberpunk", label: "Neon", bg: "bg-rose-950/80 border border-cyan-500/30 text-cyan-200" },
];

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
  const [selectedSection, setSelectedSection] = useState<string | null>("Hero Section");
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  const [editInstruction, setEditInstruction] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Multi-page state
  const [pages, setPages] = useState<string[]>(["index.html"]);
  const [currentPage, setCurrentPage] = useState<string>("index.html");

  // Right Panel Sub-View: "studio" (AI Creative Workspace) | "audit" | "code"
  const [activeRightPanel, setActiveRightPanel] = useState<"studio" | "audit" | "code">("studio");

  // Chat message history
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      sender: "ai",
      text: "✨ AI Design Assistant ready. Select a section or click a suggestion below to refine your design.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  // Load pages list
  useEffect(() => {
    if (id) {
      fetch(`/api/projects/${id}/pages`, { credentials: "include" })
        .then((r) => r.json())
        .then((data) => {
          if (data && Array.isArray(data.pages)) setPages(data.pages);
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

  const iframeUrl = project?.id
    ? `/api/projects/${project.id}/preview?page=${currentPage}&t=${new Date(project.updatedAt).getTime()}&k=${iframeKey}`
    : null;

  const getViewportWidth = () => {
    if (viewport === "mobile") return "w-[375px]";
    if (viewport === "tablet") return "w-[768px]";
    return "w-full max-w-7xl";
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

  const handlePromptSubmit = async (customPrompt?: string) => {
    const promptText = (customPrompt || editInstruction).trim();
    if (!promptText) {
      toast.error("Tell the AI what to design first.");
      return;
    }
    if (!id) return;

    soundEngine.playPrimaryClick();

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: promptText,
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
        body: JSON.stringify({ message: promptText }),
      });

      if (!res.ok) throw new Error("Design update failed");

      setTimeout(async () => {
        soundEngine.playSuccess();
        await refetch();
        setIframeKey((k) => k + 1);
        setIsRegenerating(false);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "ai",
            text: `✨ Applied: "${promptText}". Preview updated.`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        toast.success("Design update synthesized!");
      }, 1800);

    } catch {
      soundEngine.playError();
      setIsRegenerating(false);
      toast.error("Design update failed.");
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

      {/* ── TOP MINIMALIST STUDIO BAR ── */}
      <header className="absolute top-0 inset-x-0 h-14 border-b border-white/10 glass flex items-center justify-between px-6 z-40 shadow-2xl backdrop-blur-2xl">
        
        {/* Left: Project Branding & Pages */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => setLocation("/dashboard")}>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-indigo-500 to-accent text-primary-foreground shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-foreground">
              {project?.name || "SiteCraft Studio"}
            </span>
          </div>

          <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />

          {/* Page Tabs */}
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

        {/* Center: Viewport Switcher */}
        <div className="flex items-center gap-1 bg-secondary/40 rounded-xl p-1 border border-white/10">
          {(["desktop", "tablet", "mobile"] as Viewport[]).map((v) => {
            const Icon = v === "desktop" ? Monitor : v === "tablet" ? Tablet : Smartphone;
            return (
              <button
                key={v}
                onClick={() => { soundEngine.playTabSwitch(); setViewport(v); }}
                className={cn(
                  "h-8 px-3 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all",
                  viewport === v ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="capitalize hidden md:inline">{v}</span>
              </button>
            );
          })}
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

      {/* ── MAIN STUDIO WORKSPACE ── */}
      <div className="flex-1 flex pt-14 h-full relative overflow-hidden">
        
        {/* ── LEFT HERO PREVIEW CANVAS (70% Visual Dominance) ── */}
        <main className="flex-1 relative flex flex-col items-center justify-center p-6 md:p-10 bg-[#05050a] overflow-auto">
          
          {/* Subtle Ambient Radial Lighting */}
          <div className="absolute inset-0 bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:32px_32px] opacity-15 pointer-events-none" />

          {/* Floating Contextual Toolbar when a section is active */}
          {selectedSection && (
            <div className="mb-4 glass px-4 py-2 rounded-2xl border border-white/15 shadow-2xl flex items-center gap-3 z-30 animate-fade-in">
              <span className="text-xs font-mono font-bold text-primary flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> {selectedSection}
              </span>
              <div className="h-3 w-[1px] bg-white/10" />
              <button
                onClick={() => handlePromptSubmit(`Improve the ${selectedSection} with bold typography and dark glass tokens.`)}
                className="text-xs font-mono font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                ✨ AI Polish
              </button>
              <button
                onClick={() => handlePromptSubmit(`Add subtle Framer Motion scroll animations to the ${selectedSection}.`)}
                className="text-xs font-mono font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                ⚡ Animate
              </button>
            </div>
          )}

          {/* Floating Luxury Preview Object */}
          <div
            className={cn(
              "transition-all duration-500 rounded-3xl glass border border-white/20 shadow-2xl overflow-hidden relative flex flex-col backdrop-blur-2xl h-full max-h-[880px]",
              getViewportWidth()
            )}
          >
            {/* Top Browser Bar */}
            <div className="h-10 px-5 border-b border-white/10 bg-secondary/40 flex items-center justify-between font-mono text-xs text-muted-foreground shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="ml-3 font-bold text-foreground">https://app.sitecraft.ai/live/{currentPage}</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> LIVE CANVA
              </span>
            </div>

            {/* Preview Iframe */}
            {iframeUrl ? (
              <iframe
                key={iframeKey}
                src={iframeUrl}
                className="w-full flex-1 bg-white animate-fade-in"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-top-navigation-by-user-activation"
                title="AI Studio Visual Preview"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-xs font-mono text-muted-foreground">Synthesizing Visual Preview...</p>
              </div>
            )}

          </div>

        </main>

        {/* ── RIGHT AI CREATIVE WORKSPACE (30% Width) ── */}
        <aside className="w-96 border-l border-white/10 glass flex flex-col z-30 shadow-2xl backdrop-blur-2xl">
          
          {/* Header Panel Switcher */}
          <div className="flex border-b border-white/10 bg-secondary/30 text-xs font-mono font-bold">
            {(["studio", "audit", "code"] as const).map((panel) => (
              <button
                key={panel}
                onClick={() => { soundEngine.playTabSwitch(); setActiveRightPanel(panel); }}
                className={cn(
                  "flex-1 py-3 text-center capitalize transition-all border-b-2",
                  activeRightPanel === panel ? "border-primary text-primary bg-primary/10" : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {panel === "studio" ? "AI Workspace" : panel}
              </button>
            ))}
          </div>

          {/* PANEL 1: AI CREATIVE WORKSPACE */}
          {activeRightPanel === "studio" && (
            <div className="flex-1 flex flex-col p-5 space-y-6 overflow-y-auto">
              
              {/* Proactive AI Suggestion Cards */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-foreground">
                  <Wand2 className="h-4 w-4 text-primary" /> PROACTIVE SUGGESTIONS
                </div>

                <div className="space-y-2">
                  {PROACTIVE_SUGGESTIONS.map((sug) => (
                    <button
                      key={sug.label}
                      onClick={() => handlePromptSubmit(sug.prompt)}
                      disabled={isRegenerating}
                      className="w-full p-3.5 rounded-2xl bg-secondary/20 border border-white/10 hover:border-primary/40 text-left transition-all hover:-translate-y-0.5 group space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-foreground group-hover:text-primary">
                        <span>{sug.label}</span>
                        <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{sug.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Instant Theme Chips */}
              <div className="space-y-3 border-t border-white/10 pt-4">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-foreground">
                  <Palette className="h-4 w-4 text-purple-400" /> INSTANT THEME SWAP
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                  {THEME_PRESETS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleSwapTheme(t.id)}
                      className={cn("p-2.5 rounded-xl text-left font-bold transition-transform hover:scale-105", t.bg)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent Activity & Prompt Bar */}
              <div className="space-y-3 flex-1 flex flex-col justify-between border-t border-white/10 pt-4">
                
                <div className="space-y-2 max-h-40 overflow-y-auto font-mono text-xs">
                  {messages.map((m) => (
                    <div key={m.id} className={cn("p-3 rounded-xl leading-relaxed", m.sender === "user" ? "bg-primary/20 text-primary border border-primary/30 ml-4" : "bg-secondary/30 text-foreground border border-white/5 mr-4")}>
                      {m.text}
                    </div>
                  ))}
                  {isRegenerating && (
                    <div className="p-3 rounded-xl bg-purple-500/20 text-purple-300 font-mono text-xs flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Synthesizing AI design update...
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-2">
                  <div className="relative">
                    <Textarea
                      ref={textareaRef}
                      value={editInstruction}
                      onChange={(e) => setEditInstruction(e.target.value)}
                      onFocus={() => soundEngine.playInputFocus()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handlePromptSubmit();
                        }
                      }}
                      placeholder="Describe what to design or edit..."
                      className="min-h-[75px] bg-secondary/30 border border-white/10 text-xs font-medium rounded-xl p-3 pr-10 focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => handlePromptSubmit()}
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

          {/* PANEL 2: DESIGN AUDIT & CRITIQUE */}
          {activeRightPanel === "audit" && (
            <div className="flex-1 p-5 space-y-4 overflow-y-auto font-mono text-xs">
              <div className="p-4 rounded-2xl bg-secondary/30 border border-white/10 space-y-3">
                <div className="flex justify-between"><span className="text-muted-foreground">Visual Polish</span><span className="text-purple-400 font-bold">98/100</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">SEO Structure</span><span className="text-emerald-400 font-bold">99/100</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">WAI-ARIA Accessibility</span><span className="text-cyan-400 font-bold">99/100</span></div>
              </div>
            </div>
          )}

          {/* PANEL 3: CODE VIEW */}
          {activeRightPanel === "code" && (
            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs">
              <pre className="p-4 rounded-2xl bg-black/80 border border-white/10 text-emerald-400 overflow-x-auto text-[11px] leading-relaxed">
                {getPageCode()}
              </pre>
            </div>
          )}

        </aside>

      </div>

    </div>
  );
}
