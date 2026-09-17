import React, { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ProjectWorkspaceLayout } from "./project-workspace-layout";
import { useGetProject, useListProjects } from "@workspace/api-client-react";
import {
  Terminal as TerminalIcon,
  Play,
  Trash2,
  Sparkles,
  CheckCircle2,
  FolderTree,
  Rocket,
  HelpCircle,
  Folder
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface LogEntry {
  id: string;
  type: "info" | "success" | "warning" | "error" | "command";
  text: string;
  timestamp: string;
}

export default function ProjectTerminalPage() {
  const { id } = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const isProjectContext = Boolean(id);

  const { data: projectsData } = useListProjects();
  const rawProjects = (projectsData?.projects || []) as any[];

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const activeProjectId = id || selectedProjectId || rawProjects[0]?.id || "lumina";

  const { data: projectData } = useGetProject(activeProjectId);
  const activeProjectName = (projectData as any)?.name || rawProjects.find(p => p.id === activeProjectId)?.name || activeProjectId;

  const [input, setInput] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: "init-1",
      type: "info",
      text: "Zovaix Autonomous Shell & Terminal (Edge VFS v2.0)",
      timestamp: new Date().toLocaleTimeString(),
    },
    {
      id: "init-2",
      type: "success",
      text: `Connected to workspace: ${activeProjectName} (/workspace/projects/${activeProjectId})`,
      timestamp: new Date().toLocaleTimeString(),
    },
    {
      id: "init-3",
      type: "info",
      text: "Type 'help' for available commands or 'ai <prompt>' to ask the Gemini autonomous brain.",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (type: LogEntry["type"], text: string) => {
    setLogs((prev) => [
      ...prev,
      {
        id: `log-${Date.now()}-${Math.random()}`,
        type,
        text,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const runCommand = async (cmdToRun?: string) => {
    const cmd = (cmdToRun || input).trim();
    if (!cmd || isExecuting) return;

    setInput("");
    addLog("command", `$ ${cmd}`);
    setIsExecuting(true);

    const parts = cmd.split(/\s+/);
    const primary = parts[0].toLowerCase();

    // Client-side quick handlers
    if (primary === "clear" || primary === "cls") {
      setLogs([]);
      setIsExecuting(false);
      return;
    }

    if (primary === "export") {
      const format = (parts[1] || "react").toLowerCase();
      addLog("info", `[Export] Preparing ${format.toUpperCase()} project bundle...`);
      const a = document.createElement("a");
      a.href = `/api/projects/${activeProjectId}/export/${format}`.replace(/\/export\/html$/, "/export");
      a.setAttribute("download", `${activeProjectId}-${format}.zip`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addLog("success", `[Export] Download started for ${activeProjectId}-${format}.zip`);
      setIsExecuting(false);
      return;
    }

    try {
      const res = await fetch(`/api/projects/${activeProjectId}/terminal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ command: cmd }),
      });

      if (res.ok) {
        const data = await res.json();
        const type = data.exitCode === 0 ? "info" : "error";
        addLog(type, data.output || "Done.");
      } else {
        const errData = await res.json().catch(() => ({}));
        addLog("error", errData.message || "Failed to execute command on server.");
      }
    } catch (err: any) {
      addLog("error", `Connection failed: ${err.message || String(err)}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const quickCommands = [
    { label: "Vite Build", cmd: "build", icon: Play },
    { label: "Install Package", cmd: "npm install recharts", icon: Sparkles },
    { label: "File Tree", cmd: "tree", icon: FolderTree },
    { label: "Directory List", cmd: "ls -la", icon: TerminalIcon },
    { label: "Project Status", cmd: "status", icon: CheckCircle2 },
    { label: "Deploy Edge", cmd: "deploy", icon: Rocket },
    { label: "Help Manual", cmd: "help", icon: HelpCircle },
  ];

  const terminalContent = (
    <div className="flex flex-col h-full bg-[#0b0c10] text-foreground font-sans overflow-hidden rounded-2xl border" style={{ borderColor: "var(--surface-border)" }}>
      
      {/* Terminal Header Bar */}
      <div className="h-14 px-4 sm:px-6 flex items-center justify-between border-b shrink-0" style={{ background: "var(--surface-1)", borderColor: "var(--surface-border)" }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <TerminalIcon className="h-5 w-5 text-primary" />
            <h1 className="font-bold text-sm sm:text-base text-foreground">Autonomous Terminal & Shell</h1>
          </div>

          {/* Project Switcher Selector */}
          {rawProjects.length > 0 && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
              <Folder className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={activeProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  if (isProjectContext) {
                    setLocation(`/projects/${e.target.value}/terminal`);
                  }
                }}
                className="bg-black/50 border border-white/10 text-xs rounded-lg px-2 py-1 text-foreground font-medium outline-none focus:border-primary/50"
              >
                {rawProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setLogs([])}
            className="h-8 text-xs gap-1.5 border-white/10 text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </Button>
          <Button
            size="sm"
            onClick={() => runCommand("help")}
            className="h-8 text-xs gap-1.5 bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30"
          >
            <HelpCircle className="h-3.5 w-3.5" /> Help
          </Button>
        </div>
      </div>

      {/* Quick Command Pills Bar */}
      <div className="px-4 py-2.5 flex items-center gap-2 overflow-x-auto border-b bg-black/40 shrink-0" style={{ borderColor: "var(--surface-border)" }}>
        <span className="text-[11px] font-medium text-muted-foreground shrink-0 flex items-center gap-1 mr-1">
          <Sparkles className="h-3 w-3 text-primary" /> Quick actions:
        </span>
        {quickCommands.map((q) => {
          const Icon = q.icon;
          return (
            <button
              key={q.cmd}
              onClick={() => runCommand(q.cmd)}
              disabled={isExecuting}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 hover:text-white transition-all shrink-0 active:scale-95"
            >
              <Icon className="h-3 w-3 text-primary" />
              <span>{q.label}</span>
            </button>
          );
        })}
      </div>

      {/* Terminal Log Output Window */}
      <div
        ref={scrollRef}
        onClick={() => inputRef.current?.focus()}
        className="flex-1 p-4 sm:p-6 overflow-y-auto font-mono text-xs leading-relaxed space-y-1.5 select-text cursor-text"
      >
        {logs.map((log) => {
          let color = "text-white/80";
          if (log.type === "command") color = "text-primary font-bold";
          else if (log.type === "success") color = "text-emerald-400";
          else if (log.type === "warning") color = "text-amber-400";
          else if (log.type === "error") color = "text-rose-400";

          return (
            <div key={log.id} className="flex items-start gap-2 group">
              <span className="text-white/20 text-[10px] select-none shrink-0 group-hover:text-white/40 transition-colors">
                {log.timestamp}
              </span>
              <pre className={`flex-1 whitespace-pre-wrap font-mono ${color}`}>
                {log.text}
              </pre>
            </div>
          );
        })}

        {isExecuting && (
          <div className="flex items-center gap-2 text-primary font-mono text-xs py-1">
            <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
            <span>Executing command in Edge VFS...</span>
          </div>
        )}
      </div>

      {/* Command Input Prompt Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runCommand();
        }}
        className="p-3 sm:p-4 border-t bg-black/70 flex items-center gap-2 shrink-0"
        style={{ borderColor: "var(--surface-border)" }}
      >
        <div className="flex items-center gap-1.5 text-primary font-mono font-bold text-xs pl-2">
          <span>zovaix</span>
          <span className="text-white/40">❯</span>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isExecuting}
          placeholder="Type a command (e.g. 'help', 'npm install recharts', 'ls', 'tree', 'ai add dark mode')..."
          className="flex-1 bg-transparent border-0 outline-none text-xs font-mono text-white placeholder-white/30"
          autoFocus
        />

        <Button
          type="submit"
          size="sm"
          disabled={!input.trim() || isExecuting}
          className="h-9 px-4 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl"
        >
          <Play className="h-3 w-3 fill-current" /> Run
        </Button>
      </form>

    </div>
  );

  if (isProjectContext) {
    return <ProjectWorkspaceLayout activeTab="terminal">{terminalContent}</ProjectWorkspaceLayout>;
  }

  return (
    <div className="h-[calc(100vh-120px)] w-full">
      {terminalContent}
    </div>
  );
}
