import React, { useState } from "react";
import { useParams } from "wouter";
import { connectorsService, Connector } from "@/services/connectors";
import { ProjectWorkspaceLayout } from "./project-workspace-layout";
import { Button } from "@/components/ui/button";
import {
  Plug,
  Search,
  CheckCircle2,
  Lock,
  ExternalLink,
  Sparkles,
  Zap,
  Cpu,
  Mic,
  CreditCard,
  DollarSign,
  Wallet,
  Database,
  Flame,
  Server,
  HardDrive,
  ShoppingBag,
  Mail,
  MessageSquare,
  Headphones,
  Send,
  Phone,
  BarChart2,
  Activity,
  PieChart,
  Target,
  Users,
  GitBranch,
  Code,
  CheckSquare,
  ShieldAlert,
  FileText,
  Folder,
  Grid,
  Figma,
  Workflow,
  Repeat,
  X,
  AlertCircle,
  HelpCircle,
  Settings,
  ChevronDown
} from "lucide-react";

const ICON_MAP: Record<string, any> = {
  Sparkles, Zap, Cpu, Mic, CreditCard, DollarSign, Wallet, Database, Flame, Server, HardDrive, ShoppingBag, Mail, MessageSquare, Headphones, Send, Phone, BarChart2, Activity, PieChart, Target, Users, GitBranch, Code, CheckSquare, ShieldAlert, FileText, Folder, Grid, Figma, Workflow, Repeat
};

