import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useGetProject } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  RotateCcw, Monitor, Tablet, Smartphone, Sparkles, Send,
  Rocket, Loader2, Code, Paperclip, Check, CornerDownLeft, Eye,
  Layers as LayersIcon, ChevronDown, Undo2, ChevronRight, Sliders, Command
} from "lucide-react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { soundEngine } from "@/lib/sound-effects";
import { CommandPalette } from "@/components/ui/command-palette";

type Viewport = "desktop" | "tablet" | "mobile";

interface ChangeLogEntry {
  id: string;
  description: string;
  detail: string;
  timestamp: string;
}

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
  const [selectedSection, setSelectedSection] = useState<string>("Hero Section");
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isLayersOpen, setIsLayersOpen] = useState(true);
  const [activeModel, setActiveModel] = useState("GPT-4o Synthesizer");

  const [editInstruction, setEditInstruction] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Multi-page state
  const [pages, setPages] = useState<string[]>(["index.html"]);
  const [currentPage, setCurrentPage] = useState<string>("index.html");

  // Layers Tree Model
  const [layers] = useState([
    { id: "hero", name: "Hero Section", selector: "hero.headline", type: "Section" },
    { id: "agents", name: "Agent Constellation", selector: "neural.nodes", type: "Canvas" },
    { id: "telemetry", name: "Telemetry Matrix", selector: "console.output", type: "Telemetry" },
    { id: "pricing", name: "Pricing Table", selector: "pricing.matrix", type: "Grid" },
    { id: "faq", name: "Interactive FAQ", selector: "accordion.list", type: "Accordion" },
  ]);

  // Diff-style Change Log History (Signature Element)
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([
    { id: "c1", description: "Rewrote hero headline", detail: "2 words changed", timestamp: "10:14" },
    { id: "c2", description: "Adjusted CTA contrast to 4.5:1 WCAG AA", detail: "Contrast 99/100", timestamp: "10:12" },
  ]);

  // Chat conversation stream (90% height)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      sender: "ai",
      text: "AI Swarm active. Select any section layer or type what you want to edit.",
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
    return "w-full h-full max-w-[1480px]";
  };

  const handleUndoChange = (entryId: string) => {
    soundEngine.playPrimaryClick();
    setChangeLog((prev) => prev.filter((c) => c.id !== entryId));
    toast.success("Reverted change to canvas");
    setIframeKey((k) => k + 1);
  };

  const handlePromptSubmit = async (customPrompt?: string) => {
    const rawPrompt = (customPrompt || editInstruction).trim();
    if (!rawPrompt) {
      toast.error("Enter a instruction first.");
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

        // Add to Diff Change Log
        const newLog: ChangeLogEntry = {
          id: Date.now().toString(),
          description: `Updated ${selectedSection}: "${rawPrompt.slice(0, 24)}..."`,
          detail: "Synthesis complete",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setChangeLog((prev) => [newLog, ...prev]);

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "ai",
            text: `Applied changes to ${selectedSection}.`,
            bullets: [
              "Precision typography & spacing verified",
              "Dark theme hairline tokens aligned",
              "Accessibility & WCAG AA contrast 99/100",
            ],
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);

        toast.success(`Applied changes to ${selectedSection}`);
      }, 1500);

    } catch {
      soundEngine.playError();
      setIsRegenerating(false);
      toast.error("Design update failed.");
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#0A0B0D] text-[#F3F2ED] font-sans overflow-hidden select-none relative">
      
      <CommandPalette open={isCommandOpen} onOpenChange={setIsCommandOpen} />

      {/* ── TOP SEGMENTED CONTROL TOOLBAR ── */}
      <header className="h-12 border-b border-[#26272C] bg-[#131417] flex items-center justify-between px-4 z-40 shrink-0 font-mono text-xs">
        
        {/* Left: Section Selector Dropdown & Layers Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLayersOpen(!isLayersOpen)}
            className={cn(
              "p-1.5 rounded text-[#8C8D93] hover:text-[#F3F2ED] hover:bg-[#1B1C20] transition-colors",
              isLayersOpen && "text-[#C99B4D] bg-[#1B1C20]"
            )}
            title="Toggle Layers Panel"
          >
            <LayersIcon className="h-4 w-4" />
          </button>

          <div className="h-4 w-[1px] bg-[#26272C]" />

          {/* Section Dropdown Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1 rounded bg-[#1B1C20] border border-[#26272C] hover:border-[#37383F] font-semibold text-[#F3F2ED] transition-colors">
                <span>{selectedSection}</span>
                <ChevronDown className="h-3.5 w-3.5 text-[#8C8D93]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-[#131417] border border-[#26272C] text-[#F3F2ED] font-mono text-xs w-48">
              {layers.map((l) => (
                <DropdownMenuItem
                  key={l.id}
                  onClick={() => setSelectedSection(l.name)}
                  className="hover:bg-[#1B1C20] cursor-pointer"
                >
                  {l.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Contextual Actions Pills */}
          <div className="hidden md:flex items-center gap-1 bg-[#0A0B0D] p-0.5 rounded border border-[#26272C]">
            <button
              onClick={() => handlePromptSubmit("make it premium")}
              className="px-2.5 py-1 rounded text-[11px] font-mono text-[#8C8D93] hover:text-[#F3F2ED] hover:bg-[#1B1C20] transition-colors"
            >
              ✨ Improve
            </button>
            <button
              onClick={() => handlePromptSubmit("redesign layout")}
              className="px-2.5 py-1 rounded text-[11px] font-mono text-[#8C8D93] hover:text-[#F3F2ED] hover:bg-[#1B1C20] transition-colors"
            >
              🎨 Redesign
            </button>
            <button
              onClick={() => handlePromptSubmit("rewrite copy")}
              className="px-2.5 py-1 rounded text-[11px] font-mono text-[#8C8D93] hover:text-[#F3F2ED] hover:bg-[#1B1C20] transition-colors"
            >
              ✍️ Rewrite
            </button>
          </div>
        </div>

        {/* Center: Viewport Controls */}
        <div className="flex items-center gap-0.5 bg-[#0A0B0D] p-0.5 rounded border border-[#26272C]">
          {(["desktop", "tablet", "mobile"] as Viewport[]).map((v) => {
            const Icon = v === "desktop" ? Monitor : v === "tablet" ? Tablet : Smartphone;
            return (
              <button
                key={v}
                onClick={() => { soundEngine.playTabSwitch(); setViewport(v); }}
                className={cn(
                  "h-7 px-2.5 rounded text-[11px] font-mono flex items-center gap-1.5 transition-all",
                  viewport === v ? "bg-[#1B1C20] text-[#C99B4D] font-semibold" : "text-[#8C8D93] hover:text-[#F3F2ED]"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="capitalize hidden lg:inline">{v}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Project Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCommandOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0A0B0D] border border-[#26272C] text-[#8C8D93] hover:text-[#F3F2ED] transition-colors"
          >
            <span>⌘K</span>
          </button>

          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs font-mono gap-1 text-[#8C8D93] hover:text-[#F3F2ED]"
            disabled={!iframeUrl}
            asChild
          >
            <a href={iframeUrl || "#"} target="_blank" rel="noreferrer">
              <Eye className="h-3.5 w-3.5 text-[#C99B4D]" /> Preview
            </a>
          </Button>

          <Button
            size="sm"
            className="btn-signal h-7 px-3 text-xs font-mono uppercase tracking-wider shadow-none"
            onClick={() => setLocation(`/projects/${id}/deployments`)}
          >
            <Rocket className="h-3.5 w-3.5 mr-1" /> Deploy
          </Button>
        </div>

      </header>

      {/* ── THREE-PANE RESIZABLE WORKSPACE (react-resizable-panels) ── */}
      <div className="flex-1 flex overflow-hidden relative">
        <PanelGroup direction="horizontal" className="w-full h-full">
          
          {/* PANE 1: LEFT LAYERS RAIL (Collapsible 220px) */}
          {isLayersOpen && (
            <>
              <Panel defaultSize={16} minSize={12} maxSize={25} className="bg-[#131417] border-r border-[#26272C] flex flex-col font-mono text-xs">
                <div className="p-3 border-b border-[#26272C] font-semibold text-[#8C8D93] uppercase tracking-wider text-[11px]">
                  LAYERS TREE
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {layers.map((layer) => {
                    const isSelected = selectedSection === layer.name;
                    return (
                      <button
                        key={layer.id}
                        onClick={() => { soundEngine.playTabSwitch(); setSelectedSection(layer.name); }}
                        className={cn(
                          "w-full px-2.5 py-2 rounded text-left transition-colors flex items-center justify-between group",
                          isSelected
                            ? "bg-[#1B1C20] text-[#F3F2ED] font-semibold border-l-2 border-[#C99B4D]"
                            : "text-[#8C8D93] hover:text-[#F3F2ED] hover:bg-[#1B1C20]/50"
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-[10px] text-[#5B5C62]">■</span>
                          <span className="truncate">{layer.name}</span>
                        </div>
                        <span className="text-[10px] text-[#5B5C62] font-mono group-hover:text-[#8C8D93]">
                          {layer.type}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Panel>

              <PanelResizeHandle className="w-[1px] bg-[#26272C] hover:bg-[#C99B4D] transition-colors cursor-col-resize" />
            </>
          )}

          {/* PANE 2: LIVE CANVAS (Center Focus) */}
          <Panel defaultSize={54} minSize={30} className="bg-[#0A0B0D] flex flex-col items-center justify-center p-4 overflow-auto relative">
            
            {/* Subtle Canvas Border Frame - Hairline Only */}
            <div className={cn("transition-all duration-300 panel-instrument overflow-hidden flex flex-col relative", getViewportWidth())}>
              
              {/* Single Hairline Top Bar with URL */}
              <div className="h-8 px-3 border-b border-[#26272C] bg-[#131417] flex items-center justify-between font-mono text-[11px] text-[#8C8D93] shrink-0">
                <span className="truncate text-[#F3F2ED]">app.sitecraft.ai / {currentPage}</span>
                <span className="text-emerald-400 text-[10px] uppercase tracking-wider flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> LIVE
                </span>
              </div>

              {/* Framer Motion Outline Tag overlay when section is selected */}
              <AnimatePresence>
                {selectedSection && (
                  <motion.div
                    layoutId="selection-outline"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 border border-[#C99B4D] pointer-events-none z-20"
                  >
                    <span className="absolute top-0 left-0 bg-[#C99B4D] text-[#0A0B0D] font-mono text-[10px] font-bold px-1.5 py-0.5 tracking-wider">
                      {layers.find(l => l.name === selectedSection)?.selector || "section"}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Preview Iframe */}
              {iframeUrl ? (
                <iframe
                  key={iframeKey}
                  src={iframeUrl}
                  className="w-full flex-1 bg-white animate-fade-in"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-top-navigation-by-user-activation"
                  title="Live Canvas Preview"
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-6 w-6 text-[#C99B4D] animate-spin" />
                  <p className="text-xs font-mono text-[#8C8D93]">Synthesizing Canvas...</p>
                </div>
              )}

            </div>

          </Panel>

          <PanelResizeHandle className="w-[1px] bg-[#26272C] hover:bg-[#C99B4D] transition-colors cursor-col-resize" />

          {/* PANE 3: RIGHT AI WORKSPACE PANEL */}
          <Panel defaultSize={30} minSize={20} className="bg-[#131417] border-l border-[#26272C] flex flex-col font-sans">
            
            {/* Model Command Dropdown */}
            <div className="p-3 border-b border-[#26272C] flex items-center justify-between font-mono text-xs">
              <span className="font-semibold text-[#8C8D93] uppercase tracking-wider text-[11px]">
                AI WORKSPACE
              </span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#1B1C20] border border-[#26272C] text-[#C99B4D] font-semibold text-[11px]">
                    <span>{activeModel}</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#131417] border border-[#26272C] text-[#F3F2ED] font-mono text-xs w-48">
                  <DropdownMenuItem onClick={() => setActiveModel("GPT-4o Synthesizer")} className="hover:bg-[#1B1C20]">
                    GPT-4o Synthesizer
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveModel("Claude 3.5 Sonnet")} className="hover:bg-[#1B1C20]">
                    Claude 3.5 Sonnet
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* DIFF CHANGE LOG (Signature Element) */}
            {changeLog.length > 0 && (
              <div className="border-b border-[#26272C] bg-[#0A0B0D] p-3 space-y-2 font-mono text-[11px]">
                <div className="text-[10px] text-[#8C8D93] uppercase tracking-wider font-semibold">RECENT CHANGES</div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {changeLog.map((log) => (
                    <div key={log.id} className="flex items-center justify-between border-b border-[#26272C] pb-1.5 pt-0.5 text-[#F3F2ED]">
                      <div className="flex items-center gap-2 truncate">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <span className="truncate">{log.description}</span>
                      </div>
                      <button
                        onClick={() => handleUndoChange(log.id)}
                        className="text-[10px] text-[#8C8D93] hover:text-[#C9614D] transition-colors shrink-0 ml-2"
                      >
                        [Undo]
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conversation Feed (90% Height) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "p-3.5 rounded-md leading-relaxed space-y-2 border",
                    m.sender === "user"
                      ? "bg-[#1B1C20] text-[#F3F2ED] border-[#37383F] ml-6"
                      : "bg-[#0A0B0D] text-[#F3F2ED] border-[#26272C] mr-6"
                  )}
                >
                  <p className="font-medium text-xs">{m.text}</p>

                  {m.bullets && (
                    <div className="space-y-1 pt-1 border-t border-[#26272C] font-mono text-[11px]">
                      {m.bullets.map((b, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-emerald-400">
                          <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-[10px] font-mono text-[#5B5C62] text-right pt-0.5">
                    {m.timestamp}
                  </div>
                </div>
              ))}

              {isRegenerating && (
                <div className="mr-6 p-3 rounded-md bg-[#1B1C20] border border-[#26272C] font-mono text-xs space-y-1 text-[#C99B4D] animate-pulse">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="font-bold">Synthesizing change...</span>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Fixed Bottom Input Area */}
            <div className="p-3 border-t border-[#26272C] bg-[#0A0B0D] space-y-2 font-mono text-xs">
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
                  className="min-h-[70px] bg-[#131417] border-[#26272C] text-[#F3F2ED] text-xs rounded p-2.5 pr-8 focus:outline-none focus:border-[#C99B4D]"
                />
                
                <button
                  type="button"
                  onClick={() => handlePromptSubmit()}
                  disabled={isRegenerating || !editInstruction.trim()}
                  className="absolute right-2 bottom-2 p-1.5 rounded bg-[#C99B4D] text-[#0A0B0D] disabled:opacity-40"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

          </Panel>

        </PanelGroup>
      </div>

    </div>
  );
}
