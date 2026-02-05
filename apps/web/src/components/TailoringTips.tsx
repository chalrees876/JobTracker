"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Lightbulb, ExternalLink } from "lucide-react";

interface TailoringTipsProps {
  keywords: string[];
}

export function TailoringTips({ keywords }: TailoringTipsProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-yellow-500" />
          <span className="font-medium text-sm">How to Use This</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Quick Steps */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Quick Steps
            </h4>
            <ol className="text-sm space-y-2">
              <li className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                  1
                </span>
                <span>Hover over each section and click "Copy"</span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                  2
                </span>
                <span>Paste into the matching section of your resume</span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                  3
                </span>
                <span>Review and adjust formatting as needed</span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                  4
                </span>
                <span>Save as PDF and upload your final version</span>
              </li>
            </ol>
          </div>

          {/* Keywords to Include */}
          {keywords.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Keywords to Include
              </h4>
              <div className="flex flex-wrap gap-1">
                {keywords.slice(0, 8).map((keyword, i) => (
                  <span
                    key={i}
                    className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs"
                  >
                    {keyword}
                  </span>
                ))}
                {keywords.length > 8 && (
                  <span className="text-xs text-muted-foreground">
                    +{keywords.length - 8} more
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                These keywords were found in the job description. They're already
                woven into your tailored content.
              </p>
            </div>
          )}

          {/* Pro Tips */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Pro Tips
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Keep your resume to 1-2 pages</li>
              <li>• Use a simple, ATS-friendly format</li>
              <li>• Save as PDF to preserve formatting</li>
              <li>• Double-check all dates and numbers</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
