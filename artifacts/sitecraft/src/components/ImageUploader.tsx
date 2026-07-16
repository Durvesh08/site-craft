import { useRef, useState } from "react";
import { useUpload } from "@workspace/object-storage-web";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";

interface ImageUploaderProps {
  /** Current image URL (external URL or /api/storage/objects/... path) */
  value: string;
  onChange: (url: string) => void;
  label?: string;
  accept?: string;
  className?: string;
  /** Max file size in bytes. Default 5 MB */
  maxBytes?: number;
}

export function ImageUploader({
  value,
  onChange,
  label = "Image",
  accept = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml",
  className,
  maxBytes = 5 * 1024 * 1024,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (res) => {
      // objectPath is a full S3 URL for cloud deployments, or a /objects/... path for local.
      const url = res.objectPath.startsWith('https://')
        ? res.objectPath
        : `/api/storage${res.objectPath}`;
      onChange(url);
      setLocalError(null);
    },
    onError: (err) => {
      setLocalError(err.message ?? "Upload failed");
    },
  });

  async function handleFile(file: File) {
    setLocalError(null);
    if (!file.type.startsWith("image/")) {
      setLocalError("Only image files are allowed.");
      return;
    }
    if (file.size > maxBytes) {
      setLocalError(`File too large — max ${Math.round(maxBytes / 1024 / 1024)} MB.`);
      return;
    }
    await uploadFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so same file can be re-selected
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  const hasImage = Boolean(value);

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Drop zone / preview */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`Upload ${label}`}
        onClick={() => !isUploading && inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && !isUploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors cursor-pointer select-none",
          "min-h-[120px] bg-background/50 hover:bg-muted/40",
          dragOver && "border-primary bg-primary/5",
          !dragOver && "border-border hover:border-primary/50",
          isUploading && "cursor-default pointer-events-none opacity-70",
        )}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2 p-4 text-center">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Uploading… {progress}%</p>
            <div className="w-32 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : hasImage ? (
          <div className="relative w-full flex items-center justify-center p-3">
            <img
              src={value}
              alt={label}
              className="max-h-24 max-w-full object-contain rounded"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-background/60 rounded-lg">
              <p className="text-xs font-medium text-foreground">Click to replace</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 p-4 text-center">
            <div className="rounded-full bg-muted p-2.5">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xs font-medium text-foreground">
              Click or drag &amp; drop
            </p>
            <p className="text-[10px] text-muted-foreground">
              PNG, JPG, WebP, SVG — max {Math.round(maxBytes / 1024 / 1024)} MB
            </p>
          </div>
        )}
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="h-7 text-xs gap-1.5"
        >
          <Upload className="h-3 w-3" />
          {hasImage ? "Replace" : "Upload"}
        </Button>
        {hasImage && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange("")}
            disabled={isUploading}
            className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-destructive"
          >
            <X className="h-3 w-3" />
            Remove
          </Button>
        )}
        {hasImage && !value.startsWith("/api/storage") && (
          <p className="text-[10px] text-muted-foreground ml-auto truncate max-w-[180px]" title={value}>
            {value}
          </p>
        )}
      </div>

      {localError && (
        <p className="text-xs text-destructive">{localError}</p>
      )}
    </div>
  );
}
