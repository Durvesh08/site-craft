import { useState } from "react";
import { Globe, CheckCircle2, Copy, RefreshCw, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function DnsManager() {
  const [domain, setDomain] = useState("app.mybrand.com");
  const [checking, setChecking] = useState(false);
  const [, setVerified] = useState(true);

  const dnsRecords = [
    { type: "CNAME", host: "@", value: "cname.zovaix-cdn.com", status: "Valid", ttl: "Automatic" },
    { type: "A", host: "@", value: "76.76.21.21", status: "Valid", ttl: "3600" },
    { type: "TXT", host: "_zovaix-challenge", value: "vc-domain-verify-8f921a48c", status: "Valid", ttl: "3600" },
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
    <div className="space-y-6 animate-fade-in">
      
      {/* Domain Input & Verification Header */}
      <div className="p-6 rounded-2xl space-y-6" style={{ backgroundColor: 'var(--surface-1)', border: '1px solid var(--surface-border)' }}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold mb-2">
              <Globe className="h-3.5 w-3.5" /> CUSTOM DOMAINS
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Production Custom Domains</h2>
            <p className="text-xs text-muted-foreground">Configure custom DNS routing with automated SSL certificates.</p>
          </div>
          <Button onClick={handleVerify} disabled={checking} className="h-10 px-4 rounded-xl text-xs font-bold gap-2 btn-premium">
            <RefreshCw className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Checking Propagation..." : "Check DNS Propagation"}
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="e.g. app.yourcompany.com"
            className="h-11 rounded-xl bg-[var(--surface-2)] border-border/50 font-mono text-sm"
          />
          <Button variant="outline" className="h-11 px-6 rounded-xl font-semibold border-border/50 text-xs hover:bg-[var(--surface-2)]">
            Update Domain
          </Button>
        </div>
      </div>

      {/* Visual DNS Routing Diagram */}
      <div className="p-6 rounded-2xl space-y-6" style={{ backgroundColor: 'var(--surface-1)', border: '1px solid var(--surface-border)' }}>
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <Server className="h-4.5 w-4.5 text-primary" /> Traffic Routing
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="p-4 rounded-xl border space-y-1.5" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--surface-border)' }}>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">01. Domain Registrar</span>
            <p className="font-semibold text-sm text-foreground">{domain}</p>
            <span className="text-xs text-emerald-500 font-medium">Configured</span>
          </div>

          <div className="p-4 rounded-xl border space-y-1.5" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--surface-border)' }}>
            <span className="text-[10px] font-mono text-primary font-bold uppercase tracking-wider">02. ZOVAIX SITES EDGE CDN</span>
            <p className="font-semibold text-sm text-primary">Global Edge Network</p>
            <span className="text-xs text-primary font-medium">Active</span>
          </div>

          <div className="p-4 rounded-xl border space-y-1.5" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--surface-border)' }}>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">03. SSL Security</span>
            <p className="font-semibold text-sm text-foreground">SSL Certificate</p>
            <span className="text-xs text-emerald-500 font-medium">TLS 1.3 Active</span>
          </div>
        </div>
      </div>

      {/* Required DNS Records Table */}
      <div className="p-6 rounded-2xl space-y-6" style={{ backgroundColor: 'var(--surface-1)', border: '1px solid var(--surface-border)' }}>
        <div>
          <h3 className="text-base font-bold text-foreground">Required DNS Records</h3>
          <p className="text-xs text-muted-foreground">Add these records to your DNS provider (Cloudflare, GoDaddy, Namecheap, Route53).</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b text-xs font-mono text-muted-foreground uppercase" style={{ borderColor: 'var(--surface-border)' }}>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium">Host / Name</th>
                <th className="p-3 font-medium">Target Value</th>
                <th className="p-3 font-medium">TTL</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y font-mono text-xs" style={{ borderColor: 'var(--surface-border)' }}>
              {dnsRecords.map((record, i) => (
                <tr key={i} className="hover:bg-[var(--surface-2)] transition-colors" style={{ borderColor: 'var(--surface-border)' }}>
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
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[var(--surface-2)] transition-colors"
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
