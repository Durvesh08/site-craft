import { useState, useEffect } from "react";
import { Terminal, CheckCircle2, Cpu, Sparkles, ShieldCheck, Zap } from "lucide-react";

export function ActivityStream() {
  const [logs, setLogs] = useState<Array<{ id: string; time: string; text: string; status: "success" | "info" | "warning" }>>([
    { id: "1", time: "Just now", text: "UX Agent computed 8-section layout tree", status: "success" },
    { id: "2", time: "1m ago", text: "Framer Motion engine synthesized glassmorphism tokens", status: "info" },
    { id: "3", time: "3m ago", text: "SEO Audit Agent verified WAI-ARIA contrast ratios (99%)", status: "success" },
    { id: "4", time: "5m ago", text: "Edge CDN DNS check passed for production route", status: "info" },
  ]);

  useEffect(() => {
    const events = [
      "Copywriter Agent generated high-conversion headline vectors",
      "React Architect synthesized Radix UI primitives",
      "Tailwind JIT compiled glass utility classes",
      "Meta Pixel header code injected into index.html <head>",
    ];

    const timer = setInterval(() => {
      const randomEvent = events[Math.floor(Math.random() * events.length)];
      setLogs((prev) => [
        {
          id: Date.now().toString(),
          time: "Just now",
          text: randomEvent,
          status: "success",
        },
        ...prev.slice(0, 4),
      ]);
    }, 6000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Terminal className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Real-time Agent Telemetry</h3>
            <p className="text-xs text-muted-foreground">Live operations across workspace</p>
          </div>
        </div>
        <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
      </div>

      <div className="space-y-3 font-mono text-xs">
        {logs.map((log) => (
          <div key={log.id} className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/30 border border-border/40 animate-fade-in">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span className="truncate text-foreground/90">{log.text}</span>
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{log.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
