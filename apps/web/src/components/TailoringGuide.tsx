"use client";

import { X, FileText, Sparkles, Copy, CheckCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TailoringGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

type GuideStep = {
  title: string;
  description: string;
  icon: typeof FileText;
  accent: "primary" | "success";
};

const GUIDE_STEPS: GuideStep[] = [
  {
    title: "1. We analyze the job description",
    description:
      "We extract key skills, technologies, and requirements that the employer is looking for.",
    icon: FileText,
    accent: "primary",
  },
  {
    title: "2. We tailor your content",
    description:
      "Your experience bullets are rewritten to highlight relevant skills. We reorder your skills to put the most relevant ones first. A new summary is crafted specifically for this role.",
    icon: Sparkles,
    accent: "primary",
  },
  {
    title: "3. You copy to your resume",
    description:
      "Use the copy buttons to grab each section, then paste into your resume document. We recommend using our Google Docs template for consistent formatting.",
    icon: Copy,
    accent: "primary",
  },
  {
    title: "4. Submit your application",
    description:
      "Upload the final resume you submitted and mark the application as applied. We'll keep track of everything for you.",
    icon: CheckCircle,
    accent: "success",
  },
];

const IMPORTANT_NOTES = [
  "We never invent experience or companies",
  "All content comes from your original resume",
  "We only rephrase and reorder to highlight relevance",
  "Always review the tailored content before using",
];

function GuideSteps({ layout }: { layout: "stacked" | "grid" }) {
  return (
    <div className={layout === "grid" ? "grid gap-6 md:grid-cols-2" : "space-y-6"}>
      {GUIDE_STEPS.map((step) => {
        const Icon = step.icon;
        const accentStyles =
          step.accent === "success"
            ? "bg-green-100 text-green-600"
            : "bg-primary/10 text-primary";
        return (
          <div key={step.title} className="flex gap-4">
            <div className={cn("flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center", accentStyles)}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium mb-1">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ImportantNotes() {
  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <h4 className="font-medium text-sm mb-2">Important Notes</h4>
      <ul className="text-sm text-muted-foreground space-y-1">
        {IMPORTANT_NOTES.map((note) => (
          <li key={note}>• {note}</li>
        ))}
      </ul>
    </div>
  );
}

export function InlineTailoringGuide({ className }: { className?: string }) {
  return (
    <div className={cn("bg-card border rounded-xl p-6 space-y-6", className)}>
      <div>
        <h2 className="text-xl font-semibold mb-2">How Resume Tailoring Works</h2>
        <p className="text-sm text-muted-foreground">
          Generate ATS-tailored content from your resume and the job description, then copy the sections into your document.
        </p>
      </div>
      <GuideSteps layout="grid" />
      <ImportantNotes />
    </div>
  );
}

export function TailoringGuide({ isOpen, onClose }: TailoringGuideProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">How Resume Tailoring Works</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <GuideSteps layout="stacked" />
          <ImportantNotes />
        </div>

        <div className="border-t px-6 py-4">
          <button
            onClick={onClose}
            className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}

export function TailoringGuideLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
    >
      <HelpCircle className="w-4 h-4" />
      How does this work?
    </button>
  );
}
