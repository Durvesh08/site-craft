import { ReactNode } from "react";
import { Globe, Lock, ShieldCheck, Sparkles, Monitor, Tablet, Smartphone } from "lucide-react";
import { useState } from "react";

interface BrowserMockupProps {
  children: ReactNode;
  url?: string;
  className?: string;
}

export function BrowserMockup({ children, url = "https://app.sitecraft.ai/preview", className = "" }: BrowserMockupProps) {
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  return (
    <div className={`w-full glass-panel border border-white/15 rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 hover:border-primary/40 ${className}`}>
      
      {/* Mac Window Header */}
      <div className="flex items-center justify-between px-5 h-12 border-b border-white/10 bg-secondary/40 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500/80 shadow-sm" />
          <div className="h-3 w-3 rounded-full bg-amber-500/80 shadow-sm" />
          <div className="h-3 w-3 rounded-full bg-emerald-500/80 shadow-sm" />
        </div>

        {/* URL Bar */}
        <div className="flex items-center gap-2 px-4 py-1 rounded-xl bg-background/60 border border-border/50 font-mono text-xs text-muted-foreground w-1/2 justify-center shadow-inner">
          <Lock className="h-3 w-3 text-emerald-500" />
          <span className="truncate text-foreground/90 font-medium">{url}</span>
        </div>

        {/* Device Switchers */}
        <div className="flex items-center gap-1 bg-background/40 rounded-lg p-1 border border-border/40">
          <button
            onClick={() => setDevice("desktop")}
            className={`p-1 rounded-md text-xs transition-colors ${device === "desktop" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            title="Desktop view"
          >
            <Monitor className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setDevice("tablet")}
            className={`p-1 rounded-md text-xs transition-colors ${device === "tablet" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            title="Tablet view"
          >
            <Tablet className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setDevice("mobile")}
            className={`p-1 rounded-md text-xs transition-colors ${device === "mobile" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            title="Mobile view"
          >
            <Smartphone className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Browser Body Container */}
      <div className={`transition-all duration-500 mx-auto overflow-hidden ${device === "tablet" ? "max-w-[768px]" : device === "mobile" ? "max-w-[390px]" : "w-full"}`}>
        {children}
      </div>
    </div>
  );
}
