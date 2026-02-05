"use client";

import { useState } from "react";
import { X, FileText, Sparkles, Copy, CheckCircle, HelpCircle } from "lucide-react";

interface TailoringGuideProps {
  isOpen: boolean;
  onClose: () => void;
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
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium mb-1">1. We analyze the job description</h3>
              <p className="text-sm text-muted-foreground">
                We extract key skills, technologies, and requirements that the employer is looking for.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium mb-1">2. We tailor your content</h3>
              <p className="text-sm text-muted-foreground">
                Your experience bullets are rewritten to highlight relevant skills.
                We reorder your skills to put the most relevant ones first.
                A new summary is crafted specifically for this role.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Copy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium mb-1">3. You copy to your resume</h3>
              <p className="text-sm text-muted-foreground">
                Use the copy buttons to grab each section, then paste into your
                resume document. We recommend using our Google Docs template for
                consistent formatting.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium mb-1">4. Submit your application</h3>
              <p className="text-sm text-muted-foreground">
                Upload the final resume you submitted and mark the application as applied.
                We'll keep track of everything for you.
              </p>
            </div>
          </div>

          {/* Important Note */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium text-sm mb-2">Important Notes</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• We never invent experience or companies</li>
              <li>• All content comes from your original resume</li>
              <li>• We only rephrase and reorder to highlight relevance</li>
              <li>• Always review the tailored content before using</li>
            </ul>
          </div>
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
