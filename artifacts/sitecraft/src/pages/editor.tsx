import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useGetProject, useChatEditProject, useGetJob } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Send, Sparkles, Monitor, Tablet, Smartphone, 
  RotateCcw, Download, FileCode2, FolderArchive, ChevronDown
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
type Message = { role: "user" | "agent"; content: string; timestamp: string };

export default function ProjectEditor() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  const { data: project, refetch } = useGetProject(id, { 
    query: { enabled: !!id, queryKey: [] as unknown[] } 
  });

  const chatEdit = useChatEditProject();

  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: "agent", 
      content: "Hello! I'm your AI Director. I've finished the initial build of your site. What would you like to change? You can ask me to tweak colors, rewrite sections, or change the layout entirely.", 
      timestamp: new Date().toISOString() 
    }
  ]);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: job } = useGetJob(activeJobId || "", {
    query: {
      enabled: !!activeJobId,
      queryKey: [] as unknown[],
      refetchInterval: (query) => {
        const state = query.state.data;
        if (!state) return 1500;
        return state.status === "completed" || state.status === "failed" ? false : 1500;
      },
    },
  });

  useEffect(() => {
    if (!job) return;
    if (job.status === "completed") {
      setActiveJobId(null);
      refetch();
      setMessages(prev => {
        const newMsgs = [...prev];
        if (newMsgs[newMsgs.length - 1]?.content === "...") {
          newMsgs[newMsgs.length - 1] = {
            role: "agent",
            content: "I've applied those changes. Take a look at the preview!",
            timestamp: new Date().toISOString()
          };
        }
        return newMsgs;
      });
      toast.success("Changes applied successfully");
    } else if (job.status === "failed") {
      setActiveJobId(null);
      setMessages(prev => {
        const newMsgs = [...prev];
        if (newMsgs[newMsgs.length - 1]?.content === "...") {
          newMsgs[newMsgs.length - 1] = {
            role: "agent",
            content: `Sorry, I encountered an error: ${job.error || "failed to apply edits"}`,
            timestamp: new Date().toISOString()
          };
        }
        return newMsgs;
      });
      toast.error("Failed to apply edits");
    }
  }, [job, refetch]);

  useEffect(() => {
    if (project?.generatedHtml) {
      const blob = new Blob([project.generatedHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setIframeUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    return undefined;
  }, [project?.generatedHtml]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || chatEdit.isPending || activeJobId) return;
    
    const userMessage = chatInput.trim();
    setChatInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage, timestamp: new Date().toISOString() }]);
    
    try {
      setMessages(prev => [...prev, { role: "agent", content: "...", timestamp: new Date().toISOString() }]);
      
      const jobResult = await chatEdit.mutateAsync({
        id: id,
        data: { message: userMessage }
      });
      
      if (jobResult?.id) {
        setActiveJobId(jobResult.id);
      } else {
        throw new Error("No job ID returned from server");
      }
      
    } catch (error) {
      setMessages(prev => {
        const newMsgs = [...prev];
        if (newMsgs[newMsgs.length - 1]?.content === "...") {
          newMsgs[newMsgs.length - 1] = { 
            role: "agent", 
            content: "Sorry, I encountered an error starting the edit job.", 
            timestamp: new Date().toISOString() 
          };
        }
        return newMsgs;
      });
      toast.error("Failed to apply edits");
    }
  };

  const triggerDownload = (url: string) => {
    if (!project?.generatedHtml) {
      toast.error("Nothing to export yet — generation isn't finished.");
      return;
    }
    const link = document.createElement("a");
    link.href = url;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExportHtml = () => triggerDownload(`/api/projects/${id}/export`);
  const handleExportZip  = () => triggerDownload(`/api/projects/${id}/export/zip`);

  const getViewportWidth = () => {
    switch(viewport) {
      case "mobile": return "w-[375px]";
      case "tablet": return "w-[768px]";
      case "desktop": return "w-full";
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] md:h-screen w-full bg-background overflow-hidden">
      
      {/* Editor Main Canvas (Iframe Preview) */}
      <div className="flex-1 flex flex-col relative bg-muted/30">
        
        {/* Editor Toolbar */}
        <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1 border border-border/50">
            <Button 
              variant={viewport === "desktop" ? "secondary" : "ghost"} 
              size="sm" 
              className={cn("h-8 px-2", viewport === "desktop" && "bg-background shadow-sm")}
              onClick={() => setViewport("desktop")}
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewport === "tablet" ? "secondary" : "ghost"} 
              size="sm" 
              className={cn("h-8 px-2", viewport === "tablet" && "bg-background shadow-sm")}
              onClick={() => setViewport("tablet")}
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewport === "mobile" ? "secondary" : "ghost"} 
              size="sm" 
              className={cn("h-8 px-2", viewport === "mobile" && "bg-background shadow-sm")}
              onClick={() => setViewport("mobile")}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 h-8" onClick={() => refetch()}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reload Frame
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8"
                  disabled={!project?.generatedHtml}
                  data-testid="button-export"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={handleExportHtml} className="gap-2 cursor-pointer">
                  <FileCode2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">HTML file</p>
                    <p className="text-xs text-muted-foreground">Single self-contained page</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportZip} className="gap-2 cursor-pointer">
                  <FolderArchive className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">ZIP package</p>
                    <p className="text-xs text-muted-foreground">+ .htaccess · robots.txt · sitemap</p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Select defaultValue="default">
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue placeholder="Theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Current Theme</SelectItem>
                <SelectItem value="dark">Dark Mode</SelectItem>
                <SelectItem value="light">Light Mode</SelectItem>
                <SelectItem value="high-contrast">High Contrast</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Iframe Container */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-4 lg:p-8 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px]">
          <div className={cn(
            "transition-all duration-500 ease-in-out bg-white border border-border rounded-lg shadow-2xl overflow-hidden relative flex flex-col",
            getViewportWidth(),
            viewport !== "desktop" ? "h-[800px] max-h-full" : "h-full"
          )}>
            {/* Fake browser chrome for mobile/tablet */}
            {viewport !== "desktop" && (
              <div className="h-6 bg-muted/80 border-b border-border flex items-center justify-center shrink-0">
                <div className="w-12 h-1.5 bg-border rounded-full" />
              </div>
            )}
            
            {iframeUrl ? (
              <iframe 
                src={iframeUrl} 
                className="w-full h-full bg-white"
                sandbox="allow-scripts allow-same-origin"
                title="Editor Preview"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-card">
                <div className="animate-pulse flex flex-col items-center gap-2">
                  <Sparkles className="h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">Loading preview...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar - AI Chat & Controls */}
      <div className="w-full md:w-[400px] shrink-0 border-l border-border bg-card flex flex-col z-20 shadow-xl">
        <div className="h-14 border-b border-border flex items-center px-4 shrink-0 bg-background/50 backdrop-blur-sm">
          <h2 className="font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Director
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
          {messages.map((msg, i) => (
            <div key={i} className={cn(
              "flex gap-3 max-w-[90%]",
              msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
            )}>
              <Avatar className="h-8 w-8 shrink-0 border border-border">
                {msg.role === "user" ? (
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {user?.firstName?.[0] || "U"}
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
                  : "bg-muted border border-border/50 rounded-tl-sm"
              )}>
                {msg.content === "..." ? (
                  <div className="flex items-center gap-1 h-5">
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-bounce" />
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-border bg-card/80 backdrop-blur-sm">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            className="relative flex items-end gap-2"
          >
            <Textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="e.g. Make the hero section dark mode..."
              className="min-h-[80px] resize-none pr-12 bg-background shadow-inner text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button 
              type="submit" 
              size="icon" 
              className="absolute right-2 bottom-2 h-8 w-8 rounded-md shrink-0 transition-transform active:scale-95"
              disabled={!chatInput.trim() || chatEdit.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" className="text-[10px] h-6 px-2 py-0 bg-muted hover:bg-muted/80 text-muted-foreground" onClick={() => setChatInput("Change the primary color to emerald green")}>
              Color to green
            </Button>
            <Button variant="secondary" size="sm" className="text-[10px] h-6 px-2 py-0 bg-muted hover:bg-muted/80 text-muted-foreground" onClick={() => setChatInput("Make the typography more playful and rounded")}>
              Playful typography
            </Button>
            <Button variant="secondary" size="sm" className="text-[10px] h-6 px-2 py-0 bg-muted hover:bg-muted/80 text-muted-foreground" onClick={() => setChatInput("Rewrite the hero copy to be punchier")}>
              Rewrite hero
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
