"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ResumeViewerProps {
  src: string;
  fileType?: string | null;
  fileName?: string | null;
  className?: string;
  heightClassName?: string;
}

function isPdfFile(fileType?: string | null, fileName?: string | null) {
  if (fileType && fileType.toLowerCase().includes("pdf")) return true;
  if (fileName && fileName.toLowerCase().endsWith(".pdf")) return true;
  return false;
}

export function ResumeViewer({
  src,
  fileType,
  fileName,
  className = "",
  heightClassName = "h-[70vh] min-h-[420px]",
}: ResumeViewerProps) {
  const isPdf = isPdfFile(fileType, fileName);

  return (
    <div className={`border rounded-lg overflow-hidden bg-muted/10 ${className}`}>
      {isPdf ? (
        <iframe
          src={src}
          title="Resume preview"
          className={`w-full ${heightClassName}`}
          loading="lazy"
        />
      ) : (
        <div className="p-4 text-sm text-muted-foreground">
          Preview is available for PDF files only.{" "}
          <a href={src} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Download to view
          </a>
          .
        </div>
      )}
    </div>
  );
}

interface ResumePreviewToggleProps extends ResumeViewerProps {
  label?: string;
  buttonClassName?: string;
  defaultOpen?: boolean;
}

export function ResumePreviewToggle({
  src,
  fileType,
  fileName,
  label = "Preview",
  className = "",
  heightClassName,
  buttonClassName = "",
  defaultOpen = false,
}: ResumePreviewToggleProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`space-y-3 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex items-center gap-2 text-sm px-3 py-1.5 border rounded-lg hover:bg-muted transition-colors ${buttonClassName}`}
      >
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {open ? "Hide preview" : label}
      </button>
      {open && (
        <ResumeViewer
          src={src}
          fileType={fileType}
          fileName={fileName}
          heightClassName={heightClassName}
        />
      )}
    </div>
  );
}
