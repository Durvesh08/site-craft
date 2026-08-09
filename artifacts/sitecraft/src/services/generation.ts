import { AttachmentFile } from "@/components/dashboard/attachments-modal";

export interface JobStep {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  order: number;
}

export interface JobStatus {
  id: string;
  projectId: string;
  type: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  progress: number;
  error?: string;
  steps: JobStep[];
}

class GenerationService {
  async createProjectRemote(opts: {
    name: string;
    category: string;
    description: string;
  }): Promise<{ id: string; name: string }> {
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: opts.name,
          category: opts.category,
          businessDescription: opts.description,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return { id: data.id || data.project?.id, name: data.name || opts.name };
      }
    } catch {
      // Fallback
    }

    const fallbackId = opts.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || `proj-${Date.now()}`;
    return { id: fallbackId, name: opts.name };
  }

  async startGeneration(projectId: string, opts: {
    businessDescription: string;
    category?: string;
    attachments?: AttachmentFile[];
  }): Promise<{ jobId: string; status: string } | null> {
    try {
      const additionalInstructions = opts.attachments && opts.attachments.length > 0
        ? `Attached files and references: ${opts.attachments.map(a => `${a.name} (${a.url})`).join(", ")}`
        : undefined;

      const res = await fetch(`/api/projects/${projectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          businessDescription: opts.businessDescription,
          targetAudience: "General & Enterprise Customers",
          primaryCta: "Get Started Now",
          additionalInstructions,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return { jobId: data.id || data.job?.id, status: data.status || "pending" };
      }
    } catch (err) {
      console.error("Failed to start generation:", err);
    }
    return null;
  }

  async sendChatEdit(projectId: string, message: string, attachments?: AttachmentFile[]): Promise<{ jobId: string; status: string } | null> {
    try {
      const attachmentText = attachments && attachments.length > 0
        ? ` [Attached context: ${attachments.map(a => `${a.name} (${a.url})`).join(", ")}]`
        : "";

      const res = await fetch(`/api/projects/${projectId}/chat-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: message + attachmentText,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return { jobId: data.id || data.job?.id, status: data.status || "pending" };
      }
    } catch (err) {
      console.error("Failed to send chat edit:", err);
    }
    return null;
  }

  async getJobStatus(jobId: string): Promise<JobStatus | null> {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch {
      // Fallback
    }
    return null;
  }

  async pollJobUntilCompletion(
    jobId: string,
    onProgress: (status: JobStatus) => void,
    maxWaitSeconds: number = 60
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitSeconds * 1000) {
      const status = await this.getJobStatus(jobId);
      if (status) {
        onProgress(status);
        if (status.status === "completed") return true;
        if (status.status === "failed") return false;
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    return false;
  }
}

export const generationService = new GenerationService();
