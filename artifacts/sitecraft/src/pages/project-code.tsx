import React, { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useGetProject } from "@workspace/api-client-react";
import { filesService, VFSFile } from "@/services/files";
import { ProjectWorkspaceLayout } from "./project-workspace-layout";
import { Button } from "@/components/ui/button";
import {
  Folder,
  FileCode,
  Plus,
  Sparkles,
  Download,
  Copy,
  Check,
  RotateCcw,
  FileText,
  ChevronRight,
  ChevronDown,
  Github,
  ExternalLink,
  Package,
  Code2,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Terminal,
  Zap,
  Boxes
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ProjectCode() {
  const { id } = useParams<{ id?: string }>();
  const projectId = id || 'lumina';
  const { data, refetch: refetchProject } = useGetProject(projectId);
  
  const rawProject = data || {
    id: projectId,
    name: projectId,
    domain: `${projectId}.site.zovaix.com`,
    status: 'draft',
    description: '',
    category: 'SaaS',
    isStarred: false,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const project = rawProject;
  
  const [filesTree, setFilesTree] = useState<VFSFile[]>(filesService.getFilesForProject(projectId));
  const [selectedPath, setSelectedPath] = useState("index.html");
  const [openTabs, setOpenTabs] = useState<string[]>(["index.html"]);
  const [copied, setCopied] = useState(false);
  const [fileContent, setFileContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // AI Refactor state
  const [aiEditing, setAiEditing] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiRefactoring, setIsAiRefactoring] = useState(false);

  // Modals state
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [githubModalOpen, setGithubModalOpen] = useState(false);

  // GitHub deploy state
  const [githubToken, setGithubToken] = useState("");
  const [githubRepoName, setGithubRepoName] = useState(
    project.name.toLowerCase().replace(/[^a-z0-9]/g, "-") || "my-website"
  );
  const [isGithubDeploying, setIsGithubDeploying] = useState(false);
  const [githubResult, setGithubResult] = useState<{ liveUrl: string; repoUrl: string } | null>(null);

  // Fetch real project files
  useEffect(() => {
    let mounted = true;
    filesService.fetchRemoteFiles(projectId).then(files => {
      if (mounted && files && files.length > 0) {
        setFilesTree(files);
        // Find default file to select
        const initial = files.find(f => !f.isFolder)?.path || files[0].path;
        setSelectedPath(initial);
        setOpenTabs([initial]);
      }
    });
    return () => { mounted = false; };
  }, [projectId]);

  const activeFile = filesService.getFileByPath(projectId, selectedPath) || {
    path: selectedPath,
    name: selectedPath.split('/').pop() || '',
    content: fileContent || '// Select a file from the explorer',
    isFolder: false,
    category: 'source',
  };

  // Sync editor content with active file
  useEffect(() => {
    if (activeFile && !activeFile.isFolder) {
      setFileContent(activeFile.content || "");
      setIsDirty(false);
    }
  }, [selectedPath, activeFile.content]);

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
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCurrentFile = () => {
    const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeFile.name || "code-file.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${activeFile.name}`);
  };

  const handleSaveFile = async () => {
    if (!selectedPath || activeFile.isFolder) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/files/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          filePath: selectedPath,
          content: fileContent,
          isDir: false,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to save file");
      }

      await filesService.updateFileContent(projectId, selectedPath, fileContent);
      await refetchProject();
      setIsDirty(false);
      toast.success(`Saved changes to ${activeFile.name}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save file");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAiRefactorFile = async () => {
    if (!aiPrompt.trim() || isAiRefactoring) return;
    setIsAiRefactoring(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/chat-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: `[File Edit: ${selectedPath}] ${aiPrompt}`,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "AI refactor failed");
      }

      toast.success("AI refactor job started! Applying improvements...");
      setAiEditing(false);
      setAiPrompt("");
      // Refresh files after a short wait
      setTimeout(async () => {
        const fresh = await filesService.fetchRemoteFiles(projectId);
        setFilesTree(fresh);
      }, 3000);
    } catch (err: any) {
      toast.error(err.message || "Failed to start AI edit");
    } finally {
      setIsAiRefactoring(false);
    }
  };

  const handleDeployToGithub = async () => {
    if (!githubToken.trim()) {
      toast.error("Please provide your GitHub Personal Access Token");
      return;
    }

    setIsGithubDeploying(true);
    setGithubResult(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/deploy/github-pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          githubToken: githubToken.trim(),
          repoName: githubRepoName.trim() || project.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "GitHub deployment failed");
      }

      setGithubResult({
        liveUrl: data.liveUrl,
        repoUrl: data.repoUrl,
      });
      toast.success("Successfully deployed to GitHub Pages!");
    } catch (err: any) {
      toast.error(err.message || "Failed to deploy to GitHub");
    } finally {
      setIsGithubDeploying(false);
    }
  };

  const triggerExportDownload = (exportPath: string, filename: string) => {
    const a = document.createElement("a");
    a.href = `/api/projects/${projectId}/export/${exportPath}`.replace(/\/export\/export$/, "/export");
    a.setAttribute("download", filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Export started: ${filename}`);
  };

  return (
    <ProjectWorkspaceLayout activeTab="code">
      <div className="flex h-full w-full bg-background overflow-hidden relative font-sans">
        
        {/* Left File Tree Sidebar */}
        <div className="w-64 border-r flex flex-col shrink-0 select-none" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
          <div className="p-3 border-b flex items-center justify-between font-mono text-[11px] uppercase text-muted-foreground" style={{ borderColor: 'var(--surface-border)' }}>
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <Code2 className="h-3.5 w-3.5 text-primary" /> Source Explorer
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filesTree.map(node => (
              <FileTreeNode key={node.path} node={node} selectedPath={selectedPath} onSelect={handleSelectFile} />
            ))}
          </div>

          {/* Bottom Export & GitHub Shortcuts */}
          <div className="p-3 border-t space-y-2 shrink-0 bg-black/20" style={{ borderColor: 'var(--surface-border)' }}>
            <Button
              size="sm"
              onClick={() => setExportModalOpen(true)}
              className="w-full text-xs font-semibold gap-1.5 h-8 bg-primary text-primary-foreground"
            >
              <Download className="h-3.5 w-3.5" /> Export Code...
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setGithubModalOpen(true)}
              className="w-full text-xs gap-1.5 h-8 border-white/10 hover:bg-white/5 text-muted-foreground hover:text-foreground"
            >
              <Github className="h-3.5 w-3.5" /> Push to GitHub
            </Button>
          </div>
        </div>

        {/* Right Main Editor Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#090A0C]">
          
          {/* Tab Bar Header */}
          <div className="h-10 px-2 flex items-center justify-between border-b select-none shrink-0" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
              {openTabs.map(tabPath => {
                const fileName = tabPath.split('/').pop();
                const isActive = selectedPath === tabPath;
                return (
                  <div
                    key={tabPath}
                    onClick={() => setSelectedPath(tabPath)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono border cursor-pointer transition-colors shrink-0",
                      isActive
                        ? "bg-black/60 text-primary border-primary/40 font-semibold shadow-sm"
                        : "text-muted-foreground hover:text-foreground border-transparent hover:bg-white/5"
                    )}
                  >
                    <FileCode className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{fileName}</span>
                    {openTabs.length > 1 && (
                      <button onClick={(e) => handleCloseTab(tabPath, e)} className="hover:text-destructive opacity-70 hover:opacity-100 ml-1">×</button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick Actions in Tab Bar */}
            <div className="flex items-center gap-1.5 shrink-0 pl-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setExportModalOpen(true)}
                className="h-7 px-2.5 text-xs border-white/10 gap-1 text-muted-foreground hover:text-foreground"
              >
                <Download className="h-3 w-3" /> <span className="hidden sm:inline">Export</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setGithubModalOpen(true)}
                className="h-7 px-2.5 text-xs border-white/10 gap-1 text-muted-foreground hover:text-foreground"
              >
                <Github className="h-3 w-3" /> <span className="hidden sm:inline">GitHub</span>
              </Button>
            </div>
          </div>

          {/* Code Toolbar */}
          <div className="h-9 px-4 flex items-center justify-between text-xs text-muted-foreground border-b select-none shrink-0 bg-black/40" style={{ borderColor: 'var(--surface-border)' }}>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-white/70">{activeFile.path}</span>
              {isDirty && (
                <span className="text-[10px] font-mono text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">Unsaved Changes</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setAiEditing(!aiEditing)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 text-[11px] font-mono font-semibold transition-colors border border-primary/20"
              >
                <Sparkles className="h-3 w-3" /> AI Edit File
              </button>

              <button
                onClick={handleSaveFile}
                disabled={isSaving || !isDirty}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition-colors border",
                  isDirty
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30"
                    : "bg-white/5 text-muted-foreground/50 border-white/5 cursor-not-allowed"
                )}
                title="Save changes to disk and live preview"
              >
                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Save
              </button>

              <button onClick={handleCopyCode} className="p-1 hover:text-foreground text-muted-foreground" title="Copy Code">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              
              <button onClick={handleDownloadCurrentFile} className="p-1 hover:text-foreground text-muted-foreground" title="Download Current File">
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* AI Refactor Prompt Floating Bar */}
          {aiEditing && (
            <div className="p-3 bg-primary/10 border-b border-primary/20 flex items-center gap-3 animate-in fade-in shrink-0">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAiRefactorFile(); }}
                placeholder={`Ask AI to refactor ${activeFile.name} (e.g. Add dark mode styles, improve accessibility, add hover effects)...`}
                className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground font-sans"
                autoFocus
              />
              <Button size="sm" onClick={handleAiRefactorFile} disabled={!aiPrompt.trim() || isAiRefactoring} className="h-7 text-xs px-3 font-semibold bg-primary text-primary-foreground">
                {isAiRefactoring ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Apply AI Edit
              </Button>
            </div>
          )}

          {/* Code Viewer & Editor Textarea */}
          <div className="flex-1 p-4 font-mono text-xs overflow-auto bg-[#090A0C] leading-relaxed">
            <textarea
              value={fileContent}
              onChange={(e) => {
                setFileContent(e.target.value);
                setIsDirty(true);
              }}
              className="w-full h-full bg-transparent outline-none resize-none font-mono text-xs text-emerald-300/90 leading-relaxed selection:bg-primary/30"
              spellCheck={false}
            />
          </div>
        </div>

      </div>

      {/* ── CODE EXPORT MODAL ── */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-2xl border p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Export Project Code</h3>
                  <p className="text-xs text-muted-foreground">Download clean, framework-ready code you fully own</p>
                </div>
              </div>
              <button onClick={() => setExportModalOpen(false)} className="text-muted-foreground hover:text-foreground p-1">✕</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div
                onClick={() => { triggerExportDownload("react", `${project.name}-react.zip`); setExportModalOpen(false); }}
                className="p-3.5 rounded-xl border border-white/10 hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all group space-y-1.5 bg-black/20"
              >
                <div className="flex items-center gap-2 text-primary font-bold text-xs">
                  <Code2 className="h-4 w-4" /> React 18 + Vite
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">Modular components, Tailwind CSS & Vite build setup.</p>
              </div>

              <div
                onClick={() => { triggerExportDownload("nextjs", `${project.name}-nextjs.zip`); setExportModalOpen(false); }}
                className="p-3.5 rounded-xl border border-white/10 hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all group space-y-1.5 bg-black/20"
              >
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Zap className="h-4 w-4" /> Next.js 14 App Router
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">Server components, modern directory layout & SEO tags.</p>
              </div>

              <div
                onClick={() => { triggerExportDownload("astro", `${project.name}-astro.zip`); setExportModalOpen(false); }}
                className="p-3.5 rounded-xl border border-white/10 hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all group space-y-1.5 bg-black/20"
              >
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <Boxes className="h-4 w-4" /> Astro 4 Framework
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">Content-driven static site with zero JS overhead by default.</p>
              </div>

              <div
                onClick={() => { triggerExportDownload("zip", `${project.name}-bundle.zip`); setExportModalOpen(false); }}
                className="p-3.5 rounded-xl border border-white/10 hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all group space-y-1.5 bg-black/20"
              >
                <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                  <Package className="h-4 w-4" /> Full Static ZIP Package
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">Deploy ready to Vercel, Netlify, Cloudflare or any host.</p>
              </div>

              <div
                onClick={() => { triggerExportDownload("export", `${project.name}.html`); setExportModalOpen(false); }}
                className="p-3.5 rounded-xl border border-white/10 hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all group space-y-1.5 bg-black/20"
              >
                <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                  <FileCode className="h-4 w-4" /> Single HTML File
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">Self-contained HTML file with inline styles and scripts.</p>
              </div>

              <div
                onClick={() => { triggerExportDownload("design-contract", `DESIGN.md`); setExportModalOpen(false); }}
                className="p-3.5 rounded-xl border border-white/10 hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all group space-y-1.5 bg-black/20"
              >
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                  <FileText className="h-4 w-4" /> Brand Design Contract
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">Color palette tokens, typography rules & guidelines (DESIGN.md).</p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-white/10">
              <Button size="sm" variant="outline" onClick={() => setExportModalOpen(false)} className="h-8 text-xs border-white/10">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── GITHUB PUSH / DEPLOY MODAL ── */}
      {githubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                  <Github className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Push to GitHub</h3>
                  <p className="text-xs text-muted-foreground">Creates a repository & enables GitHub Pages</p>
                </div>
              </div>
              <button onClick={() => { setGithubModalOpen(false); setGithubResult(null); }} className="text-muted-foreground hover:text-foreground p-1">✕</button>
            </div>

            {githubResult ? (
              <div className="space-y-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="h-4 w-4" /> Deployed to GitHub Pages!
                </div>
                <p className="text-muted-foreground">
                  Your code has been pushed and GitHub Pages has been activated. Pages usually takes 1-2 minutes to finish building.
                </p>
                <div className="space-y-2 pt-1 font-mono text-[11px]">
                  <a
                    href={githubResult.liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-white/10 text-primary hover:underline"
                  >
                    <span>{githubResult.liveUrl}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                  <a
                    href={githubResult.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-white/10 text-white hover:underline"
                  >
                    <span>{githubResult.repoUrl}</span>
                    <Github className="h-3.5 w-3.5 shrink-0" />
                  </a>
                </div>
                <Button size="sm" onClick={() => { setGithubModalOpen(false); setGithubResult(null); }} className="w-full h-8 text-xs font-semibold bg-emerald-500 text-black hover:bg-emerald-400">
                  Done
                </Button>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-medium flex items-center justify-between">
                    <span>GitHub Personal Access Token</span>
                    <a
                      href="https://github.com/settings/tokens/new?scopes=repo,workflow"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline text-[10px] flex items-center gap-0.5"
                    >
                      Generate token <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </label>
                  <input
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full p-2.5 rounded-xl border bg-black/40 text-foreground font-mono text-xs outline-none focus:border-primary/50"
                    style={{ borderColor: 'var(--surface-border)' }}
                  />
                  <span className="text-[10px] text-muted-foreground/70 block">Needs `repo` scope to create and push your code files.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-medium">Repository Name</label>
                  <input
                    type="text"
                    value={githubRepoName}
                    onChange={(e) => setGithubRepoName(e.target.value)}
                    placeholder="my-cool-website"
                    className="w-full p-2.5 rounded-xl border bg-black/40 text-foreground font-mono text-xs outline-none focus:border-primary/50"
                    style={{ borderColor: 'var(--surface-border)' }}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <Button size="sm" variant="outline" onClick={() => setGithubModalOpen(false)} className="h-8 text-xs border-white/10">
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleDeployToGithub}
                    disabled={!githubToken.trim() || isGithubDeploying}
                    className="h-8 text-xs font-semibold gap-1.5 bg-white text-black hover:bg-white/90"
                  >
                    {isGithubDeploying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Github className="h-3.5 w-3.5" />}
                    {isGithubDeploying ? "Deploying..." : "Create Repo & Deploy"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
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
          className="flex items-center gap-2 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
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
  const isHtml = node.name.endsWith(".html");
  const isTsx = node.name.endsWith(".tsx") || node.name.endsWith(".ts");
  const isJson = node.name.endsWith(".json");
  const isCss = node.name.endsWith(".css");

  return (
    <div
      onClick={() => onSelect(node)}
      className={cn(
        "flex items-center justify-between px-2 py-1.5 rounded-md text-xs cursor-pointer font-mono transition-colors",
        isSelected
          ? "bg-primary/20 text-primary font-semibold"
          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
      )}
    >
      <div className="flex items-center gap-2 truncate">
        {isHtml ? (
          <FileCode className="h-3.5 w-3.5 text-amber-400 shrink-0" />
        ) : isTsx ? (
          <FileCode className="h-3.5 w-3.5 text-blue-400 shrink-0" />
        ) : isJson ? (
          <FileText className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
        ) : isCss ? (
          <Layers className="h-3.5 w-3.5 text-pink-400 shrink-0" />
        ) : (
          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <span className="truncate">{node.name}</span>
      </div>
      {node.isModified && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" title="Modified" />}
    </div>
  );
}
