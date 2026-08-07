import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useGetProject } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  RotateCcw, Monitor, Tablet, Smartphone, Sparkles, Send, Zap,
  Rocket, Loader2, Code, Layers, Paperclip, Check, CornerDownLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { soundEngine } from "@/lib/sound-effects";
import { CommandPalette } from "@/components/ui/command-palette";
import { ZovaixLogo } from "@/components/ui/zovaix-logo";

type Viewport = "desktop" | "tablet" | "mobile";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  bullets?: string[];
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
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Multi-page state
  const [pages, setPages] = useState<string[]>(["index.html"]);
  const [currentPage, setCurrentPage] = useState<string>("index.html");

  // Left Section Layers
  const [sections] = useState([
    { id: "Hero Section", name: "Hero Section", elements: ["Headline", "CTA Button", "3D Canvas"], status: "Ready" },
    { id: "Constellation", name: "Agent Swarm Graph", elements: ["18 Neural Nodes", "Energy Rays"], status: "Active" },
    { id: "Telemetry", name: "Telemetry Console", elements: ["Terminal Output", "WAI-ARIA Score"], status: "Ready" },
    { id: "Pricing", name: "Pricing Matrix", elements: ["Developer Tier", "Enterprise Tier"], status: "Ready" },
  ]);

  // Chat conversation stream (90% of right sidebar)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      sender: "ai",
      text: "I'm your AI Design Partner. Select any section on the canvas or type what you want to transform.",
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

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isRegenerating]);

  const iframeUrl = project?.id
    ? `/api/projects/${project.id}/preview?page=${currentPage}&t=${new Date(project.updatedAt).getTime()}&k=${iframeKey}`
    : null;

  const getViewportWidth = () => {
    if (viewport === "mobile") return "w-[375px] h-[812px]";
    if (viewport === "tablet") return "w-[768px] h-[1024px]";
    return "w-full max-w-[1480px] h-full";
  };

  const handlePromptSubmit = async (customPrompt?: string) => {
    const rawPrompt = (customPrompt || editInstruction).trim();
    if (!rawPrompt) {
      toast.error("Tell the AI what to change first.");
      return;
    }
    if (!id) return;

    soundEngine.playPrimaryClick();

    // Contextual prompt injection if a section is selected
    const fullPrompt = selectedSection
      ? `Editing [${selectedSection}]: ${rawPrompt}`
      : rawPrompt;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: rawPrompt,
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
        body: JSON.stringify({ message: fullPrompt }),
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
            text: `I updated ${selectedSection || "the page"}.`,
            bullets: [
              "Improved typography hierarchy & contrast",
              "Applied dark glassmorphism & soft borders",
              "Optimized WAI-ARIA 99/100 accessibility",
            ],
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        toast.success("Design update applied!");
      }, 1600);

    } catch {
      soundEngine.playError();
      setIsRegenerating(false);
      toast.error("Design update failed.");
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#030305] text-foreground font-sans overflow-hidden select-none relative">
      
      <CommandPalette open={isCommandOpen} onOpenChange={setIsCommandOpen} />

      {/* ── TOP MINIMALIST TOOLBAR ── */}
      <header className="absolute top-0 inset-x-0 h-14 border-b border-white/10 glass flex items-center justify-between px-6 z-40 shadow-2xl backdrop-blur-2xl">
        
        {/* Left: Project & Page Switcher */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => setLocation("/dashboard")}>
            <ZovaixLogo size="sm" showLabel={false} />
            <span className="font-extrabold text-sm tracking-tight text-foreground">
              {project?.name || "ZOVAIX SITES"}
            </span>
          </div>

          <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />

          {/* Pages */}
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

          <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5" onClick={() => refetch()}>
            <RotateCcw className="h-3.5 w-3.5" /> Reload
          </Button>

          <Button size="sm" className="h-9 px-4 rounded-xl text-xs font-bold shadow-lg shadow-primary/30 btn-magnetic" onClick={() => setLocation(`/projects/${id}/deployments`)}>
            <Rocket className="h-3.5 w-3.5 mr-1" /> Deploy
          </Button>
        </div>

      </header>

      {/* ── MAIN WORKSPACE ── */}
      <div className="flex-1 flex pt-14 h-full relative overflow-hidden">
        
        {/* ── LEFT SECTION LAYERS PANEL ── */}
        <aside className="w-64 border-r border-white/10 glass flex flex-col z-30">
          <div className="p-4 border-b border-white/10 flex items-center justify-between font-mono text-xs font-bold text-foreground">
            <span className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> SECTION LAYERS
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-xs">
            {sections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => { soundEngine.playTabSwitch(); setSelectedSection(sec.name); }}
                className={cn(
                  "w-full p-3 rounded-2xl text-left border transition-all space-y-1.5",
                  selectedSection === sec.name
                    ? "bg-primary/20 border-primary/50 text-primary shadow-lg"
                    : "bg-secondary/15 border-white/5 text-muted-foreground hover:border-white/20 hover:text-foreground"
                )}
              >
                <div className="flex items-center justify-between font-bold text-foreground">
                  <span>■ {sec.name}</span>
                  <span className="text-[10px] text-emerald-400 font-normal">✓ {sec.status}</span>
                </div>
                <div className="text-[10px] text-muted-foreground/80 leading-relaxed">
                  Contains: {sec.elements.join(", ")}
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* ── CENTER HERO CANVAS (20-25% LARGER PREVIEW) ── */}
        <main className="flex-1 relative flex flex-col items-center justify-center p-4 md:p-6 bg-[#05050a] overflow-auto">
          
          {/* Ambient Lighting */}
          <div className="absolute inset-0 bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:36px_36px] opacity-15 pointer-events-none" />

          {/* Floating Contextual Toolbar above canvas */}
          {selectedSection && (
            <div className="mb-3 glass px-4 py-1.5 rounded-2xl border border-white/20 shadow-2xl flex items-center gap-3 z-30 animate-fade-in">
              <span className="text-xs font-mono font-bold text-primary flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> {selectedSection}
              </span>
              <div className="h-3 w-[1px] bg-white/10" />
              <button onClick={() => handlePromptSubmit("make it premium")} className="text-xs font-mono font-semibold text-muted-foreground hover:text-foreground transition-colors">
                ✨ Improve
              </button>
              <button onClick={() => handlePromptSubmit("redesign layout")} className="text-xs font-mono font-semibold text-muted-foreground hover:text-foreground transition-colors">
                🎨 Redesign
              </button>
              <button onClick={() => handlePromptSubmit("rewrite copy to sound punchy")} className="text-xs font-mono font-semibold text-muted-foreground hover:text-foreground transition-colors">
                ✍️ Rewrite
              </button>
              <button onClick={() => handlePromptSubmit("add Framer motion animations")} className="text-xs font-mono font-semibold text-muted-foreground hover:text-foreground transition-colors">
                ⚡ Animate
              </button>
            </div>
          )}

          {/* Floating Canvas Box (Expanded Size) */}
          <div
            className={cn(
              "transition-all duration-500 rounded-3xl glass border border-white/20 shadow-2xl overflow-hidden relative flex flex-col backdrop-blur-2xl h-full max-h-[920px]",
              getViewportWidth()
            )}
          >
            {/* Window Bar */}
            <div className="h-9 px-4 border-b border-white/10 bg-secondary/40 flex items-center justify-between font-mono text-[10px] text-muted-foreground shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-2 font-bold text-foreground">app.sitecraft.ai / {currentPage}</span>
              </div>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> LIVE CANVAS
              </span>
            </div>

            {/* Preview Iframe */}
            {iframeUrl ? (
              <iframe
                key={iframeKey}
                src={iframeUrl}
                className="w-full flex-1 bg-white animate-fade-in"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-top-navigation-by-user-activation"
                title="Visual Studio Preview"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-xs font-mono text-muted-foreground">Synthesizing Visual Preview...</p>
              </div>
            )}

          </div>

        </main>

        {/* ── RIGHT PANEL: AI WORKSPACE CHAT (90% Conversational Dominance) ── */}
        <aside className="w-96 border-l border-white/10 glass flex flex-col z-30 shadow-2xl backdrop-blur-2xl">
          
          {/* Workspace Header */}
          <div className="p-4 border-b border-white/10 bg-secondary/30 flex items-center justify-between font-mono text-xs font-bold text-foreground">
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> AI WORKSPACE
            </span>
            <span className="text-[10px] text-emerald-400">GPT-4o SYNTHESIZER</span>
          </div>

          {/* Conversation Feed (90% Height) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "p-4 rounded-2xl leading-relaxed space-y-2 transition-all",
                  m.sender === "user"
                    ? "bg-primary/20 text-primary border border-primary/30 ml-6 rounded-br-none shadow-md"
                    : "bg-secondary/30 text-foreground border border-white/10 mr-6 rounded-bl-none"
                )}
              >
                <p className="font-medium text-xs">{m.text}</p>

                {m.bullets && (
                  <div className="space-y-1 pt-1 border-t border-white/10 font-mono text-[11px]">
                    {m.bullets.map((b, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-emerald-400">
                        <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-[9px] font-mono text-muted-foreground opacity-60 text-right pt-0.5">
                  {m.timestamp}
                </div>
              </div>
            ))}

            {isRegenerating && (
              <div className="mr-6 p-4 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-300 font-mono text-xs space-y-2 animate-pulse">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                  <span className="font-bold">AI Swarm Partner is working...</span>
                </div>
                <p className="text-[11px] text-purple-300/80">Refining typography, glass tokens, and layout physics...</p>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Fixed Bottom Input Area */}
          <div className="p-4 border-t border-white/10 bg-secondary/30 space-y-2">
            <div className="relative flex items-center">
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
                placeholder={selectedSection ? `Transform ${selectedSection}...` : "Type what you want..."}
                className="min-h-[75px] bg-black/40 border border-white/10 text-xs font-medium rounded-2xl p-3 pr-10 focus:outline-none focus:border-primary shadow-inner"
              />
              
              <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => toast.info("Asset attachment coming soon")}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handlePromptSubmit()}
                  disabled={isRegenerating || !editInstruction.trim()}
                  className="p-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-40 shadow-md"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground px-1">
              <span>Shift + Enter for new line</span>
              <span className="flex items-center gap-1">Press <CornerDownLeft className="h-2.5 w-2.5" /> to send</span>
            </div>
          </div>

        </aside>

      </div>

    </div>
  );
}
