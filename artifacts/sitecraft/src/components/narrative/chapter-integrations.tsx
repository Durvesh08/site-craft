import { Cloud, Github, Globe, Server, Cpu, ShieldCheck, Zap } from "lucide-react";

export function ChapterIntegrations() {
  const integrations = [
    { name: "Vercel Edge", type: "Serverless Deployment", status: "Connected", ping: "8ms", icon: Cloud, color: "text-blue-400" },
    { name: "GitHub Actions", type: "CI/CD Pipeline Sync", status: "Connected", ping: "12ms", icon: Github, color: "text-purple-400" },
    { name: "Cloudflare DNS", type: "Anycast Edge & SSL", status: "Connected", ping: "6ms", icon: Globe, color: "text-amber-400" },
    { name: "Netlify Hosting", type: "Static CDN Build", status: "Connected", ping: "14ms", icon: Server, color: "text-emerald-400" },
  ];

  return (
    <div className="w-full min-h-screen py-32 px-6 flex flex-col items-center justify-center relative z-10">
      
      <div className="max-w-4xl text-center space-y-6 mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/30 text-xs font-mono font-bold tracking-widest uppercase">
          <Zap className="h-3.5 w-3.5" /> CHAPTER IX — ENTERPRISE INTEGRATIONS
        </div>
        <h2 className="text-5xl sm:text-7xl font-black tracking-tighter text-foreground leading-none">
          Everything Is Connected.<br />
          <span className="text-gradient-primary">Zero Lock-In.</span>
        </h2>
        <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
          Export your source code anytime or push directly to Vercel, GitHub Pages, Netlify, or custom VPS servers.
        </p>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {integrations.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.name} className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col justify-between space-y-6 hover:border-primary/40 transition-all duration-300 hover:-translate-y-2">
              <div className="space-y-4">
                <div className={`h-12 w-12 rounded-2xl bg-secondary/80 flex items-center justify-center border border-white/10 ${item.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground">{item.name}</h4>
                  <p className="text-xs text-muted-foreground font-mono">{item.type}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono border-t border-white/5 pt-4">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> {item.status}
                </span>
                <span className="text-muted-foreground">{item.ping}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
