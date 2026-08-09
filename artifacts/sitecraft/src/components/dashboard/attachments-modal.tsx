import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Paperclip,
  Image as ImageIcon,
  LayoutTemplate,
  X,
  Upload,
  Link as LinkIcon,
  Check,
  FileText,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

export interface AttachmentFile {
  id: string;
  name: string;
  type: 'document' | 'image' | 'reference';
  url: string;
  sizeMB?: number;
  previewUrl?: string;
}

interface AttachmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'document' | 'image' | 'reference';
  onAddAttachment: (attachment: AttachmentFile) => void;
}

export function AttachmentsModal({
  isOpen,
  onClose,
  mode,
  onAddAttachment,
}: AttachmentsModalProps) {
  const [referenceUrl, setReferenceUrl] = useState("");
  const [referenceNotes, setReferenceNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const title =
    mode === 'image'
      ? 'Upload Visual & Brand Assets'
      : mode === 'reference'
      ? 'Add Website Reference'
      : 'Attach Document or Data Brief';

  const icon =
    mode === 'image'
      ? ImageIcon
      : mode === 'reference'
      ? LayoutTemplate
      : Paperclip;

  const IconComp = icon;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const file = files[0];

    try {
      const formData = new FormData();
      formData.append("file", file);

      let fileUrl = "";
      try {
        const res = await fetch("/api/storage/upload", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          fileUrl = data.url || data.path || "";
        }
      } catch {
        // Fallback to local object URL if backend upload endpoint unavailable
      }

      if (!fileUrl) {
        fileUrl = URL.createObjectURL(file);
      }

      const attachment: AttachmentFile = {
        id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        type: mode === 'image' ? 'image' : 'document',
        url: fileUrl,
        sizeMB: Number((file.size / (1024 * 1024)).toFixed(2)),
        previewUrl: mode === 'image' ? fileUrl : undefined,
      };

      onAddAttachment(attachment);
      toast.success(`Attached ${file.name}`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to process attachment");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddReferenceUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenceUrl.trim()) return;

    const cleanUrl = referenceUrl.trim().startsWith("http") ? referenceUrl.trim() : `https://${referenceUrl.trim()}`;
    const attachment: AttachmentFile = {
      id: `ref-${Date.now()}`,
      name: referenceNotes.trim() ? `${new URL(cleanUrl).hostname} (${referenceNotes.trim()})` : new URL(cleanUrl).hostname,
      type: 'reference',
      url: cleanUrl,
    };

    onAddAttachment(attachment);
    toast.success(`Added reference ${new URL(cleanUrl).hostname}`);
    setReferenceUrl("");
    setReferenceNotes("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl border p-6 space-y-6 shadow-2xl relative" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-white/5"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 border-b pb-4" style={{ borderColor: 'var(--surface-border)' }}>
          <div className="p-2.5 rounded-xl text-primary" style={{ background: 'var(--surface-0)', border: '1px solid var(--surface-border)' }}>
            <IconComp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">Attach context directly to your AI prompt</p>
          </div>
        </div>

        {mode === 'reference' ? (
          <form onSubmit={handleAddReferenceUrl} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ref-url" className="text-xs">Website URL Reference</Label>
              <Input
                id="ref-url"
                type="url"
                value={referenceUrl}
                onChange={(e) => setReferenceUrl(e.target.value)}
                placeholder="https://example.com or apple.com"
                required
                className="bg-background/50 text-xs font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ref-notes" className="text-xs">Design & Structure Notes (Optional)</Label>
              <Input
                id="ref-notes"
                value={referenceNotes}
                onChange={(e) => setReferenceNotes(e.target.value)}
                placeholder="e.g. Use their hero layout and dark glassmorphic cards"
                className="bg-background/50 text-xs"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="h-9 text-xs border-white/10">
                Cancel
              </Button>
              <Button type="submit" className="h-9 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground">
                <Check className="h-3.5 w-3.5" /> Add Reference
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept={mode === 'image' ? 'image/*' : '.pdf,.txt,.json,.md,.docx,.csv'}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-8 rounded-2xl border-2 border-dashed border-white/15 hover:border-primary/50 text-center cursor-pointer transition-all space-y-3 bg-white/[0.02] hover:bg-primary/[0.03]"
            >
              {isUploading ? (
                <div className="space-y-2">
                  <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
                  <p className="text-xs font-mono text-muted-foreground">Uploading attachment...</p>
                </div>
              ) : (
                <>
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Click to browse files</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {mode === 'image'
                        ? 'Supports PNG, JPG, WEBP, SVG (Max 10 MB)'
                        : 'Supports PDF, TXT, JSON, Markdown (Max 10 MB)'}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="h-9 text-xs border-white/10">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
