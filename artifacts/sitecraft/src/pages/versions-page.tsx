import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetProject,
  useListProjectVersions,
  useRestoreProjectVersion,
  getGetProjectQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ProjectWorkspaceLayout } from "./project-workspace-layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  History,
  RotateCcw,
  Eye,
  Code2,
  User,
  Clock,
  Sparkles,
  CheckCircle2,
  Loader2,
  FileCode,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ViewTab = "preview" | "code";

export default function VersionsPage() {
  const { id } = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const isProjectContext = Boolean(id);
  const projectId = id || "lumina";

  const { data: project } = useGetProject(projectId);
  const { data: versionsData, isLoading } = useListProjectVersions(projectId);
  const restoreMutation = useRestoreProjectVersion();

  const versions = versionsData?.versions || [];

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>("preview");

  const selectedVersion =
    versions.find((v) => v.id === selectedVersionId) || versions[0] || null;

  const handleRestore = async () => {
    if (!selectedVersion) return;
    try {
      await restoreMutation.mutateAsync({
        id: projectId,
        versionId: selectedVersion.id,
      });

      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
      toast.success(`Restored project to ${selectedVersion.label || `v${selectedVersion.versionNumber}`}`);
      setLocation(`/projects/${projectId}/build`);
    } catch (err) {
      toast.error("Failed to restore version snapshot.");
    }
  };

  const content = (
    <div className="p-6 space-y-6 max-w-7xl mx-auto h-full overflow-y-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Version History</h1>
          <p className="text-sm text-muted-foreground">
            Snapshot timeline, live visual previews, and instant state restoration for {project?.name || "Project"}
          </p>
        </div>

        {selectedVersion && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={handleRestore}
              disabled={restoreMutation.isPending}
              className="h-9 px-4 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
            >
              {restoreMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              {restoreMutation.isPending ? "Restoring..." : `Restore ${selectedVersion.label || `v${selectedVersion.versionNumber}`}`}
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="p-16 text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-xs text-muted-foreground font-mono">Loading snapshot timeline...</p>
        </div>
      ) : versions.length === 0 ? (
        <div
          className="p-16 rounded-3xl border border-dashed text-center space-y-4 max-w-md mx-auto my-12"
          style={{ background: "var(--surface-1)", borderColor: "var(--surface-border)" }}
        >
          <History className="h-10 w-10 mx-auto text-primary opacity-60" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">No Version Snapshots Yet</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Version snapshots are created automatically every time you run AI generation or perform chat edits.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setLocation(`/projects/${projectId}/editor`)}
            className="text-xs gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" /> Open Editor to Generate
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Snapshots Timeline */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between font-mono text-xs text-muted-foreground px-1">
              <span className="uppercase font-semibold">Snapshots ({versions.length})</span>
              <span>Newest first</span>
            </div>

            <div
              className="rounded-2xl border divide-y divide-white/5 overflow-hidden"
              style={{ background: "var(--surface-1)", borderColor: "var(--surface-border)" }}
            >
              {versions.map((v, idx) => {
                const isSelected = (selectedVersion?.id || versions[0].id) === v.id;
                const isLatest = idx === 0;

                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVersionId(v.id)}
                    className={cn(
                      "p-4 cursor-pointer transition-all space-y-2 border-l-2",
                      isSelected
                        ? "bg-primary/10 border-l-primary text-foreground"
                        : "border-l-transparent hover:bg-white/5 text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-white/10 text-foreground">
                          v{v.versionNumber}
                        </span>
                        {isLatest && (
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Active
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground/80 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(v.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-foreground font-medium line-clamp-2">
                      {v.label || `Version snapshot ${v.versionNumber}`}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground/70 pt-1 font-mono">
                      <span>HTML: {v.generatedHtml ? `${Math.round(v.generatedHtml.length / 1024)} KB` : "None"}</span>
                      {isSelected && (
                        <span className="text-primary font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Selected
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Snapshot Inspector & Diff View */}
          {selectedVersion && (
            <div className="lg:col-span-8 space-y-4">
              <div
                className="rounded-2xl border overflow-hidden flex flex-col"
                style={{ background: "var(--surface-1)", borderColor: "var(--surface-border)" }}
              >
                {/* Inspector Header */}
                <div
                  className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0"
                  style={{ borderColor: "var(--surface-border)" }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">
                        {selectedVersion.label || `Version ${selectedVersion.versionNumber}`}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        • {new Date(selectedVersion.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Snapshot ID: <span className="font-mono">{selectedVersion.id}</span>
                    </p>
                  </div>

                  {/* View Mode Tabs */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 text-xs shrink-0">
                    <button
                      onClick={() => setActiveTab("preview")}
                      className={cn(
                        "px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5",
                        activeTab === "preview"
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Eye className="h-3.5 w-3.5" /> Visual Preview
                    </button>
                    <button
                      onClick={() => setActiveTab("code")}
                      className={cn(
                        "px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5",
                        activeTab === "code"
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Code2 className="h-3.5 w-3.5" /> HTML Source
                    </button>
                  </div>
                </div>

                {/* Inspector Content */}
                <div className="h-[600px] w-full bg-[#090A0C] relative">
                  {activeTab === "preview" ? (
                    selectedVersion.generatedHtml ? (
                      <iframe
                        srcDoc={selectedVersion.generatedHtml}
                        title={`Preview of ${selectedVersion.label || `v${selectedVersion.versionNumber}`}`}
                        className="w-full h-full border-none bg-white rounded-b-2xl"
                        sandbox="allow-scripts allow-same-origin allow-forms"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground font-mono text-xs">
                        No HTML snapshot recorded for this version.
                      </div>
                    )
                  ) : (
                    <div className="h-full overflow-auto p-4 font-mono text-xs text-zinc-300 select-text">
                      <pre className="whitespace-pre-wrap leading-relaxed">
                        {selectedVersion.generatedHtml || "<!-- No HTML stored in snapshot -->"}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (isProjectContext) {
    return <ProjectWorkspaceLayout activeTab="versions">{content}</ProjectWorkspaceLayout>;
  }

  return content;
}
