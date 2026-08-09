import React, { useState } from "react";
import { useParams } from "wouter";
import { projectsService } from "@/services/projects";
import { filesService, VFSFile } from "@/services/files";
import { ProjectWorkspaceLayout } from "./project-workspace-layout";
import { Button } from "@/components/ui/button";
import {
  Folder,
  FileCode,
  Search,
  Plus,
  Sparkles,
  Download,
  Copy,
  Check,
  RotateCcw,
  FileText,
  ChevronRight,
  ChevronDown
} from "lucide-react";

export default function ProjectCode() {
  const { id } = useParams<{ id?: string }>();
  const projectId = id || 'lumina';
  const project = projectsService.getById(projectId) || projectsService.getAll()[0];
  
  const filesTree = filesService.getFilesForProject(projectId);
  const [selectedPath, setSelectedPath] = useState("src/components/Hero.tsx");
  const [openTabs, setOpenTabs] = useState<string[]>(["src/components/Hero.tsx", "src/App.tsx"]);
  const [copied, setCopied] = useState(false);
  const [aiEditing, setAiEditing] = useState(false);

  const activeFile = filesService.getFileByPath(projectId, selectedPath) || {
    path: selectedPath,
    name: selectedPath.split('/').pop() || '',
    content: '// Select a file from the tree to edit code',
    isFolder: false,
    category: 'source',
  };

  const handleSelectFile = (file: VFSFile) => {
    if (file.isFolder) return;
    setSelectedPath(file.path);
    if (!openTabs.includes(file.path)) {
      setOpenTabs([...openTabs, file.path]);
    }
  };

  const handleCloseTab = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextTabs = openTabs.filter(t => t !== path);
    setOpenTabs(nextTabs);
    if (selectedPath === path && nextTabs.length > 0) {
      setSelectedPath(nextTabs[nextTabs.length - 1]);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ProjectWorkspaceLayout activeTab="code">
      <div className="flex h-full w-full bg-background overflow-hidden">
        
        {/* Left File Tree Sidebar */}
        <div className="w-64 border-r flex flex-col shrink-0 select-none" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
          <div className="p-3 border-b flex items-center justify-between font-mono text-[11px] uppercase text-muted-foreground" style={{ borderColor: 'var(--surface-border)' }}>
            <span>Explorer</span>
            <button className="hover:text-foreground p-1 rounded"><Plus className="h-3.5 w-3.5" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filesTree.map(node => (
              <FileTreeNode key={node.path} node={node} selectedPath={selectedPath} onSelect={handleSelectFile} />
            ))}
          </div>
        </div>

        {/* Right Main Editor Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#09090b]">
          
          {/* Tab Bar Header */}
          <div className="h-10 px-2 flex items-center gap-1 border-b overflow-x-auto select-none" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
            {openTabs.map(tabPath => {
              const fileName = tabPath.split('/').pop();
              const isActive = selectedPath === tabPath;
              return (
                <div
                  key={tabPath}
                  onClick={() => setSelectedPath(tabPath)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-xs font-mono border-t border-x cursor-pointer transition-colors ${
                    isActive ? 'bg-[#09090b] text-primary border-primary/30 font-semibold' : 'text-muted-foreground hover:text-foreground border-transparent'
                  }`}
                >
                  <FileCode className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{fileName}</span>
                  <button onClick={(e) => handleCloseTab(tabPath, e)} className="hover:text-destructive opacity-70 hover:opacity-100">×</button>
                </div>
              );
            })}
          </div>

          {/* Code Toolbar */}
          <div className="h-9 px-4 flex items-center justify-between text-xs text-muted-foreground border-b select-none" style={{ borderColor: 'var(--surface-border)' }}>
            <span className="font-mono text-[11px] text-white/50">{activeFile.path}</span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setAiEditing(!aiEditing)}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 text-[11px] font-mono font-semibold"
              >
                <Sparkles className="h-3 w-3" /> AI Edit File
              </button>
              <button onClick={handleCopyCode} className="p-1 hover:text-foreground text-muted-foreground" title="Copy Code">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <button className="p-1 hover:text-foreground text-muted-foreground" title="Download File">
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* AI Refactor Prompt Floating Bar */}
          {aiEditing && (
            <div className="p-3 bg-primary/10 border-b border-primary/20 flex items-center gap-3 animate-in fade-in">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <input
                type="text"
                placeholder="Ask AI to modify this component (e.g. Add responsive grid layout with hover animations)..."
                className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                autoFocus
              />
              <Button size="sm" className="h-7 text-xs px-3">Apply AI Edit</Button>
            </div>
          )}

          {/* Code Viewer Textarea */}
          <div className="flex-1 p-4 font-mono text-xs text-white/90 overflow-auto bg-[#09090b] leading-relaxed">
            <textarea
              value={activeFile.content}
              readOnly
              className="w-full h-full bg-transparent outline-none resize-none font-mono text-xs text-emerald-300 leading-relaxed"
            />
          </div>
        </div>

      </div>
    </ProjectWorkspaceLayout>
  );
}

function FileTreeNode({ node, selectedPath, onSelect }: { node: VFSFile; selectedPath: string; onSelect: (node: VFSFile) => void }) {
  const [open, setOpen] = useState(true);

  if (node.isFolder) {
    return (
      <div>
        <div
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground cursor-pointer"
        >
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          <Folder className="h-3.5 w-3.5 text-amber-400" />
          <span className="font-mono text-xs">{node.name}</span>
        </div>
        {open && node.children && (
          <div className="pl-4">
            {node.children.map(child => (
              <FileTreeNode key={child.path} node={child} selectedPath={selectedPath} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isSelected = selectedPath === node.path;
  return (
    <div
      onClick={() => onSelect(node)}
      className={`flex items-center justify-between px-2 py-1 rounded text-xs cursor-pointer font-mono ${
        isSelected ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
      }`}
    >
      <div className="flex items-center gap-2 truncate">
        <FileCode className="h-3.5 w-3.5 text-blue-400 shrink-0" />
        <span className="truncate">{node.name}</span>
      </div>
      {node.isModified && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" title="Modified" />}
    </div>
  );
}
