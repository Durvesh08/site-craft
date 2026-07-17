import { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "wouter";
import { useGetProject, useGetJob } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Send, Sparkles, Monitor, Tablet, Smartphone,
  RotateCcw, Download, FileCode2, FolderArchive, ChevronDown,
  RefreshCw, ChevronRight, Layout, Navigation2, Grid3x3,
  MessageSquare, HelpCircle, Zap, TrendingUp, CreditCard,
  Layers, PanelBottom, Users, Star, BarChart3
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
import { useAuth } from "@workspace/replit-auth-web";

type Viewport = "desktop" | "tablet" | "mobile";
type SidebarTab = "chat" | "sections";
type Message = { role: "user" | "agent"; content: string; timestamp: string };

interface DetectedSection {
  type: string;
  component: string;
  id: string;
  label: string;
}

function sectionIcon(type: string) {
  if (type.includes("nav"))          return <Navigation2 className="h-3.5 w-3.5" />;
  if (type.includes("hero"))         return <Layout className="h-3.5 w-3.5" />;
  if (type.includes("feature") || type.includes("bento")) return <Grid3x3 className="h-3.5 w-3.5" />;
  if (type.includes("pricing"))      return <CreditCard className="h-3.5 w-3.5" />;
  if (type.includes("testimonial"))  return <MessageSquare className="h-3.5 w-3.5" />;
  if (type.includes("faq"))          return <HelpCircle className="h-3.5 w-3.5" />;
  if (type.includes("cta"))          return <Zap className="h-3.5 w-3.5" />;
  if (type.includes("stat") || type.includes("counter")) return <TrendingUp className="h-3.5 w-3.5" />;
  if (type.includes("footer"))       return <PanelBottom className="h-3.5 w-3.5" />;
  if (type.includes("logo") || type.includes("trust")) return <Star className="h-3.5 w-3.5" />;
  if (type.includes("team") || type.includes("about"))  return <Users className="h-3.5 w-3.5" />;
  if (type.includes("analytic") || type.includes("chart")) return <BarChart3 className="h-3.5 w-3.5" />;
  return <Layers className="h-3.5 w-3.5" />;
}

function parseSections(html: string): DetectedSection[] {
  if (!html) return [];
  const matches = [...html.matchAll(/\/\/ ── ([^\s(]+) \(([^)]+)\)/g)];
  return matches.map(([, type, component]) => ({
    type,
    component,
    id: component,
    label: component.replace(/Section$/, "").replace(/([A-Z])/g, " $1").trim(),
  }));
}

export default function ProjectEditor() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data: project, refetch } = useGetProject(id, {
    query: { enabled: !!id, queryKey: [] as unknown[] },
  });

  // ── Viewport & preview ────────────────────────────────────────────────────
  const [viewport, setViewport]     = useState<Viewport>("desktop");
  const [iframeUrl, setIframeUrl]   = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("chat");

  // ── Chat state ────────────────────────────────────────────────────────────
  const [chatInput, setChatInput]   = useState("");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [messages, setMessages]     = useState<Message[]>([{
    role: "agent",
    content: "Hello! I'm your AI Director. I've finished the initial build of your site. What would you like to change? You can ask me to tweak colors, rewrite sections, or change the layout entirely.",
    timestamp: new Date().toISOString(),
  }]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Section regeneration state ────────────────────────────────────────────
  const [expandedSection, setExpandedSection]   = useState<string | null>(null);
  const [sectionInstructions, setSectionInstructions] = useState<Record<string, string>>({});
  const [regenningSection, setRegenningSection] = useState<string | null>(null);
  const [regenJobId, setRegenJobId]             = useState<string | null>(null);
  const [regenDoneSection, setRegenDoneSection] = useState<string | null>(null);

  // ── Derived sections list ─────────────────────────────────────────────────
  const detectedSections = useMemo(
    () => parseSections(project?.generatedHtml ?? ""),
    [project?.generatedHtml],
  );

  // ── Chat job polling ──────────────────────────────────────────────────────
  const { data: chatJob } = useGetJob(activeJobId ?? "", {
    query: {
      enabled: !!activeJobId,
      queryKey: [] as unknown[],
      refetchInterval: (q) => {
        const s = q.state.data?.status;
        return s === "completed" || s === "failed" ? false : 1500;
      },
    },
  });

  useEffect(() => {
    if (!chatJob) return;
    if (chatJob.status === "completed") {
      setActiveJobId(null);
      refetch();
      setMessages(prev => {
        const msgs = [...prev];
        if (msgs.at(-1)?.content === "...") {
          msgs[msgs.length - 1] = { role: "agent", content: "Done! Take a look at the preview.", timestamp: new Date().toISOString() };
        }
        return msgs;
      });
      toast.success("Changes applied");
    } else if (chatJob.status === "failed") {
      setActiveJobId(null);
      setMessages(prev => {
        const msgs = [...prev];
        if (msgs.at(-1)?.content === "...") {
          msgs[msgs.length - 1] = { role: "agent", content: `Error: ${chatJob.error ?? "edit failed"}`, timestamp: new Date().toISOString() };
        }
        return msgs;
      });
      toast.error("Edit failed");
    }
  }, [chatJob, refetch]);

  // ── Section regen job polling ─────────────────────────────────────────────
  const { data: regenJob } = useGetJob(regenJobId ?? "", {
    query: {
      enabled: !!regenJobId,
      queryKey: [] as unknown[],
      refetchInterval: (q) => {
        const s = q.state.data?.status;
        return s === "completed" || s === "failed" ? false : 1200;
      },
    },
  });

  useEffect(() => {
    if (!regenJob) return;
    if (regenJob.status === "completed") {
      const section = regenningSection;
      setRegenJobId(null);
      setRegenningSection(null);
      setExpandedSection(null);
      setSectionInstructions(prev => ({ ...prev, [section ?? ""]: "" }));
      setRegenDoneSection(section);
      setTimeout(() => setRegenDoneSection(null), 2500);
      refetch();
      toast.success(`${section?.replace(/Section$/, "") ?? "Section"} regenerated`);
    } else if (regenJob.status === "failed") {
      setRegenJobId(null);
      setRegenningSection(null);
      toast.error("Section regeneration failed");
    }
  }, [regenJob, regenningSection, refetch]);

  // ── Iframe blob URL ───────────────────────────────────────────────────────
  useEffect(() => {
    if (project?.generatedHtml) {
      const blob = new Blob([project.generatedHtml], { type: "text/html" });
      const url  = URL.createObjectURL(blob);
      setIframeUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    return undefined;
  }, [project?.generatedHtml]);

  // ── Auto-scroll chat ──────────────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSendMessage = async () => {
    if (!chatInput.trim() || activeJobId) return;
    const text = chatInput.trim();
    setChatInput("");
    setMessages(prev => [...prev, { role: "user", content: text, timestamp: new Date().toISOString() }]);
    setMessages(prev => [...prev, { role: "agent", content: "...", timestamp: new Date().toISOString() }]);

    try {
      const res = await fetch(`/api/projects/${id}/chat-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) throw new Error("Failed");
      const job = await res.json();
      setActiveJobId(job.id);
    } catch {
      setMessages(prev => {
        const msgs = [...prev];
        if (msgs.at(-1)?.content === "...") msgs[msgs.length - 1] = { role: "agent", content: "Error starting edit.", timestamp: new Date().toISOString() };
        return msgs;
      });
      toast.error("Failed to apply edits");
    }
  };

  const handleRegenSection = async (section: DetectedSection) => {
    if (regenningSection) return;
    setRegenningSection(section.component);
    const instruction = sectionInstructions[section.component]?.trim() || undefined;

    try {
      const res = await fetch(`/api/projects/${id}/regenerate-section`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sectionId: section.component, instruction }),
      });
      if (!res.ok) throw new Error("Failed");
      const job = await res.json();
      setRegenJobId(job.id);
    } catch {
      setRegenningSection(null);
      toast.error("Failed to start regeneration");
    }
  };

  const triggerDownload = (url: string) => {
    if (!project?.generatedHtml) { toast.error("No site generated yet."); return; }
    const a = document.createElement("a");
    a.href = url; a.download = "";
    document.body.appendChild(a); a.click(); a.remove();
  };

  const getViewportWidth = () => {
    if (viewport === "mobile")  return "w-[375px]";
    if (viewport === "tablet")  return "w-[768px]";
    return "w-full";
  };

  const isBusy = !!activeJobId || !!regenJobId;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-64px)] md:h-screen w-full bg-background overflow-hidden">

      {/* ── Preview canvas ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col relative bg-muted/30">

        {/* Toolbar */}
        <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1 border border-border/50">
            {(["desktop", "tablet", "mobile"] as Viewport[]).map(v => {
              const Icon = v === "desktop" ? Monitor : v === "tablet" ? Tablet : Smartphone;
              return (
                <Button key={v} variant={viewport === v ? "secondary" : "ghost"} size="sm"
                  className={cn("h-8 px-2", viewport === v && "bg-background shadow-sm")}
                  onClick={() => setViewport(v)}>
                  <Icon className="h-4 w-4" />
                </Button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 h-8" onClick={() => refetch()}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reload
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-8" disabled={!project?.generatedHtml}>
                  <Download className="h-3.5 w-3.5" />
                  Export
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => triggerDownload(`/api/projects/${id}/export`)} className="gap-2 cursor-pointer">
                  <FileCode2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">HTML file</p>
                    <p className="text-xs text-muted-foreground">Single self-contained page</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => triggerDownload(`/api/projects/${id}/export/zip`)} className="gap-2 cursor-pointer">
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
              <iframe src={iframeUrl} className="w-full h-full bg-white" sandbox="allow-scripts allow-same-origin" title="Editor Preview" />
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

      {/* ── Right sidebar ─────────────────────────────────────────────────── */}
      <div className="w-full md:w-[400px] shrink-0 border-l border-border bg-card flex flex-col z-20 shadow-xl">

        {/* Tab bar */}
        <div className="h-14 border-b border-border flex items-stretch shrink-0 bg-background/50">
          <button
            className={cn(
              "flex-1 flex items-center justify-center gap-2 text-sm font-medium border-b-2 transition-colors",
              sidebarTab === "chat"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setSidebarTab("chat")}
          >
            <Sparkles className="h-4 w-4" />
            AI Director
          </button>
          <button
            className={cn(
              "flex-1 flex items-center justify-center gap-2 text-sm font-medium border-b-2 transition-colors",
              sidebarTab === "sections"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setSidebarTab("sections")}
          >
            <Layers className="h-4 w-4" />
            Sections
            {detectedSections.length > 0 && (
              <Badge variant="secondary" className="h-4 text-[10px] px-1.5 ml-0.5">
                {detectedSections.length}
              </Badge>
            )}
          </button>
        </div>

        {/* ── Chat tab ──────────────────────────────────────────────────── */}
        {sidebarTab === "chat" && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex gap-3 max-w-[90%]", msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto")}>
                  <Avatar className="h-8 w-8 shrink-0 border border-border">
                    {msg.role === "user" ? (
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {user?.firstName?.[0] ?? "U"}
                      </AvatarFallback>
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-primary to-blue-600 text-white">
                        <Sparkles className="h-4 w-4" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted border border-border/50 rounded-tl-sm",
                  )}>
                    {msg.content === "..." ? (
                      <div className="flex items-center gap-1 h-5">
                        <span className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-bounce" />
                      </div>
                    ) : msg.content}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-border bg-card/80 backdrop-blur-sm">
              <form onSubmit={e => { e.preventDefault(); handleSendMessage(); }} className="relative flex items-end gap-2">
                <Textarea
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="e.g. Make the hero darker and punchier…"
                  className="min-h-[80px] resize-none pr-12 bg-background shadow-inner text-sm"
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                />
                <Button type="submit" size="icon"
                  className="absolute right-2 bottom-2 h-8 w-8 rounded-md shrink-0 transition-transform active:scale-95"
                  disabled={!chatInput.trim() || isBusy}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>

              <div className="mt-3 flex flex-wrap gap-2">
                {["Change primary color to emerald", "Make hero copy punchier", "Add a dark mode feel"].map(s => (
                  <button key={s} onClick={() => setChatInput(s)}
                    className="text-[10px] h-6 px-2 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground transition-colors border border-border/50">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Sections tab ──────────────────────────────────────────────── */}
        {sidebarTab === "sections" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {detectedSections.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
                <Layers className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No sections detected yet.<br />Generate a site first.</p>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-border bg-muted/20">
                  <p className="text-xs text-muted-foreground">
                    Regenerate any section with a single click — optionally add an instruction to guide the AI.
                  </p>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-3 space-y-1.5">
                    {detectedSections.map((section) => {
                      const isRegening = regenningSection === section.component;
                      const isDone     = regenDoneSection === section.component;
                      const isExpanded = expandedSection  === section.component;

                      return (
                        <div key={section.component}
                          className={cn(
                            "rounded-lg border transition-all duration-200",
                            isDone    ? "border-emerald-500/40 bg-emerald-500/5"  :
                            isRegening ? "border-primary/40 bg-primary/5"         :
                            isExpanded ? "border-border bg-muted/40"              :
                                         "border-border/60 bg-background hover:border-border hover:bg-muted/20",
                          )}
                        >
                          {/* Section row */}
                          <button
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                            onClick={() => setExpandedSection(isExpanded ? null : section.component)}
                            disabled={!!regenningSection}
                          >
                            <span className={cn(
                              "flex items-center justify-center w-7 h-7 rounded-md shrink-0 transition-colors",
                              isDone     ? "bg-emerald-500/15 text-emerald-600" :
                              isRegening ? "bg-primary/15 text-primary"         :
                                           "bg-muted text-muted-foreground",
                            )}>
                              {isRegening ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              ) : isDone ? (
                                <span className="text-sm">✓</span>
                              ) : (
                                sectionIcon(section.type)
                              )}
                            </span>

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{section.label}</p>
                              <p className="text-[10px] text-muted-foreground truncate font-mono">{section.type}</p>
                            </div>

                            {!isRegening && (
                              <ChevronRight className={cn(
                                "h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200",
                                isExpanded && "rotate-90",
                              )} />
                            )}
                          </button>

                          {/* Expanded instruction + action */}
                          {isExpanded && !isRegening && (
                            <div className="px-3 pb-3 space-y-2 border-t border-border/50 pt-2.5">
                              <Textarea
                                value={sectionInstructions[section.component] ?? ""}
                                onChange={e => setSectionInstructions(prev => ({ ...prev, [section.component]: e.target.value }))}
                                placeholder={`Optional: describe what to change in the ${section.label} section…`}
                                className="min-h-[60px] resize-none text-xs bg-background"
                                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleRegenSection(section); }}
                              />
                              <div className="flex gap-2">
                                <Button size="sm" className="flex-1 gap-2 h-8 text-xs"
                                  onClick={() => handleRegenSection(section)}
                                  disabled={!!regenningSection}>
                                  <RefreshCw className="h-3.5 w-3.5" />
                                  Regenerate section
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground"
                                  onClick={() => setExpandedSection(null)}>
                                  Cancel
                                </Button>
                              </div>
                              <p className="text-[10px] text-muted-foreground">⌘ + Enter to regenerate</p>
                            </div>
                          )}

                          {/* Progress while regenerating */}
                          {isRegening && (
                            <div className="px-3 pb-3 pt-1">
                              <div className="flex items-center gap-2 text-xs text-primary">
                                <div className="flex gap-0.5">
                                  <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:-0.2s]" />
                                  <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:-0.1s]" />
                                  <span className="w-1 h-1 rounded-full bg-primary animate-bounce" />
                                </div>
                                Generating with Gemini Pro…
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
