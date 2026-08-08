import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useGetProject } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  RotateCcw, Monitor, Tablet, Smartphone, Sparkles, Send,
  Rocket, Code, Layers, Paperclip, Check, CornerDownLeft, ChevronLeft, ChevronRight
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

const THINKING_MESSAGES = [
  "Understanding your request...",
  "Planning improvements...",
  "Generating layout...",
  "Optimizing responsiveness...",
  "Reviewing design quality..."
];

export default function ProjectEditor() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: project, refetch } = useGetProject(id ?? "", {
    query: { enabled: !!id, queryKey: [] as unknown[] },
  });

  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [selectedSection, setSelectedSection] = useState<string | null>("Hero Section");
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isSectionsOpen, setIsSectionsOpen] = useState(false);

  const [editInstruction, setEditInstruction] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const [iframeKey, setIframeKey] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Multi-page state
  const [pages, setPages] = useState<string[]>(["index.html"]);
  const [currentPage, setCurrentPage] = useState<string>("index.html");

  // Left Section Layers
  const [sections] = useState([
    { id: "Hero Section", name: "Hero Section", elements: ["Headline", "CTA Button", "Visual"], status: "Ready" },
    { id: "Features", name: "Features Grid", elements: ["Feature Cards", "Icons"], status: "Ready" },
    { id: "Testimonials", name: "Testimonials", elements: ["Reviews", "Avatars"], status: "Ready" },
    { id: "Pricing", name: "Pricing Matrix", elements: ["Developer Tier", "Enterprise Tier"], status: "Ready" },
  ]);

  // Chat conversation stream
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      sender: "ai",
      text: "I'm your AI Design Partner. Direct what you want to edit on the page.",
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
  }, [messages, isRegenerating, thinkingIndex]);

  // Thinking messages cycler
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRegenerating) {
      setThinkingIndex(0);
      interval = setInterval(() => {
        setThinkingIndex((prev) => (prev + 1) % THINKING_MESSAGES.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isRegenerating]);

  const iframeUrl = project?.id
    ? `/api/projects/${project.id}/preview?page=${currentPage}&t=${new Date(project.updatedAt).getTime()}&k=${iframeKey}`
    : null;

  const getViewportWidth = () => {
    if (viewport === "mobile") return "w-[375px] h-[812px]";
    if (viewport === "tablet") return "w-[768px] h-[1024px]";
    return "w-full max-w-[1440px] h-full";
  };

  const handlePromptSubmit = async (customPrompt?: string) => {
    const rawPrompt = (customPrompt || editInstruction).trim();
    if (!rawPrompt) {
      toast.error("Tell the AI what to change first.");
      return;
    }
    if (!id) return;

    soundEngine.playPrimaryClick();

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
            text: `I updated ${selectedSection || "the layout"}.`,
            bullets: [
              "Improved typography hierarchy & contrast",
              "Applied dark glassmorphism & soft borders",
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
    <div className="flex h-screen w-full bg-[var(--surface-0)] text-[#EDECE7] font-sans overflow-hidden select-none relative">
      <CommandPalette open={isCommandOpen} onOpenChange={setIsCommandOpen} />

      {/* ── TOP MINIMALIST TOOLBAR ── */}
      <header className="absolute top-0 inset-x-0 h-14 border-b border-[rgba(255,255,255,0.06)] bg-[var(--surface-1)] flex items-center justify-between px-6 z-40 backdrop-blur-md">
        
        {/* Left: Project & Page Switcher */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => setLocation("/dashboard")}>
            <ZovaixLogo size="sm" showLabel={false} />
            <span className="font-bold text-[15px] tracking-tight text-[#EDECE7]">
              {project?.name || "ZOVAIX SITES"}
            </span>
          </div>

          <div className="h-4 w-[1px] bg-[rgba(255,255,255,0.06)] hidden sm:block" />

          {/* Pages */}
          {pages.length > 0 && (
            <div className="flex items-center gap-1 bg-[var(--surface-2)] rounded-lg p-1">
              {pages.map((p) => (
                <button
                  key={p}
                  onClick={() => { soundEngine.playTabSwitch(); setCurrentPage(p); }}
                  className={cn(
                    "px-3 py-1 text-[13px] font-medium rounded-md transition-all",
                    currentPage === p ? "bg-[var(--surface-3)] text-[#EDECE7]" : "text-muted-foreground hover:text-[#EDECE7]"
                  )}
                >
                  {p.replace(".html", "")}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Center: Viewport Switcher */}
        <div className="flex items-center gap-1 bg-[var(--surface-2)] rounded-lg p-1">
          {(["desktop", "tablet", "mobile"] as Viewport[]).map((v) => {
            const Icon = v === "desktop" ? Monitor : v === "tablet" ? Tablet : Smartphone;
            return (
              <button
                key={v}
                onClick={() => { soundEngine.playTabSwitch(); setViewport(v); }}
                className={cn(
                  "h-7 px-3 rounded-md text-[13px] font-medium flex items-center gap-1.5 transition-all",
                  viewport === v ? "bg-[var(--surface-3)] text-[#EDECE7]" : "text-muted-foreground hover:text-[#EDECE7]"
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
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[rgba(255,255,255,0.06)] text-[13px] text-muted-foreground hover:text-[#EDECE7] transition-colors"
          >
            <span>Command</span>
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-4)] text-[10px]">⌘K</kbd>
          </button>

          <Button size="sm" variant="ghost" className="h-8 text-[13px] font-medium gap-1.5 hover:bg-[var(--surface-2)]" onClick={() => refetch()}>
            <RotateCcw className="h-3.5 w-3.5" /> Reload
          </Button>

          <Button size="sm" className="h-8 px-4 rounded-lg text-[13px] font-semibold bg-[hsl(243,75%,62%)] hover:bg-[hsl(243,75%,68%)] text-white transition-all shadow-sm" onClick={() => setLocation(`/projects/${id}/deployments`)}>
            <Rocket className="h-3.5 w-3.5 mr-1" /> Publish
          </Button>
        </div>

      </header>

      {/* ── MAIN WORKSPACE ── */}
      <div className="flex-1 flex pt-14 h-full relative overflow-hidden">
        
        {/* ── LEFT SECTION LAYERS PANEL ── */}
        <div className={cn(
          "flex flex-col border-r border-[rgba(255,255,255,0.06)] bg-[var(--surface-2)] z-30 transition-all duration-300 relative",
          isSectionsOpen ? "w-[240px]" : "w-0 border-r-0"
        )}>
          {isSectionsOpen && (
            <>
              <div className="p-4 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest text-[#EDECE7] whitespace-nowrap">
                <span className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-[hsl(243,75%,62%)]" /> SECTIONS
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {sections.map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => { soundEngine.playTabSwitch(); setSelectedSection(sec.name); }}
                    className={cn(
                      "w-full p-3 rounded-xl text-left border transition-all space-y-1.5",
                      selectedSection === sec.name
                        ? "bg-[var(--surface-3)] border-[rgba(255,255,255,0.12)] text-[#EDECE7]"
                        : "bg-transparent border-transparent text-muted-foreground hover:bg-[var(--surface-3)]/50 hover:text-[#EDECE7]"
                    )}
                  >
                    <div className="flex items-center justify-between font-medium text-[13px] text-foreground">
                      <span>{sec.name}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground/80 leading-relaxed whitespace-normal">
                      {sec.elements.join(", ")}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Toggle Button for Sections */}
        <button 
          onClick={() => setIsSectionsOpen(!isSectionsOpen)}
          className={cn(
            "absolute top-[72px] z-40 p-1.5 rounded-r-lg bg-[var(--surface-2)] border border-l-0 border-[rgba(255,255,255,0.06)] text-muted-foreground hover:text-[#EDECE7] transition-all duration-300",
            isSectionsOpen ? "left-[240px]" : "left-0"
          )}
        >
          {isSectionsOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {/* ── CENTER HERO CANVAS (70%+ width) ── */}
        <main className="flex-1 relative flex flex-col items-center justify-center p-4 md:p-8 bg-[var(--surface-0)] overflow-auto min-w-[50%]">
          
          {/* Floating Contextual Toolbar above canvas */}
          {selectedSection && (
            <div className="mb-4 bg-[var(--surface-2)]/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-[rgba(255,255,255,0.06)] flex items-center gap-4 z-30 animate-fade-in shadow-sm">
              <span className="text-[13px] font-medium text-[#EDECE7] flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-[hsl(243,75%,62%)]" /> {selectedSection}
              </span>
              <div className="h-4 w-[1px] bg-[rgba(255,255,255,0.06)]" />
              <button onClick={() => handlePromptSubmit("make it premium")} className="text-[13px] font-medium text-muted-foreground hover:text-[#EDECE7] transition-colors">
                Improve
              </button>
              <button onClick={() => handlePromptSubmit("redesign layout")} className="text-[13px] font-medium text-muted-foreground hover:text-[#EDECE7] transition-colors">
                Redesign
              </button>
              <button onClick={() => handlePromptSubmit("rewrite copy")} className="text-[13px] font-medium text-muted-foreground hover:text-[#EDECE7] transition-colors">
                Rewrite
              </button>
            </div>
          )}

          {/* Floating Canvas Box */}
          <div
            className={cn(
              "transition-all duration-500 rounded-[20px] bg-[var(--surface-0)] border border-[rgba(255,255,255,0.06)] shadow-lg overflow-hidden relative flex flex-col h-full max-h-[920px]",
              getViewportWidth()
            )}
          >
            {/* Window Bar */}
            <div className="h-10 px-4 border-b border-[rgba(255,255,255,0.06)] bg-[var(--surface-1)] flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
                <span className="ml-3 font-medium text-[#EDECE7] tracking-wide">{currentPage}</span>
              </div>
            </div>

            {/* Preview Iframe */}
            {iframeUrl ? (
              <iframe
                key={iframeKey}
                src={iframeUrl}
                className="w-full flex-1 bg-white animate-fade-in"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-top-navigation-by-user-activation"
                title="Preview"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-[var(--surface-0)]">
                <div className="w-full h-full skeleton-shimmer bg-[var(--surface-1)] opacity-20" />
              </div>
            )}
          </div>
        </main>

        {/* ── RIGHT PANEL: AI CHAT (Calm, Simple, Beautiful) ── */}
        <aside className="w-[380px] bg-[var(--surface-1)] border-l border-[rgba(255,255,255,0.06)] flex flex-col z-30 shrink-0">
          
          {/* Conversation Feed */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-[15px]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex flex-col gap-1.5",
                  m.sender === "user" ? "items-end ml-12" : "items-start mr-12"
                )}
              >
                <div className={cn(
                  "px-4 py-2.5 rounded-2xl max-w-full leading-relaxed",
                  m.sender === "user" 
                    ? "bg-[var(--surface-3)] text-muted-foreground rounded-tr-sm" 
                    : "bg-transparent text-[#EDECE7] px-0"
                )}>
                  <p>{m.text}</p>
                </div>
                
                {m.bullets && (
                  <div className="space-y-2 mt-2 px-0">
                    {m.bullets.map((b, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-[14px] text-muted-foreground">
                        <Check className="h-4 w-4 shrink-0 text-[#22C55E]" />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isRegenerating && (
              <div className="flex items-center gap-3 text-muted-foreground text-[14px] animate-pulse py-2">
                <Sparkles className="h-4 w-4 text-[hsl(243,75%,62%)]" />
                <span>{THINKING_MESSAGES[thinkingIndex]}</span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Fixed Bottom Input Area */}
          <div className="p-4 bg-[var(--surface-1)]">
            <div className="relative flex items-end bg-[var(--surface-2)] rounded-[20px] p-2 border border-[rgba(255,255,255,0.06)] focus-within:border-[rgba(255,255,255,0.12)] transition-colors">
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
                placeholder="Ask AI to update the design..."
                className="min-h-[44px] max-h-[200px] w-full bg-transparent border-0 text-[15px] font-normal resize-none px-3 py-2.5 focus-visible:ring-0 shadow-none text-[#EDECE7] placeholder:text-muted-foreground"
              />
              
              <div className="flex items-center gap-1 p-1 shrink-0">
                <button
                  type="button"
                  onClick={() => toast.info("Asset attachment coming soon")}
                  className="p-2 rounded-xl text-muted-foreground hover:bg-[var(--surface-3)] hover:text-[#EDECE7] transition-colors"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handlePromptSubmit()}
                  disabled={isRegenerating || !editInstruction.trim()}
                  className="p-2 rounded-xl bg-[hsl(243,75%,62%)] text-white hover:bg-[hsl(243,75%,68%)] disabled:opacity-50 disabled:hover:bg-[hsl(243,75%,62%)] transition-all shadow-sm"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

        </aside>

      </div>

    </div>
  );
}