export default function ConnectorsPage() {
  const { id } = useParams<{ id?: string }>();
  const isProjectContext = Boolean(id);

  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null);
  const [refresh, setRefresh] = useState(0);

  const categories = [
    { id: "All", label: "All", count: 25 },
    { id: "Enabled", label: "Enabled", count: 5 },
    { id: "Ecommerce", label: "Ecommerce", count: 1 },
    { id: "Marketing", label: "Marketing", count: 2 },
    { id: "Messaging", label: "Messaging", count: 4 },
    { id: "Productivity", label: "Productivity", count: 3 },
    { id: "Sales", label: "Sales", count: 2 },
    { id: "Security", label: "Security", count: 2 },
    { id: "Google", label: "Google", count: 3 },
    { id: "Microsoft", label: "Microsoft", count: 3 },
    { id: "AWS", label: "AWS", count: 2 },
  ];

  const allConnectors = connectorsService.getAll();
  const filteredConnectors = allConnectors.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (activeCategory === "Enabled") return c.status === "Connected";
    if (activeCategory === "All") return true;
    if (activeCategory === "Google") return c.name.includes("Google") || c.name.includes("Gemini");
    if (activeCategory === "Microsoft") return c.name.includes("Microsoft") || c.name.includes("Azure");
    if (activeCategory === "AWS") return c.name.includes("AWS") || c.name.includes("Amazon");
    return c.category.toLowerCase().includes(activeCategory.toLowerCase());
  });

  const handleToggle = (connId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    connectorsService.toggleConnection(connId);
    setRefresh(r => r + 1);
  };

  const content = (
    <div className="p-6 max-w-7xl mx-auto h-full overflow-y-auto font-sans space-y-6">
      
      {/* CONNECTOR DETAIL MODAL */}
      {selectedConnector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div 
            className="w-full max-w-lg rounded-2xl border p-6 space-y-6 shadow-2xl"
            style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}
          >
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--surface-border)' }}>
              <div className="flex items-center gap-3">
                <div 
                  className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold shadow-sm"
                  style={{ background: selectedConnector.brandColor || '#3B82F6' }}
                >
                  {React.createElement(ICON_MAP[selectedConnector.icon] || Plug, { className: "h-5 w-5" })}
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">{selectedConnector.name}</h3>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">{selectedConnector.category} • Auth: {selectedConnector.authType}</span>
                </div>
              </div>

              <button onClick={() => setSelectedConnector(null)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-muted-foreground leading-relaxed">{selectedConnector.description}</p>

              <div className="space-y-2">
                <span className="font-mono text-muted-foreground uppercase text-[10px]">Capabilities:</span>
                <div className="flex flex-wrap gap-1.5 font-mono">
                  {selectedConnector.capabilities.map(cap => (
                    <span key={cap} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-foreground">
                      ✓ {cap}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="h-4 w-4" /> Connection Service Status
                </div>
                <p className="text-[11px] text-amber-200/80">
                  {selectedConnector.status === 'Connected' ? 'Connector is active in project environment.' : 'Connection service is available for integration.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--surface-border)' }}>
              <Button variant="outline" onClick={() => setSelectedConnector(null)} className="h-9 text-xs border-white/10">Close</Button>
              <Button
                onClick={(e) => { handleToggle(selectedConnector.id, e); setSelectedConnector(null); }}
                className="h-9 text-xs font-semibold bg-primary text-primary-foreground"
              >
                {selectedConnector.status === 'Connected' ? 'Disconnect Service' : 'Authorize & Connect'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* LOVABLE-STYLE 2-COLUMN CONNECTORS WORKSPACE CONTAINER */}
      <div 
        className="rounded-2xl border overflow-hidden flex flex-col md:flex-row min-h-[640px] shadow-2xl"
        style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}
      >
        
        {/* LEFT COLUMN: CATEGORIES & REQUEST CARD */}
        <div 
          className="w-full md:w-64 border-r p-4 flex flex-col justify-between shrink-0 space-y-6"
          style={{ background: 'var(--surface-0)', borderColor: 'var(--surface-border)' }}
        >
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-white/5 border border-white/10 text-xs text-foreground outline-none font-sans"
              />
            </div>

            {/* Navigation Category List */}
            <div className="space-y-1 text-xs">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left font-medium transition-all ${
                    activeCategory === cat.id
                      ? 'bg-white/10 text-foreground font-semibold shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className="text-[11px] font-mono text-muted-foreground/70">{cat.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Missing Connector Request Card */}
          <div className="p-3.5 rounded-xl border space-y-2 text-xs" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
            <div className="flex items-center gap-2 text-muted-foreground font-medium">
              <HelpCircle className="h-4 w-4 text-primary" />
              <span>Missing a connector?</span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px] border-white/10">Request</Button>
              <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px] border-white/10">Admin</Button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: HERO BANNER & CONNECTORS GRID */}
        <div className="flex-1 p-6 sm:p-8 space-y-6 overflow-y-auto">
          
          {/* Header Banner */}
          <div className="space-y-3 text-center sm:text-left border-b pb-6" style={{ borderColor: 'var(--surface-border)' }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Build from what you already use</h2>
                <p className="text-xs text-muted-foreground mt-1 max-w-xl leading-relaxed">
                  Connectors let your Zovaix app talk to external tools like Stripe, Slack, and Google. Ask the agent to get started.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 justify-center">
                <Button size="sm" variant="outline" className="h-8 text-xs border-white/10 gap-1">
                  View the docs ↗
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs border-white/10">
                  Got it
                </Button>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-mono">{filteredConnectors.length} Connectors Available</span>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-white/5 border-white/10 text-foreground font-medium">
              <span>Popular</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Connectors 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredConnectors.map(connector => {
              const IconComponent = ICON_MAP[connector.icon] || Plug;
              const isConnected = connector.status === 'Connected';

              return (
                <div
                  key={connector.id}
                  onClick={() => setSelectedConnector(connector)}
                  className="p-4 rounded-xl border flex items-center justify-between gap-4 group transition-all duration-150 hover:-translate-y-0.5 cursor-pointer"
                  style={{ background: 'var(--surface-2)', borderColor: 'var(--surface-border)' }}
                >
                  <div className="flex items-center gap-3.5 overflow-hidden">
                    {/* Brand Tile */}
                    <div 
                      className="h-10 w-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm transition-transform group-hover:scale-105"
                      style={{ background: connector.brandColor || '#3B82F6' }}
                    >
                      <IconComponent className="h-5 w-5" />
                    </div>

                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {connector.name}
                        </h4>
                        {connector.id === 'openai' || connector.id === 'supabase' || connector.id === 'resend' ? (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-blue-500/20 text-blue-400 font-bold uppercase">
                            New
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground truncate leading-relaxed">
                        {connector.description}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={isConnected ? "outline" : "default"}
                    className={`h-7 text-[11px] font-semibold px-3 shrink-0 ${
                      isConnected ? 'border-white/10 text-white hover:bg-red-500/10 hover:text-red-400' : 'bg-white/10 hover:bg-white/20 text-foreground border-white/10'
                    }`}
                    onClick={(e) => handleToggle(connector.id, e)}
                  >
                    {isConnected ? 'Connected' : 'Connect'}
                  </Button>
                </div>
              );
            })}
          </div>

        </div>

      </div>

    </div>
  );

  if (isProjectContext) {
    return <ProjectWorkspaceLayout activeTab="connectors">{content}</ProjectWorkspaceLayout>;
  }

  return content;
}
