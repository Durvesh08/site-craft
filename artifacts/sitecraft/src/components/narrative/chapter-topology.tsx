import { Globe, Server, ShieldCheck, Zap, CheckCircle2 } from "lucide-react";

export function ChapterTopology() {
  const edgeLocations = [
    { city: "San Francisco (us-west)", ping: "8ms", status: "Active" },
    { city: "Frankfurt (eu-central)", ping: "14ms", status: "Active" },
    { city: "Tokyo (ap-northeast)", ping: "18ms", status: "Active" },
    { city: "Singapore (ap-southeast)", ping: "22ms", status: "Active" },
    { city: "São Paulo (sa-east)", ping: "28ms", status: "Active" },
  ];

  return (
    <div className="w-full min-h-screen py-32 px-6 flex flex-col items-center justify-center relative z-10">
      
      <div className="max-w-4xl text-center space-y-6 mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/30 text-xs font-mono font-bold tracking-widest uppercase">
          <Globe className="h-3.5 w-3.5" /> CHAPTER V — ANYCAST EDGE TOPOLOGY
        </div>
        <h2 className="text-5xl sm:text-7xl font-black tracking-tighter text-foreground leading-none">
          Deploy to 320 Edge Nodes.<br />
          <span className="text-gradient-primary">Zero Configuration.</span>
        </h2>
        <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
          One click deploys your AI-synthesized application to Vercel, Netlify, Cloudflare, or your custom domain with automated SSL.
        </p>
      </div>

      <div className="w-full max-w-6xl p-8 rounded-3xl glass border border-white/10 space-y-8 shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-secondary/30 border border-border/50 space-y-2">
            <span className="text-xs font-mono text-muted-foreground">01. ENGINE HOSTING</span>
            <p className="font-bold text-foreground">Vercel & Netlify Edge</p>
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> SSL Auto-Renew
            </span>
          </div>

          <div className="p-6 rounded-2xl bg-primary/10 border border-primary/30 space-y-2">
            <span className="text-xs font-mono text-primary font-bold">02. ANYCAST ROUTER</span>
            <p className="font-bold text-primary">320 PoPs Worldwide</p>
            <span className="text-xs text-primary font-bold">99ms Global Latency</span>
          </div>

          <div className="p-6 rounded-2xl bg-secondary/30 border border-border/50 space-y-2">
            <span className="text-xs font-mono text-muted-foreground">03. SECURITY SHIELD</span>
            <p className="font-bold text-foreground">Cloudflare Enterprise</p>
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> DDoS Protection
            </span>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6">
          <h4 className="text-xs font-mono text-muted-foreground uppercase mb-4">Edge Node Health Telemetry</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 font-mono text-xs">
            {edgeLocations.map((edge) => (
              <div key={edge.city} className="p-3 rounded-xl bg-secondary/20 border border-white/5 flex flex-col gap-1">
                <span className="text-foreground font-bold truncate">{edge.city}</span>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="text-emerald-400 font-bold">{edge.ping}</span>
                  <span>{edge.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
