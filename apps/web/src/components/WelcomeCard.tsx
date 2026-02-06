"use client";

import Link from "next/link";
import { Briefcase, Upload, Plus, Sparkles } from "lucide-react";
import { InlineTailoringGuide } from "@/components/TailoringGuide";

interface WelcomeCardProps {
  userName?: string | null;
  variant: "no-resume" | "no-applications";
}

export function WelcomeCard({ userName, variant }: WelcomeCardProps) {
  const firstName = userName?.split(" ")[0];

  if (variant === "no-resume") {
    return (
      <div className="bg-card border rounded-xl p-8 max-w-lg mx-auto text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Briefcase className="w-8 h-8 text-primary" />
        </div>

        <h1 className="text-2xl font-bold mb-2">
          {firstName ? `Welcome, ${firstName}!` : "Welcome to JobTracker!"}
        </h1>

        <p className="text-muted-foreground mb-6 leading-relaxed">
          Track all your job applications in one place. Never lose track of
          where you applied, follow up on time, and land your dream job.
        </p>

        <div className="bg-muted/50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3 text-left">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Upload className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">First, upload your resume</p>
              <p className="text-xs text-muted-foreground">
                This helps us organize your applications
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/profile"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload Your Resume
        </Link>
      </div>
    );
  }

  // variant === "no-applications"
  return (
    <div className="space-y-6">
      <div className="bg-card border rounded-xl p-8 max-w-lg mx-auto text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-8 h-8 text-green-600" />
        </div>

        <h1 className="text-2xl font-bold mb-2">You're all set!</h1>

        <p className="text-muted-foreground mb-6 leading-relaxed">
          Your resume is uploaded and ready to go. Start adding job applications
          to track your progress through the hiring process.
        </p>

        <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
          <p className="font-medium text-sm mb-2">Quick tips:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Add applications as you apply to jobs</li>
            <li>• Track status from "Saved" to "Offer"</li>
            <li>• Never miss a follow-up again</li>
          </ul>
        </div>

        <Link
          href="/applications/new"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Your First Application
        </Link>
      </div>

      <div className="max-w-4xl mx-auto">
        <InlineTailoringGuide />
      </div>
    </div>
  );
}
