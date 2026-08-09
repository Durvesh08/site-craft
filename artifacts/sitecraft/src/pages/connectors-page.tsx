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
  Repeat
} from "lucide-react";

const ICON_MAP: Record<string, any> = {
  Sparkles, Zap, Cpu, Mic, CreditCard, DollarSign, Wallet, Database, Flame, Server, HardDrive, ShoppingBag, Mail, MessageSquare, Headphones, Send, Phone, BarChart2, Activity, PieChart, Target, Users, GitBranch, Code, CheckSquare, ShieldAlert, FileText, Folder, Grid, Figma, Workflow, Repeat
};

export default function ConnectorsPage() {
  const { id } = useParams<{ id?: string }>();
  const isProjectContext = Boolean(id);

  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [refresh, setRefresh] = useState(0);

  const categories = [
    "All", "AI", "Payments", "Database", "Analytics", "Communication", "Marketing", "Commerce", "Storage", "Developer", "Productivity", "Automation", "Design"
  ];

  const connectors = connectorsService.getAll(activeCategory).filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = (connId: string) => {
    connectorsService.toggleConnection(connId);
    setRefresh(r => r + 1);
  };

  const content = (
    <div className="p-6 space-y-6 max-w-6xl mx-auto h-full overflow-y-auto">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Connectors Catalog</h1>
        <p className="text-sm text-muted-foreground">Integrate third-party APIs, AI engines, databases, and payment gateways</p>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 rounded-2xl border" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
        <div className="flex flex-wrap items-center gap-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                activeCategory === cat ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search connectors..."
            className="w-full h-8 pl-9 pr-3 rounded-xl bg-white/5 border border-white/10 text-xs text-foreground outline-none"
          />
        </div>
      </div>

      {/* Connector Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {connectors.map(connector => {
          const IconComponent = ICON_MAP[connector.icon] || Plug;
          const isConnected = connector.status === 'connected';

          return (
            <div
              key={connector.id}
              className="p-5 rounded-2xl border flex flex-col justify-between space-y-4 group transition-all duration-200 hover:-translate-y-1"
              style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium border uppercase ${
                    isConnected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-muted-foreground border-white/10'
                  }`}>
                    {connector.status}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{connector.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{connector.description}</p>
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--surface-border)' }}>
                <span className="text-[10px] font-mono text-muted-foreground uppercase">{connector.category}</span>
                <Button
                  size="sm"
                  variant={isConnected ? "outline" : "default"}
                  className={`h-8 text-xs font-semibold px-3 ${
                    isConnected ? 'border-white/10 text-white hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20' : 'bg-primary text-primary-foreground'
                  }`}
                  onClick={() => handleToggle(connector.id)}
                >
                  {isConnected ? 'Disconnect' : 'Connect'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (isProjectContext) {
    return <ProjectWorkspaceLayout activeTab="connectors">{content}</ProjectWorkspaceLayout>;
  }

  return content;
}
