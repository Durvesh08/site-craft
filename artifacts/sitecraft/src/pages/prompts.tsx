import { useState } from "react";
import { useListPrompts, useUpdatePrompt } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Settings2, Shield, Edit3, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface PromptTemplate {
  id: string;
  name: string;
  agentRole: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: string;
  provider: string;
  model: string;
  temperature: number;
  version: string;
  isActive: boolean;
}

const PROVIDER_MODELS: Record<string, { label: string; value: string }[]> = {
  gemini: [
    { label: "Gemini 2.5 Flash", value: "gemini-2.5-flash" },
  ],
  anthropic: [
    { label: "Claude 3.5 Sonnet", value: "claude-3-5-sonnet-20241022" },
    { label: "Claude 3.5 Haiku", value: "claude-3-5-haiku-20241022" },
  ],
  deepseek: [
    { label: "DeepSeek Coder", value: "deepseek-coder" },
  ],
};

export default function Prompts() {
  const { data: promptsData, isLoading, refetch } = useListPrompts();
  const prompts = (promptsData?.prompts as PromptTemplate[]) || [];
  const updatePromptMutation = useUpdatePrompt();

  // Edit dialog state
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPromptTemplate, setUserPromptTemplate] = useState("");
  const [provider, setProvider] = useState("gemini");
  const [model, setModel] = useState("gemini-2.5-flash");
  const [temperature, setTemperature] = useState(0.7);
  const [isSaving, setIsSaving] = useState(false);

  const getRoleIcon = (role: string) => {
    switch (role?.toLowerCase()) {
      case "director": return <Shield className="h-5 w-5 text-primary" />;
      case "designer": return <Paintbrush className="h-5 w-5 text-pink-500" />;
      case "copywriter": return <Edit3 className="h-5 w-5 text-amber-500" />;
      default: return <Bot className="h-5 w-5 text-blue-500" />;
    }
  };

  const handleOpenConfigure = (prompt: PromptTemplate) => {
    setSelectedPrompt(prompt);
    setName(prompt.name);
    setDescription(prompt.description || "");
    setSystemPrompt(prompt.systemPrompt);
    setUserPromptTemplate(prompt.userPromptTemplate || "");
    setProvider(prompt.provider || "gemini");
    setModel(prompt.model);
    setTemperature(prompt.temperature);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedPrompt) return;
    setIsSaving(true);
    try {
      await updatePromptMutation.mutateAsync({
        id: selectedPrompt.id,
        data: {
          name,
          systemPrompt,
          userPromptTemplate,
          provider,
          model,
          temperature,
        },
      });
      toast.success("AI Assistant prompt configuration updated successfully!");
      setIsDialogOpen(false);
      refetch();
    } catch (error) {
      toast.error("Failed to update configuration. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-8 animate-fade-in">
      <div className="flex justify-between items-center pb-6" style={{ borderBottom: '1px solid var(--surface-border)' }}>
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold mb-3">
            <Sparkles className="h-3.5 w-3.5" /> AI ASSISTANT
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">AI Prompt Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure system prompts and behaviors for the AI design specialists.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-border)' }}>
              <div className="h-6 rounded w-1/2 skeleton-shimmer" />
              <div className="h-4 rounded w-3/4 skeleton-shimmer" />
              <div className="h-20 rounded w-full skeleton-shimmer" />
            </div>
          ))
        ) : prompts.length === 0 ? (
          <div className="col-span-full py-16 text-center rounded-2xl" style={{ backgroundColor: 'var(--surface-1)', border: '1px solid var(--surface-border)' }}>
            <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-30" />
            <h3 className="text-lg font-medium text-foreground">No prompts loaded</h3>
            <p className="text-muted-foreground text-sm">The prompt library is currently empty.</p>
          </div>
        ) : (
          prompts.map((prompt) => (
            <Card key={prompt.id} className="flex flex-col h-full hover:border-[rgba(255,255,255,0.12)] transition-colors rounded-2xl" style={{ backgroundColor: 'var(--surface-1)', border: '1px solid var(--surface-border)' }}>
              <CardHeader className="pb-3 flex-none">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--surface-2)' }}>
                      {getRoleIcon(prompt.agentRole)}
                    </div>
                    <CardTitle className="text-base font-semibold text-foreground">{prompt.name}</CardTitle>
                  </div>
                  {prompt.isActive && <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] px-1.5 py-0 font-medium">ACTIVE</Badge>}
                </div>
                <CardDescription className="text-xs text-muted-foreground">
                  Role: {prompt.agentRole} • Provider: {prompt.provider} • Model: {prompt.model}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4 leading-relaxed">
                  {prompt.description || "No description provided."}
                </p>
                <div className="border rounded-xl p-3 max-h-32 overflow-hidden relative" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--surface-border)' }}>
                  <p className="text-xs font-mono leading-relaxed text-muted-foreground line-clamp-4">
                    {prompt.systemPrompt}
                  </p>
                  <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t" style={{ backgroundImage: `linear-gradient(to top, var(--surface-2) 0%, transparent 100%)` }} />
                </div>
              </CardContent>
              <CardFooter className="pt-3 flex justify-between items-center border-t mt-auto" style={{ borderColor: 'var(--surface-border)' }}>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  v{prompt.version}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenConfigure(prompt)}
                  className="h-8 px-3 text-xs gap-1.5 text-muted-foreground hover:text-foreground hover:bg-[var(--surface-2)]"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Configure
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {/* Configure Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col rounded-[20px] overflow-hidden p-0 border border-white/10" style={{ backgroundColor: 'var(--surface-1)' }}>
          <div className="p-6 border-b" style={{ borderColor: 'var(--surface-border)', backgroundColor: 'var(--surface-2)' }}>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Settings2 className="h-5 w-5 text-primary" />
              Configure AI Assistant Prompt
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Modify system-level guidelines and prompt templates for the {selectedPrompt?.agentRole} designer.
            </DialogDescription>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 p-6 pr-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Template Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. UX Designer V2"
                  className="bg-[var(--surface-2)] border-border/50 focus:border-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Agent Role</label>
                <Input
                  value={selectedPrompt?.agentRole || ""}
                  disabled
                  className="bg-[var(--surface-2)] border-border/30 font-mono text-xs opacity-60"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">AI Provider</label>
                <select
                  value={provider}
                  onChange={(e) => {
                    const newProvider = e.target.value;
                    setProvider(newProvider);
                    setModel(PROVIDER_MODELS[newProvider]?.[0]?.value || "");
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-input text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--surface-border)' }}
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="anthropic">Anthropic Claude</option>
                  <option value="deepseek">DeepSeek</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">AI Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-input text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--surface-border)' }}
                >
                  {(PROVIDER_MODELS[provider] || []).map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Temperature ({temperature})</label>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-10 accent-primary bg-transparent cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this prompt configuration is optimized for..."
                className="min-h-[60px] bg-[var(--surface-2)] border-border/50 focus:border-primary text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-primary" />
                System Prompt
              </label>
              <Textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="You are an expert AI agent..."
                className="min-h-[200px] font-mono text-xs bg-[var(--surface-2)] border-border/50 focus:border-primary resize-y leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">User Prompt Template</label>
              <Textarea
                value={userPromptTemplate}
                onChange={(e) => setUserPromptTemplate(e.target.value)}
                placeholder="Generate a layout for: {{businessDescription}}..."
                className="min-h-[100px] font-mono text-xs bg-[var(--surface-2)] border-border/50 focus:border-primary resize-y leading-relaxed"
              />
            </div>
          </div>

          <div className="p-6 border-t flex flex-col-reverse sm:flex-row items-center justify-end gap-3 bg-[var(--surface-2)]" style={{ borderColor: 'var(--surface-border)' }}>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving} className="rounded-xl border-border/50">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !name || !systemPrompt} className="gap-2 btn-premium rounded-xl h-10 px-6">
              {isSaving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Paintbrush(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/>
    </svg>
  );
}
