import { useState } from "react";
import { Globe, CheckCircle2, AlertCircle, Copy, ExternalLink, RefreshCw, Shield, Server, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function DnsManager() {
  const [domain, setDomain] = useState("app.mybrand.com");
  const [checking, setChecking] = useState(false);
  const [verified, setVerified] = useState(true);

  const dnsRecords = [
    { type: "CNAME", host: "@", value: "cname.sitecraft-cdn.com", status: "Valid", ttl: "Automatic" },
    { type: "A", host: "@", value: "76.76.21.21", status: "Valid", ttl: "3600" },
    { type: "TXT", host: "_sitecraft-challenge", value: "vc-domain-verify-8f921a48c", status: "Valid", ttl: "3600" },
  ];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleVerify = () => {
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      setVerified(true);
      toast.success("DNS Records verified! SSL Certificate issued.");
    }, 1500);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Domain Input & Verification Header */}
      <div className="glass-panel p-8 rounded-3xl border border-white/10 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-mono font-semibold mb-2">
              <Globe className="h-3.5 w-3.5" /> ENTERPRISE DNS VERIFICATION SUITE
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Production Custom Domains</h2>
            <p className="text-sm text-muted-foreground">Configure custom DNS routing with automated SSL wildcard certificates.</p>
          </div>
          <Button onClick={handleVerify} disabled={checking} className="h-11 px-6 rounded-xl font-bold gap-2 btn-magnetic">
            <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Checking Propagation..." : "Re-check DNS Propagation"}
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="e.g. app.yourcompany.com"
            className="h-12 rounded-xl bg-secondary/30 border-border/50 font-mono text-sm"
          />
          <Button variant="outline" className="h-12 px-6 rounded-xl font-semibold border-border/50">
            Update Target Domain
          </Button>
        </div>
      </div>

      {/* Visual DNS Routing Diagram */}
      <div className="glass-panel p-8 rounded-3xl border border-white/10 space-y-6">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Server className="h-5 w-5 text-primary" /> Visual Traffic Topology
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="p-6 rounded-2xl bg-secondary/30 border border-border/50 space-y-2">
            <span className="text-xs font-mono text-muted-foreground">01. DOMAIN REGISTRAR</span>
            <p className="font-bold text-foreground">{domain}</p>
            <span className="text-xs text-emerald-500 font-medium">Nameservers Configured</span>
          </div>

          <div className="p-6 rounded-2xl bg-primary/10 border border-primary/30 space-y-2">
            <span className="text-xs font-mono text-primary font-bold">02. SITECRAFT ANYCAST CDN</span>
            <p className="font-bold text-primary">Global Edge Network</p>
            <span className="text-xs text-primary font-medium">320 Edge Locations</span>
          </div>

          <div className="p-6 rounded-2xl bg-secondary/30 border border-border/50 space-y-2">
            <span className="text-xs font-mono text-muted-foreground">03. SSL SECURITY</span>
            <p className="font-bold text-foreground">Let's Encrypt Wildcard</p>
            <span className="text-xs text-emerald-500 font-medium">TLS 1.3 Active</span>
          </div>
        </div>
      </div>

      {/* Required DNS Records Table */}
      <div className="glass-panel p-8 rounded-3xl border border-white/10 space-y-6">
        <h3 className="text-lg font-bold text-foreground">Required DNS Records</h3>
        <p className="text-sm text-muted-foreground">Add these records to your DNS provider (Cloudflare, GoDaddy, Namecheap, Route53).</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-xs font-mono text-muted-foreground uppercase">
                <th className="p-3">Type</th>
                <th className="p-3">Host / Name</th>
                <th className="p-3">Target Value</th>
                <th className="p-3">TTL</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-xs">
              {dnsRecords.map((record, i) => (
                <tr key={i} className="hover:bg-secondary/20 transition-colors">
                  <td className="p-3 font-bold text-primary">{record.type}</td>
                  <td className="p-3 text-foreground">{record.host}</td>
                  <td className="p-3 text-muted-foreground truncate max-w-[200px]">{record.value}</td>
                  <td className="p-3 text-muted-foreground">{record.ttl}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 text-emerald-500 font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {record.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleCopy(record.value)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      title="Copy Value"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
