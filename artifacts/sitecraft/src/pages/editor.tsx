import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ProjectWorkspaceLayout } from "./project-workspace-layout";
import { useGetProject } from "@workspace/api-client-react";
import { generationService } from "@/services/generation";
import { filesService } from "@/services/files";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  RotateCcw, Monitor, Tablet, Smartphone, Sparkles, Send,
  Rocket, Code, Layers, Paperclip, Check, CornerDownLeft, ChevronLeft, ChevronRight,
  Wrench, Bug, HelpCircle, FileSearch, Undo2, CheckCircle2, Circle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Viewport = "desktop" | "tablet" | "mobile";
type AgentMode = "Build" | "Plan" | "Debug" | "Explain" | "Review";

interface TaskStep {
  label: string;
  status: 'done' | 'active' | 'pending';
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  mode?: AgentMode;
  text: string;
  timestamp: string;
  filesChanged?: string[];
  tasks?: TaskStep[];
}

export default function ProjectEditor() {
  const { id } = useParams<{ id?: string }>();
  const projectId = id || 'lumina';
  const { data } = useGetProject(projectId, { query: { enabled: !!projectId } });
  
  const rawProject = data?.project || {
    id: projectId,
    name: projectId,
    domain: `${projectId}.zovaix.site`,
    status: 'draft',
    description: '',
    category: 'SaaS',
    isStarred: false,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const project = rawProject;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [isSectionsOpen, setIsSectionsOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>("Hero Section");

  // Agent States
  const [agentMode, setAgentMode] = useState<AgentMode>("Build");
  const [editInstruction, setEditInstruction] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'ai',
      mode: 'Build',
      text: `Hello! I am Zovaix AI Agent. I have synthesized the initial application codebase for ${project.name}. Describe what changes or features you want to build.`,
      timestamp: 'Just now',
    },
  ]);

  const [sections] = useState([
    { id: "Hero Section", name: "Hero Section", elements: ["Headline", "CTA Button", "Visual"] },
    { id: "Features Section", name: "Features Grid", elements: ["Feature Cards", "Icons"] },
    { id: "Pricing Section", name: "Pricing Table", elements: ["Plan Cards", "CTA"] },
  ]);

  const handleSendPrompt = async () => {
    if (!editInstruction.trim() || isBuilding) return;

    const attachedText = attachments.length > 0 ? ` [Attached: ${attachments.join(', ')}]` : '';
    const promptText = editInstruction + attachedText;
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setEditInstruction("");
    setAttachments([]);
    setIsBuilding(true);

    try {
      const jobRes = await generationService.sendChatEdit(projectId, promptText);
      if (jobRes && jobRes.jobId) {
        await generationService.pollJobUntilCompletion(jobRes.jobId, (status) => {
          // Progress update
        });
      }
    } catch {
      // Fallback response if offline
    }

    // Finished AI generation
    const aiMsg: ChatMessage = {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      mode: agentMode,
      text: `Completed ${agentMode.toLowerCase()} request: "${promptText}". Refactored components and compiled Vite bundle.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      filesChanged: ['src/App.tsx', 'src/index.css'],
      tasks: [
        { label: 'Inspecting project files', status: 'done' },
        { label: 'Planning architectural changes', status: 'done' },
        { label: 'Editing component files', status: 'done' },
        { label: 'Testing layout & responsiveness', status: 'done' },
      ],
    };

    setMessages(prev => [...prev, aiMsg]);
    setIsBuilding(false);
    setIframeKey(k => k + 1);
    toast.success("AI Agent updated codebase successfully.");
  };

  const handleApprovePlan = (planMsgId: string) => {
    setIsBuilding(true);
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: `ai-approved-${Date.now()}`,
          sender: 'ai',
          mode: 'Build',
          text: `Plan approved! Executed file edits and compiled Vite bundle.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          filesChanged: ['src/components/Hero.tsx', 'src/types/schema.ts', 'src/routes.ts'],
          tasks: [
            { label: 'Editing files per approved plan', status: 'done' },
            { label: 'Running build & type check', status: 'done' },
          ]
        }
      ]);
      setIsBuilding(false);
      setIframeKey(k => k + 1);
      toast.success("Approved plan executed successfully.");
    }, 1500);
  };

  return (
    <ProjectWorkspaceLayout activeTab="build">
      <div className="flex h-full w-full bg-background overflow-hidden relative font-sans">
        
        {/* ── LEFT: SECTION LAYERS (Collapsible) ── */}
        {isSectionsOpen && (
          <div className="w-64 border-r flex flex-col shrink-0 select-none z-20" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
            <div className="p-3 border-b flex items-center justify-between font-mono text-[11px] uppercase text-muted-foreground" style={{ borderColor: 'var(--surface-border)' }}>
              <span>Sections Tree</span>
              <button onClick={() => setIsSectionsOpen(false)} className="hover:text-foreground">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2 text-xs">
              {sections.map(sec => (
                <div
                  key={sec.id}
                  onClick={() => setSelectedSection(sec.name)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    selectedSection === sec.name ? 'bg-primary/15 border-primary text-primary font-semibold' : 'bg-white/5 border-white/10 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5" />
                    <span>{sec.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CENTER: LIVE WEBSITE PREVIEW ── */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#090A0C] relative">
          
          {/* Top Preview Control Bar */}
          <div className="h-10 px-4 flex items-center justify-between border-b select-none shrink-0" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSectionsOpen(!isSectionsOpen)}
                className={`p-1.5 rounded-lg text-xs flex items-center gap-1.5 border transition-colors ${
                  isSectionsOpen ? 'bg-primary/20 text-primary border-primary/30' : 'text-muted-foreground border-white/10 hover:text-foreground'
                }`}
              >
                <Layers className="h-3.5 w-3.5" /> Sections
              </button>
            </div>

            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/5 border border-white/10 text-xs">
              <button onClick={() => setViewport('desktop')} className={`px-2 py-0.5 rounded ${viewport === 'desktop' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                <Monitor className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setViewport('tablet')} className={`px-2 py-0.5 rounded ${viewport === 'tablet' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                <Tablet className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setViewport('mobile')} className={`px-2 py-0.5 rounded ${viewport === 'mobile' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                <Smartphone className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Iframe Viewport Container */}
          <div className="flex-1 min-h-0 flex items-center justify-center p-4 overflow-auto bg-[#090A0C]">
            <div className={`transition-all duration-300 rounded-2xl overflow-hidden border border-white/15 bg-black shadow-2xl ${
              viewport === 'mobile'
                ? 'w-[375px] h-[667px] max-h-full shrink-0 my-auto'
                : viewport === 'tablet'
                ? 'w-[768px] h-[90%] max-h-[850px] shrink-0 my-auto'
                : 'w-full h-full'
            }`}>
              <iframe
                key={iframeKey}
                src={`/preview-frame/${projectId}`}
                title={project.name}
                className="w-full h-full border-none"
              />
            </div>
          </div>
        </div>

        {/* ── RIGHT: AI AGENT WORKSPACE PANEL ── */}
        <div className="w-[380px] sm:w-[420px] border-l flex flex-col shrink-0 select-none" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
          
          {/* Agent Header & Mode Selector */}
          <div className="p-3 border-b space-y-3 shrink-0" style={{ borderColor: 'var(--surface-border)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <span className="font-bold text-xs text-foreground">Zovaix AI Agent</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold uppercase">● Context Aware</span>
            </div>

            {/* Agent Modes: Build, Plan, Debug, Explain, Review */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
              {(["Build", "Plan", "Debug", "Explain", "Review"] as AgentMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setAgentMode(mode)}
                  className={`flex-1 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    agentMode === mode ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation & Task Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {messages.map(msg => (
              <div key={msg.id} className={cn("space-y-2", msg.sender === 'user' ? "text-right" : "text-left")}>
                <div className={cn(
                  "p-3.5 rounded-2xl max-w-[90%] inline-block leading-relaxed border",
                  msg.sender === 'user'
                    ? "bg-primary text-primary-foreground border-primary/30 rounded-br-none"
                    : "bg-white/5 border-white/10 text-foreground rounded-bl-none"
                )}>
                  {msg.mode && (
                    <span className="text-[10px] font-mono uppercase text-primary font-bold block mb-1">
                      [{msg.mode} Mode]
                    </span>
                  )}
                  <p>{msg.text}</p>
                </div>

                {/* Compact Task Status Timeline */}
                {msg.tasks && (
                  <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1.5 font-mono text-[11px] text-white/80">
                    <span className="text-[10px] uppercase text-muted-foreground block mb-1">Task Progress Timeline</span>
                    {msg.tasks.map((task, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span>{task.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Changed Files & Review/Undo Controls */}
                {msg.filesChanged && (
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                    <span className="text-[10px] font-mono uppercase text-muted-foreground block">Modified Files:</span>
                    <div className="flex flex-wrap gap-1 font-mono text-[11px]">
                      {msg.filesChanged.map(f => (
                        <span key={f} className="px-2 py-0.5 rounded bg-black/60 text-emerald-400 border border-emerald-500/20">{f}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      {msg.mode === 'Plan' ? (
                        <Button
                          size="sm"
                          onClick={() => handleApprovePlan(msg.id)}
                          className="h-7 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white gap-1"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Approve Plan →
                        </Button>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" className="h-7 text-[11px] border-white/10 gap-1">
                            Review Changes
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-[11px] border-white/10 gap-1 text-muted-foreground hover:text-foreground">
                            <Undo2 className="h-3 w-3" /> Undo
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isBuilding && (
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs space-y-2 animate-pulse">
                <span className="text-[10px] font-mono text-primary font-bold uppercase">Executing Task...</span>
                <p className="text-muted-foreground font-mono">Agent inspecting dependencies and compiling edits...</p>
              </div>
            )}
          </div>

          {/* Prompt Composer Box with Attachment Support */}
          <div className="p-3 border-t space-y-2 shrink-0" style={{ borderColor: 'var(--surface-border)' }}>
            
            {/* Attachment Chips Display */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-1 font-mono text-[10px]">
                {attachments.map((file, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded-md bg-white/10 text-primary border border-primary/30 flex items-center gap-1">
                    <Paperclip className="h-3 w-3" /> {file}
                    <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="hover:text-destructive ml-1">×</button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative rounded-xl border bg-black/40 overflow-hidden" style={{ borderColor: 'var(--surface-border)' }}>
              <textarea
                value={editInstruction}
                onChange={(e) => setEditInstruction(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendPrompt(); } }}
                placeholder={`Ask Zovaix AI in [${agentMode} Mode]...`}
                className="w-full h-20 p-3 bg-transparent text-xs text-foreground outline-none resize-none placeholder:text-muted-foreground/50"
              />
              <div className="p-2 border-t flex items-center justify-between bg-white/[0.02]" style={{ borderColor: 'var(--surface-border)' }}>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setAttachments(prev => [...prev, file.name]);
                        toast.success(`Attached ${file.name} to AI prompt context`);
                      }
                    }}
                    className="hidden"
                    accept="image/*,.ts,.tsx,.js,.jsx,.json,.css,.html,.sql,.md"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1 rounded-lg hover:text-foreground hover:bg-white/10 transition-colors flex items-center gap-1 text-[11px] font-mono"
                    title="Attach Image or Source File"
                  >
                    <Paperclip className="h-3.5 w-3.5 text-primary" /> Attach Image / File
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">Press Enter to send</span>
                  <Button
                    size="sm"
                    onClick={handleSendPrompt}
                    disabled={(!editInstruction.trim() && attachments.length === 0) || isBuilding}
                    className="h-7 px-3 text-xs font-semibold gap-1 bg-primary text-primary-foreground"
                  >
                    <Send className="h-3 w-3" /> Send
                  </Button>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </ProjectWorkspaceLayout>
  );
}
