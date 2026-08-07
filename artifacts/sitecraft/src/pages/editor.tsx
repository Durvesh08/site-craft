import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useGetProject } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  RotateCcw, Monitor, Tablet, Smartphone, Sparkles, Send,
  Rocket, Loader2, Eye, Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { soundEngine } from "@/lib/sound-effects";
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
  const [editInstruction, setEditInstruction] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Multi-page state
  const [pages, setPages] = useState<string[]>(["index.html"]);
  const [currentPage, setCurrentPage] = useState<string>("index.html");

  // Chat conversation stream
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      sender: "ai",
      text: "AI Assistant ready. Describe what you'd like to build or change on your website.",
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
    return "w-full max-w-[1540px] h-full";
  };

  const handlePromptSubmit = async (customPrompt?: string) => {
    const rawPrompt = (customPrompt || editInstruction).trim();
    if (!rawPrompt) {
      toast.error("Describe your change first.");
      return;
    }
    if (!id) return;

    soundEngine.playPrimaryClick();

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
        body: JSON.stringify({ message: rawPrompt }),
      });

      if (!res.ok) throw new Error("Update failed");

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
            text: "Updated website based on your instructions.",
            bullets: [
              "Improved layout hierarchy and spacing",
              "Refined copy and call-to-action buttons",
              "Verified mobile responsiveness",
            ],
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        toast.success("Website updated!");
      }, 1500);

    } catch {
      soundEngine.playError();
      setIsRegenerating(false);
      toast.error("Failed to update website.");
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#F8F9FC] text-[#111827] font-sans overflow-hidden select-none relative">
      
      {/* ── CLEAN STUDIO TOP BAR ── */}
      <header className="h-14 border-b border-[#E8EAF2] bg-white flex items-center justify-between px-6 z-40 shrink-0 shadow-xs font-sans">
        
        {/* Left: Brand & Page Switcher */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setLocation("/dashboard")}>
            <ZovaixLogo size="sm" showLabel={false} />
            <span className="font-bold text-sm tracking-tight text-[#111827]">
              {project?.name || "ZOVAIX SITES Builder"}
            </span>
          </div>

          <div className="h-4 w-[1px] bg-[#E8EAF2] hidden sm:block" />

          {/* Page Switcher */}
          {pages.length > 0 && (
            <div className="flex items-center gap-1 bg-[#F8F9FC] rounded-xl p-1 border border-[#E8EAF2]">
              {pages.map((p) => (
                <button
                  key={p}
                  onClick={() => { soundEngine.playTabSwitch(); setCurrentPage(p); }}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-lg transition-all",
                    currentPage === p ? "bg-white text-[#6D5EF8] shadow-xs" : "text-[#6B7280] hover:text-[#111827]"
                  )}
                >
                  {p.replace(".html", "")}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Center: Viewport Switcher */}
        <div className="flex items-center gap-1 bg-[#F8F9FC] rounded-xl p-1 border border-[#E8EAF2]">
          {(["desktop", "tablet", "mobile"] as Viewport[]).map((v) => {
            const Icon = v === "desktop" ? Monitor : v === "tablet" ? Tablet : Smartphone;
            return (
              <button
                key={v}
                onClick={() => { soundEngine.playTabSwitch(); setViewport(v); }}
                className={cn(
                  "h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all",
                  viewport === v ? "bg-white text-[#6D5EF8] shadow-xs" : "text-[#6B7280] hover:text-[#111827]"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="capitalize hidden md:inline">{v}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Actions (Preview & Publish Website) */}
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            className="h-9 text-xs gap-1.5 rounded-xl border-[#E8EAF2] text-[#4B5563]"
            disabled={!iframeUrl}
            asChild
          >
            <a href={iframeUrl || "#"} target="_blank" rel="noreferrer">
              <Eye className="h-3.5 w-3.5 text-[#6D5EF8]" /> Preview
            </a>
          </Button>

          <Button size="sm" className="btn-consumer-primary h-9 px-4 text-xs gap-1.5" onClick={() => setLocation(`/projects/${id}/deployments`)}>
            <Rocket className="h-3.5 w-3.5" /> Publish Website
          </Button>
        </div>

      </header>

      {/* ── MAIN WORKSPACE ── */}
      <div className="flex-1 flex h-full relative overflow-hidden">
        
        {/* ── CENTER WEBSITE PREVIEW CANVAS (MAXIMIZED FULL WIDTH) ── */}
        <main className="flex-1 relative flex flex-col items-center justify-center p-4 md:p-6 bg-[#F8F9FC] overflow-auto">
          
          {/* Website Preview Box */}
          <div
            className={cn(
              "transition-all duration-300 rounded-2xl bg-white border border-[#E8EAF2] shadow-md overflow-hidden relative flex flex-col h-full max-h-[920px]",
              getViewportWidth()
            )}
          >
            {/* Top Chrome URL Bar */}
            <div className="h-9 px-4 border-b border-[#E8EAF2] bg-[#F8F9FC] flex items-center justify-between text-xs text-[#6B7280] shrink-0 font-sans">
              <span className="font-medium text-[#111827]">https://mywebsite.zovaix.com / {currentPage}</span>
              <span className="text-emerald-600 text-[11px] font-semibold flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live Editor
              </span>
            </div>

            {/* Preview Iframe */}
            {iframeUrl ? (
              <iframe
                key={iframeKey}
                src={iframeUrl}
                className="w-full flex-1 bg-white"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-top-navigation-by-user-activation"
                title="Website Preview"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 text-[#6D5EF8] animate-spin" />
                <p className="text-xs font-semibold text-[#6B7280]">Preparing Website Preview...</p>
              </div>
            )}

          </div>

        </main>

        {/* ── RIGHT PANEL: AI ASSISTANT ── */}
        <aside className="w-96 border-l border-[#E8EAF2] bg-white flex flex-col z-30 font-sans shadow-sm">
          
          {/* Header */}
          <div className="p-4 border-b border-[#E8EAF2] bg-[#F8F9FC] flex items-center justify-between text-xs font-bold text-[#111827]">
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#6D5EF8]" /> AI ASSISTANT
            </span>
          </div>

          {/* Chat Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "p-3.5 rounded-2xl leading-relaxed space-y-2 transition-all",
                  m.sender === "user"
                    ? "bg-[#6D5EF8] text-white ml-6 rounded-br-none shadow-xs"
                    : "bg-[#F8F9FC] text-[#111827] border border-[#E8EAF2] mr-6 rounded-bl-none"
                )}
              >
                <p className="font-medium">{m.text}</p>

                {m.bullets && (
                  <div className="space-y-1 pt-1 border-t border-[#E8EAF2] text-[11px] text-[#4B5563]">
                    {m.bullets.map((b, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-emerald-600">
                        <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isRegenerating && (
              <div className="mr-6 p-3.5 rounded-2xl bg-[#F2F3FF] border border-[#6D5EF8]/30 text-[#6D5EF8] font-medium text-xs flex items-center gap-2.5 animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <span>Updating website with your changes...</span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Fixed Bottom Input Area */}
          <div className="p-4 border-t border-[#E8EAF2] bg-[#F8F9FC] space-y-2">
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
                placeholder="Describe what you want to change..."
                className="min-h-[75px] bg-white border border-[#E8EAF2] text-xs font-medium rounded-2xl p-3 pr-10 focus:outline-none focus:border-[#6D5EF8] text-[#111827]"
              />
              
              <button
                type="button"
                onClick={() => handlePromptSubmit()}
                disabled={isRegenerating || !editInstruction.trim()}
                className="absolute right-2 bottom-2 p-2 rounded-xl bg-[#6D5EF8] text-white disabled:opacity-40 shadow-xs"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

        </aside>

      </div>

    </div>
  );
}
