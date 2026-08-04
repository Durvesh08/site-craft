import { useState } from "react";
import { useListPrompts, useUpdatePrompt } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Settings2, Shield, Edit3, Bot, Loader2, Sparkles } from "lucide-react";
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
  model: "gemini-flash" | "gemini-pro" | "gemini-flash-fast" | "gemini-1.5-flash";
  temperature: number;
  version: string;
  isActive: boolean;
}

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
  const [model, setModel] = useState<PromptTemplate["model"]>("gemini-flash");
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
          model,
          temperature,
        },
      });
      toast.success("Agent prompt template updated successfully!");
      setIsDialogOpen(false);
      refetch();
    } catch (error) {
      toast.error("Failed to update prompt. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-primary" />
            Prompt Library
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage the system prompts and instructions that power the 10 AI agents.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => (
            <Card key={i} className="glass-panel">
              <CardHeader className="gap-2">
                <div className="h-6 bg-muted rounded w-1/2 animate-pulse" />
                <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded w-full animate-pulse" />
              </CardContent>
            </Card>
          ))
        ) : prompts.length === 0 ? (
          <div className="col-span-full py-12 text-center border border-dashed rounded-xl glass-panel">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-30" />
            <h3 className="text-lg font-medium">No prompts loaded</h3>
            <p className="text-muted-foreground">The system prompt library is empty.</p>
          </div>
        ) : (
          prompts.map((prompt) => (
            <Card key={prompt.id} className="glass-panel flex flex-col h-full hover:border-primary/30 transition-colors">
              <CardHeader className="pb-3 flex-none">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      {getRoleIcon(prompt.agentRole)}
                    </div>
                    <CardTitle className="text-lg">{prompt.name}</CardTitle>
                  </div>
                  {prompt.isActive && <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-transparent border-emerald-200 text-[10px] px-1.5 py-0">ACTIVE</Badge>}
                </div>
                <CardDescription className="text-xs font-mono">
                  Role: {prompt.agentRole} • Model: {prompt.model}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                  {prompt.description || "No description provided."}
                </p>
                <div className="bg-muted/50 border border-border/50 rounded-md p-3 max-h-32 overflow-hidden relative group">
                  <p className="text-xs font-mono leading-relaxed text-muted-foreground line-clamp-4">
                    {prompt.systemPrompt}
                  </p>
                  <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-muted/50 to-transparent" />
                </div>
              </CardContent>
              <CardFooter className="pt-0 flex justify-between items-center border-t border-border/50 pt-3 mt-auto bg-card/30">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  v{prompt.version}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenConfigure(prompt)}
                  className="h-8 px-3 text-xs gap-1.5 hover:text-primary"
                >
                  <Settings2 className="h-3 w-3" />
                  Configure
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {/* Configure Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              Configure Agent Prompt Template
            </DialogTitle>
            <DialogDescription>
              Modify system-level guidelines and prompt templates for the {selectedPrompt?.agentRole} agent.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Template Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. UX Designer V2"
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Agent Role</label>
                <Input
                  value={selectedPrompt?.agentRole || ""}
                  disabled
                  className="bg-muted/50 font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">AI Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value as PromptTemplate["model"])}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background/50 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="gemini-flash">Gemini Pro/Flash Hybrid (thinking disabled)</option>
                  <option value="gemini-pro">Gemini 2.5 Pro (Thinking)</option>
                  <option value="gemini-flash-fast">Gemini 2.0 Flash (Fastest)</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Legacy)</option>
                </select>
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
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this prompt configuration is optimized for..."
                className="min-h-[60px] bg-background/50 text-xs"
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
                className="min-h-[220px] font-mono text-xs bg-background/50 resize-y leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">User Prompt Template</label>
              <Textarea
                value={userPromptTemplate}
                onChange={(e) => setUserPromptTemplate(e.target.value)}
                placeholder="Generate a layout for: {{businessDescription}}..."
                className="min-h-[100px] font-mono text-xs bg-background/50 resize-y leading-relaxed"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border/50 pt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !name || !systemPrompt} className="gap-2">
              {isSaving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Save Changes</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Need Paintbrush icon for this file since it's not imported at top
function Paintbrush(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/>
    </svg>
  );
}
