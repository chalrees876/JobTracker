"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Eye, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResumePreviewToggleProps {
  src: string;
  fileType?: string | null;
  fileName?: string | null;
  label?: string;
  downloadUrl?: string | null;
  className?: string;
}

export function ResumePreviewToggle({
  src,
  fileType,
  fileName,
  label = "Preview",
  downloadUrl,
  className,
}: ResumePreviewToggleProps) {
  const [open, setOpen] = useState(false);
  const isPdf = fileType?.includes("pdf") || fileName?.toLowerCase().endsWith(".pdf");

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-muted transition-colors"
        >
          <Eye className="w-4 h-4" />
          {label}
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {downloadUrl && (
          <a
            href={downloadUrl}
            download={fileName ?? true}
            className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-muted transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </a>
        )}
      </div>

      {open && (
        isPdf ? (
          <div className="border rounded-lg overflow-hidden h-[70vh] min-h-[420px] bg-background">
            <iframe title="Resume preview" src={src} className="w-full h-full" />
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Preview is available for PDFs only. Use Download to view this file.
          </div>
        )
      )}
    </div>
  );
}
