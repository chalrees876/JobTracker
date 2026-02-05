"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Loader2, Download, Check } from "lucide-react";
import type { ResumeData } from "@shared/types";

interface BaseResume {
  id: string;
  name: string;
  fileName: string | null;
  fileType: string | null;
  content: ResumeData | null;
  isDefault: boolean;
}

interface GeneratedResume {
  id: string;
  content: ResumeData;
  keywords: string[];
}

export default function NewApplicationPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "generating" | "review">("form");

  // Form state
  const [companyName, setCompanyName] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");

  // Resume state
  const [baseResumes, setBaseResumes] = useState<BaseResume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [loadingResumes, setLoadingResumes] = useState(true);

  // Generated result
  const [applicationId, setApplicationId] = useState<string>("");
  const [generatedResume, setGeneratedResume] = useState<GeneratedResume | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchResumes();
  }, []);

  async function fetchResumes() {
    try {
      const res = await fetch("/api/resumes");
      const data = await res.json();
      if (data.success) {
        setBaseResumes(data.data);
        // Select default resume
        const defaultResume = data.data.find((r: BaseResume) => r.isDefault);
        if (defaultResume) {
          setSelectedResumeId(defaultResume.id);
        } else if (data.data.length > 0) {
          setSelectedResumeId(data.data[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch resumes:", error);
    } finally {
      setLoadingResumes(false);
    }
  }

  async function createApplication() {
    const appRes = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName,
        title,
        url: url || `https://example.com/jobs/${Date.now()}`,
        description,
      }),
    });

    const appData = await appRes.json();
    if (!appRes.ok) throw new Error(appData.error || "Failed to create application");

    return appData.data.id as string;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const action = submitter?.value; // "mark_applied" | "generate_resume"

    setError("");

    try {
      // Always create the application first (both scenarios need it)
      const appId = await createApplication();
      setApplicationId(appId);

      // Scenario A: Mark Applied -> update status + redirect, DONE
      if (action === "mark_applied") {
        await fetch(`/api/applications/${appId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "APPLIED",
            appliedAt: new Date().toISOString(),
            appliedWithResumeId: selectedResumeId || null,
          }),
        });

        router.push("/applications");
        return;
      }

      // Scenario B: Generate Resume -> require resume selection and job description
      if (!selectedResumeId) {
        setError("Please select a resume to tailor");
        return;
      }

      if (!description.trim()) {
        setError("Job description is required to generate a tailored resume");
        return;
      }

      setStep("generating");

      const resumeRes = await fetch(`/api/applications/${appId}/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseResumeId: selectedResumeId }),
      });

      const resumeData = await resumeRes.json();
      if (!resumeRes.ok) throw new Error(resumeData.error || "Failed to generate resume");

      setGeneratedResume(resumeData.data);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("form");
    }
  }

  async function markAsApplied() {
    try {
      await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "APPLIED",
          appliedAt: new Date().toISOString(),
          appliedWithResumeId: selectedResumeId || null,
        }),
      });
      router.push("/applications");
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  }

  if (loadingResumes) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/applications"
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold">Add Application</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {step === "form" && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Job Details */}
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <h2 className="font-semibold">Job Details</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Job Posting URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Job Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={8}
                  placeholder="Paste the full job description here (optional for tracking, required for resume generation)..."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Optional for tracking. Required if you want to generate a tailored resume.
                </p>
              </div>
            </div>

            {/* Resume Selection - only show if user has resumes */}
            {baseResumes.length > 0 && (
              <div className="bg-card border rounded-lg p-6 space-y-4">
                <div>
                  <h2 className="font-semibold">Resume Used (Optional)</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select which resume you used to apply, or generate a tailored version.
                  </p>
                </div>

                <div className="space-y-2">
                  {baseResumes.map((resume) => (
                    <label
                      key={resume.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedResumeId === resume.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted"
                      }`}
                    >
                      <input
                        type="radio"
                        name="resume"
                        value={resume.id}
                        checked={selectedResumeId === resume.id}
                        onChange={(e) => setSelectedResumeId(e.target.value)}
                        className="w-4 h-4 text-primary"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{resume.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {resume.fileName || (resume.content?.skills?.slice(0, 5).join(", ")) || "No file"}
                        </div>
                      </div>
                      {resume.isDefault && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* No resumes hint */}
            {baseResumes.length === 0 && (
              <div className="bg-muted/50 border border-dashed rounded-lg p-6 text-center">
                <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No saved resumes yet.{" "}
                  <Link href="/profile" className="text-primary hover:underline">
                    Add a resume
                  </Link>{" "}
                  to generate tailored versions.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                type="submit"
                name="action"
                value="mark_applied"
                className="flex-1 bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Mark as Applied
              </button>
              {baseResumes.length > 0 && (
                <button
                  type="submit"
                  name="action"
                  value="generate_resume"
                  className="flex-1 border py-3 rounded-lg font-medium hover:bg-muted transition-colors"
                >
                  Generate Tailored Resume
                </button>
              )}
            </div>
          </form>
        )}

        {step === "generating" && (
          <div className="text-center py-16">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Generating Your Resume</h2>
            <p className="text-muted-foreground">
              Analyzing job description and tailoring your resume...
            </p>
          </div>
        )}

        {step === "review" && generatedResume && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
              <Check className="w-5 h-5" />
              Resume generated successfully!
            </div>

            {/* Keywords */}
            <div className="bg-card border rounded-lg p-6">
              <h2 className="font-semibold mb-3">Extracted Keywords</h2>
              <div className="flex flex-wrap gap-2">
                {generatedResume.keywords.map((keyword, i) => (
                  <span
                    key={i}
                    className="bg-primary/10 text-primary px-2 py-1 rounded text-sm"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            {/* Resume Preview */}
            <div className="bg-card border rounded-lg p-6">
              <h2 className="font-semibold mb-4">Tailored Resume Preview</h2>
              <ResumePreview content={generatedResume.content} />
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  // TODO: Implement PDF download
                  alert("PDF download coming soon!");
                }}
                className="flex-1 flex items-center justify-center gap-2 border py-3 rounded-lg font-medium hover:bg-muted transition-colors"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
              <button
                onClick={markAsApplied}
                className="flex-1 bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Mark as Applied
              </button>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Or{" "}
              <Link href="/applications" className="text-primary hover:underline">
                save for later
              </Link>{" "}
              without marking as applied
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function ResumePreview({ content }: { content: ResumeData }) {
  return (
    <div className="space-y-4 text-sm">
      {/* Header */}
      <div className="text-center border-b pb-4">
        <h3 className="text-lg font-bold">{content.name}</h3>
        <p className="text-muted-foreground">
          {[content.email, content.phone, content.location]
            .filter(Boolean)
            .join(" • ")}
        </p>
      </div>

      {/* Summary */}
      {content.summary && (
        <div>
          <h4 className="font-semibold text-primary mb-1">Summary</h4>
          <p>{content.summary}</p>
        </div>
      )}

      {/* Skills */}
      {content.skills && content.skills.length > 0 && (
        <div>
          <h4 className="font-semibold text-primary mb-1">Skills</h4>
          <p>{content.skills.join(", ")}</p>
        </div>
      )}

      {/* Experience */}
      {content.experience && content.experience.length > 0 && (
        <div>
          <h4 className="font-semibold text-primary mb-2">Experience</h4>
          <div className="space-y-3">
            {content.experience.map((exp, i) => (
              <div key={i}>
                <div className="flex justify-between">
                  <span className="font-medium">{exp.title}</span>
                  <span className="text-muted-foreground text-xs">
                    {exp.startDate} - {exp.endDate || "Present"}
                  </span>
                </div>
                <div className="text-muted-foreground">{exp.company}</div>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  {exp.bullets.map((bullet, j) => (
                    <li key={j}>{bullet}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {content.education && content.education.length > 0 && (
        <div>
          <h4 className="font-semibold text-primary mb-2">Education</h4>
          <div className="space-y-2">
            {content.education.map((edu, i) => (
              <div key={i}>
                <div className="font-medium">
                  {edu.degree} {edu.field && `in ${edu.field}`}
                </div>
                <div className="text-muted-foreground">
                  {edu.institution}
                  {edu.graduationDate && ` • ${edu.graduationDate}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
