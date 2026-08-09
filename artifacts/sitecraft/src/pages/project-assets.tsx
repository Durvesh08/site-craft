import React, { useState } from "react";
import { useParams } from "wouter";
import { assetsService, Asset } from "@/services/assets";
import { ProjectWorkspaceLayout } from "./project-workspace-layout";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Image as ImageIcon,
  Film,
  Type,
  Smile,
  FileText,
  Copy,
  Trash2,
  Check,
  Search,
  ExternalLink
} from "lucide-react";

export default function ProjectAssets() {
  const [activeCategory, setActiveCategory] = useState<Asset['category'] | 'all'>('all');
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  const assets = assetsService.getAssets(activeCategory as any).filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopyUrl = (asset: Asset) => {
    navigator.clipboard.writeText(asset.url);
    setCopiedId(asset.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this asset?")) {
      assetsService.delete(id);
      setRefresh(r => r + 1);
    }
  };

  return (
    <ProjectWorkspaceLayout activeTab="assets">
      <div className="p-6 space-y-6 max-w-6xl mx-auto h-full overflow-y-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Asset Library</h2>
            <p className="text-xs text-muted-foreground">Upload and manage visual assets, brand icons, and fonts</p>
          </div>

          <Button size="sm" className="h-9 text-xs font-semibold gap-1.5 shrink-0">
            <Upload className="h-3.5 w-3.5" /> Upload Asset
          </Button>
        </div>

        {/* Categories & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 rounded-2xl border" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
          <div className="flex flex-wrap items-center gap-1">
            <AssetTab label="All Assets" active={activeCategory === 'all'} onClick={() => setActiveCategory('all')} />
            <AssetTab label="Images" icon={ImageIcon} active={activeCategory === 'images'} onClick={() => setActiveCategory('images')} />
            <AssetTab label="Videos" icon={Film} active={activeCategory === 'videos'} onClick={() => setActiveCategory('videos')} />
            <AssetTab label="Fonts" icon={Type} active={activeCategory === 'fonts'} onClick={() => setActiveCategory('fonts')} />
            <AssetTab label="Icons" icon={Smile} active={activeCategory === 'icons'} onClick={() => setActiveCategory('icons')} />
            <AssetTab label="Documents" icon={FileText} active={activeCategory === 'documents'} onClick={() => setActiveCategory('documents')} />
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets..."
              className="w-full h-8 pl-9 pr-3 rounded-xl bg-white/5 border border-white/10 text-xs text-foreground outline-none"
            />
          </div>
        </div>

        {/* Asset Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {assets.map(asset => (
            <div
              key={asset.id}
              className="group rounded-2xl border overflow-hidden transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between"
              style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}
            >
              <div className="aspect-video w-full bg-black/40 relative overflow-hidden flex items-center justify-center p-2 border-b" style={{ borderColor: 'var(--surface-border)' }}>
                {asset.category === 'images' ? (
                  <img src={asset.url} alt={asset.name} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center text-primary">
                    <FileText className="h-6 w-6" />
                  </div>
                )}

                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleCopyUrl(asset)}
                    className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
                    title="Copy URL"
                  >
                    {copiedId === asset.id ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(asset.id)}
                    className="p-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    title="Delete Asset"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="p-3 space-y-1">
                <p className="font-bold text-xs text-foreground truncate">{asset.name}</p>
                <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                  <span>{asset.size}</span>
                  <span>{asset.createdAt}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </ProjectWorkspaceLayout>
  );
}

function AssetTab({ label, icon: Icon, active, onClick }: { label: string; icon?: any; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
        active ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
      }`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      <span>{label}</span>
    </button>
  );
}
