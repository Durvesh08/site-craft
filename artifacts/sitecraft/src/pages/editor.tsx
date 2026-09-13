import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { ProjectWorkspaceLayout } from "./project-workspace-layout";
import { useGetProject } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Monitor, Tablet, Smartphone, Sparkles, Send,
  Layers, Paperclip, CheckCircle2, Undo2, Loader2,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Viewport = "desktop" | "tablet" | "mobile";
type AgentMode = "Build" | "Plan" | "Debug" | "Explain" | "Review";

interface TaskStep {
  label: string;
  status: 'done' | 'active' | 'pending' | 'failed';
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  mode?: AgentMode;
  text: string;
  timestamp: string;
  tasks?: TaskStep[];
  isError?: boolean;
}

interface ParsedSection {
  id: string;
  name: string;
  type: string;
}

// Contextual thinking messages that cycle during AI processing
const THINKING_MESSAGES = [
  "Understanding your request...",
  "Analyzing current design...",
  "Planning improvements...",
  "Detecting affected sections...",
  "Generating layout changes...",
  "Optimizing responsiveness...",
  "Reviewing design quality...",
  "Applying changes...",
];

export default function ProjectEditor() {
  const { id } = useParams<{ id?: string }>();
  const projectId = id || 'lumina';
  const { data, refetch: refetchProject } = useGetProject(projectId);
  
  const rawProject = data || {
    id: projectId,
    name: projectId,
    domain: `${projectId}.site.zovaix.com`,
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
  const chatEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [isSectionsOpen, setIsSectionsOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  // Agent States
  const [agentMode, setAgentMode] = useState<AgentMode>("Build");
  const [editInstruction, setEditInstruction] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [thinkingIdx, setThinkingIdx] = useState(0);

  // Dynamic sections parsed from the real generated HTML
  const [sections, setSections] = useState<ParsedSection[]>([]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'ai',
      mode: 'Build',
      text: `Hello! I'm the Zovaix AI Agent. I've synthesized the initial codebase for ${project.name}. Describe what changes you'd like to make.`,
      timestamp: 'Just now',
    },
  ]);

  // Parse sections from the project's generated HTML
  const parseSectionsFromHtml = useCallback((html: string | null | undefined): ParsedSection[] => {
    if (!html) return [];
    const parsed: ParsedSection[] = [];
    let match: RegExpExecArray | null;

    // Strategy 1: component markers  // ── Type (ComponentName) ──
    const markerRegex = /<!-- ── (\w+(?:\s*\w+)*)\s*\(([^)]+)\)\s*──/g;
    while ((match = markerRegex.exec(html)) !== null) {
      parsed.push({ id: match[2], name: match[2].replace(/Section$/, '').replace(/([A-Z])/g, ' $1').trim(), type: match[1] });
    }
    if (parsed.length > 0) return parsed;

    // Strategy 2: <section id="...">
    const sectionTagRegex = /<section[^>]*\bid=["']([^"']+)["'][^>]*>/gi;
    while ((match = sectionTagRegex.exec(html)) !== null) {
      parsed.push({ id: match[1], name: match[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), type: 'section' });
    }
    if (parsed.length > 0) return parsed;

    // Strategy 3: common div ids
    const divRegex = /<div[^>]*\bid=["']((?:hero|features?|pricing|about|contact|testimonials?|faq|cta|footer|header|services?|portfolio|team|blog|gallery)[^"']*)["'][^>]*>/gi;
    while ((match = divRegex.exec(html)) !== null) {
      parsed.push({ id: match[1], name: match[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), type: 'div-section' });
    }
    return parsed;
  }, []);

  // Update sections whenever project data changes
  useEffect(() => {
    if (data?.generatedHtml) {
      const parsed = parseSectionsFromHtml(data.generatedHtml);
      if (parsed.length > 0) {
        setSections(parsed);
        if (!selectedSection) setSelectedSection(parsed[0].id);
      }
    }
  }, [data?.generatedHtml, parseSectionsFromHtml, selectedSection]);

  // Cycle thinking messages while building
  useEffect(() => {
    if (!isBuilding) return;
    const timer = setInterval(() => setThinkingIdx(prev => (prev + 1) % THINKING_MESSAGES.length), 2500);
    return () => clearInterval(timer);
  }, [isBuilding]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isBuilding]);

  // Scroll iframe to a section
  const scrollToSection = (sectionId: string) => {
    setSelectedSection(sectionId);
    iframeRef.current?.contentWindow?.postMessage({ type: 'scrollToSection', sectionId }, '*');
  };

  // Poll a job until completion
  const pollJob = async (jobId: string, onStep: (stepName: string) => void): Promise<boolean> => {
    const maxWait = 120_000;
    const start = Date.now();
    while (Date.now() - start < maxWait) {
      try {
        const res = await fetch(`/api/jobs/${jobId}`, { credentials: 'include' });
        if (!res.ok) break;
        const job = await res.json();
        if (job.currentStep) onStep(job.currentStep);
        if (job.status === 'completed') return true;
        if (job.status === 'failed') throw new Error(job.error || 'AI generation failed');
      } catch (err) {
        if ((err as Error).message?.includes('failed')) throw err;
      }
      await new Promise(r => setTimeout(r, 1500));
    }
    throw new Error('Generation timed out');
  };

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
    setThinkingIdx(0);

    const realSteps: TaskStep[] = [];
    let lastStepName = "";

    try {
      // 1. Send chat-edit to the real backend
      const res = await fetch(`/api/projects/${projectId}/chat-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: promptText }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as any).message || `Server error ${res.status}`);
      }

      const { id: jobId } = await res.json();
      if (!jobId) throw new Error('No job ID returned from server');

      // 2. Poll for real progress
      await pollJob(jobId, (stepName) => {
        if (stepName !== lastStepName) {
          if (realSteps.length > 0) realSteps[realSteps.length - 1].status = 'done';
          realSteps.push({ label: stepName, status: 'active' });
          lastStepName = stepName;
        }
      });

      // Mark final step done
      if (realSteps.length > 0) realSteps[realSteps.length - 1].status = 'done';

      // 3. Refetch project to get updated generatedHtml
      const { data: freshProject } = await refetchProject();
      if (freshProject?.generatedHtml) {
        const newSections = parseSectionsFromHtml(freshProject.generatedHtml);
        if (newSections.length > 0) setSections(newSections);
      }

      // 4. Refresh the iframe
      setIframeKey(k => k + 1);

      // 5. Real AI response
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        mode: agentMode,
        text: `Done! I've applied your changes. The preview has been updated.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tasks: realSteps.length > 0 ? realSteps : [
          { label: 'Intent Analysis', status: 'done' },
          { label: 'Targeted Regeneration', status: 'done' },
          { label: 'Quality Check', status: 'done' },
        ],
      };
      setMessages(prev => [...prev, aiMsg]);
      toast.success("AI Agent updated your website successfully.");

    } catch (err: any) {
      if (realSteps.length > 0 && realSteps[realSteps.length - 1].status === 'active') {
        realSteps[realSteps.length - 1].status = 'failed';
      }
      const errorMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        mode: agentMode,
        text: `Something went wrong: ${err.message || 'Unknown error'}. Please try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tasks: realSteps.length > 0 ? realSteps : undefined,
        isError: true,
      };
      setMessages(prev => [...prev, errorMsg]);
      toast.error("AI edit failed. Please try again.");
    }

    setIsBuilding(false);
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
              {sections.length > 0 ? sections.map(sec => (
                <div
                  key={sec.id}
                  onClick={() => scrollToSection(sec.id)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    selectedSection === sec.id ? 'bg-primary/15 border-primary text-primary font-semibold' : 'bg-white/5 border-white/10 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5" />
                    <span>{sec.name}</span>
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground/60 ml-6">{sec.type}</span>
                </div>
              )) : (
                <div className="text-center text-muted-foreground/60 py-6 space-y-2">
                  <Layers className="h-6 w-6 mx-auto opacity-40" />
                  <p className="text-[11px]">Sections will appear after your website is generated.</p>
                </div>
              )}
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
                ref={iframeRef}
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
                    : msg.isError
                    ? "bg-red-500/10 border-red-500/30 text-foreground rounded-bl-none"
                    : "bg-white/5 border-white/10 text-foreground rounded-bl-none"
                )}>
                  {msg.mode && (
                    <span className="text-[10px] font-mono uppercase text-primary font-bold block mb-1">
                      [{msg.mode} Mode]
                    </span>
                  )}
                  {msg.isError && (
                    <span className="text-[10px] font-mono uppercase text-red-400 font-bold block mb-1">
                      <AlertCircle className="h-3 w-3 inline mr-1" />Error
                    </span>
                  )}
                  <p>{msg.text}</p>
                </div>

                {/* Task Status Timeline */}
                {msg.tasks && (
                  <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1.5 font-mono text-[11px] text-white/80">
                    <span className="text-[10px] uppercase text-muted-foreground block mb-1">Pipeline Progress</span>
                    {msg.tasks.map((task, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {task.status === 'done' ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        ) : task.status === 'failed' ? (
                          <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                        ) : task.status === 'active' ? (
                          <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-full border border-white/20 shrink-0" />
                        )}
                        <span className={cn(
                          task.status === 'failed' && 'text-red-400',
                          task.status === 'active' && 'text-primary'
                        )}>
                          {task.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Undo Controls */}
                {msg.sender === 'ai' && !msg.isError && msg.tasks && (
                  <div className="flex items-center gap-2 pt-1">
                    <Button size="sm" variant="outline" className="h-7 text-[11px] border-white/10 gap-1 text-muted-foreground hover:text-foreground">
                      <Undo2 className="h-3 w-3" /> Undo
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {/* Live thinking indicator */}
            {isBuilding && (
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                  <span className="text-[10px] font-mono text-primary font-bold uppercase">Working...</span>
                </div>
                <p className="text-muted-foreground font-mono transition-opacity duration-300">
                  {THINKING_MESSAGES[thinkingIdx]}
                </p>
              </div>
            )}

            <div ref={chatEndRef} />
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
                disabled={isBuilding}
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
                    disabled={isBuilding}
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
                    {isBuilding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    {isBuilding ? 'Working...' : 'Send'}
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
