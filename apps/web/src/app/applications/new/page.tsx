"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Loader2, Check, Upload, Clock } from "lucide-react";
import type { ResumeData } from "@shared/types";
import { TailoringGuide, TailoringGuideLink } from "@/components/TailoringGuide";
import { CopyableSection, CopyAllButton, CopyButton } from "@/components/CopyableSection";
import { TailoringTips } from "@/components/TailoringTips";

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
  const [appliedResumeId, setAppliedResumeId] = useState<string>("");
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [baseResumeUploading, setBaseResumeUploading] = useState(false);
  const [baseResumeError, setBaseResumeError] = useState("");

  // Generated result
  const [applicationId, setApplicationId] = useState<string>("");
  const [generatedResume, setGeneratedResume] = useState<GeneratedResume | null>(null);
  const [error, setError] = useState("");
  const [finalResumeUploading, setFinalResumeUploading] = useState(false);
  const [finalResumeError, setFinalResumeError] = useState("");
  const [finalResumeFileName, setFinalResumeFileName] = useState<string | null>(null);
  const [useExistingStatus, setUseExistingStatus] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [resumeChoice, setResumeChoice] = useState<"upload" | "existing" | "skip">("skip");
  const [requiresUpgrade, setRequiresUpgrade] = useState(false);

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
          setAppliedResumeId(defaultResume.id);
        } else if (data.data.length > 0) {
          setSelectedResumeId(data.data[0].id);
          setAppliedResumeId(data.data[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch resumes:", error);
    } finally {
      setLoadingResumes(false);
    }
  }

  async function uploadBaseResume(file: File) {
    setBaseResumeUploading(true);
    setBaseResumeError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name.replace(/\.[^/.]+$/, ""));

      const res = await fetch("/api/resumes/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload resume");

      setBaseResumes((prev) => [data.data as BaseResume, ...prev]);
      setSelectedResumeId(data.data.id);
      setAppliedResumeId(data.data.id);
    } catch (err) {
      setBaseResumeError(err instanceof Error ? err.message : "Failed to upload resume");
    } finally {
      setBaseResumeUploading(false);
    }
  }

  async function createApplication() {
    const appRes = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName,
        title,
        url: url.trim() || undefined,
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
    setRequiresUpgrade(false);

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
            appliedWithResumeId: appliedResumeId || selectedResumeId || null,
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
      if (!resumeRes.ok) {
        if (resumeData?.code === "ATS_LIMIT_EXCEEDED") {
          setError(resumeData.error || "Free generation limit reached.");
          setRequiresUpgrade(true);
          setStep("form");
          return;
        }
        throw new Error(resumeData.error || "Failed to generate resume");
      }

      setGeneratedResume(resumeData.data);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("form");
    }
  }

  async function handleUpgrade() {
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start checkout");
      if (data?.data?.url) {
        window.location.href = data.data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout");
    }
  }

  async function markAsApplied(resumeId?: string | null) {
    try {
      const appliedResume = resumeId === undefined
        ? (appliedResumeId || selectedResumeId || null)
        : resumeId;
      await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "APPLIED",
          appliedAt: new Date().toISOString(),
          appliedWithResumeId: appliedResume,
        }),
      });
      router.push("/applications");
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  }

  async function handleReviewApply() {
    if (resumeChoice === "existing") {
      const saved = await useExistingResume();
      if (!saved) return;
      await markAsApplied(appliedResumeId);
      return;
    }

    if (resumeChoice === "upload") {
      if (!finalResumeFileName) {
        setFinalResumeError("Please upload the resume you submitted.");
        return;
      }
      await markAsApplied(null);
      return;
    }

    await markAsApplied(null);
  }

  async function uploadFinalResume(file: File) {
    if (!applicationId) {
      setFinalResumeError("Please generate a resume first.");
      return;
    }

    setFinalResumeUploading(true);
    setFinalResumeError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/applications/${applicationId}/final-resume`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload final resume");
      setFinalResumeFileName(data.data?.fileName || file.name);
    } catch (err) {
      setFinalResumeError(err instanceof Error ? err.message : "Failed to upload final resume");
    } finally {
      setFinalResumeUploading(false);
    }
  }

  async function useExistingResume(): Promise<boolean> {
    if (!applicationId) return false;
    if (!appliedResumeId) {
      setUseExistingStatus("Please select a resume.");
      return false;
    }
    setUseExistingStatus("Saving...");
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appliedWithResumeId: appliedResumeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save resume selection");
      setUseExistingStatus("Saved. You can mark as applied when ready.");
      return true;
    } catch (err) {
      setUseExistingStatus(err instanceof Error ? err.message : "Failed to save resume selection");
      return false;
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

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {step === "form" && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg space-y-3">
                <p>{error}</p>
                {requiresUpgrade && (
                  <button
                    type="button"
                    onClick={handleUpgrade}
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Upgrade to Continue
                  </button>
                )}
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
                  Job Posting URL (Optional)
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

            {/* Resume Selection */}
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <div>
                <h2 className="font-semibold">Resume Used</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Select which resume you used to apply, or generate a tailored version.
                </p>
              </div>

              {baseResumes.length > 0 ? (
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
                        onChange={(e) => {
                          setSelectedResumeId(e.target.value);
                          setAppliedResumeId(e.target.value);
                        }}
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
              ) : (
                <div className="bg-muted/50 border border-dashed rounded-lg p-4 text-center">
                  <FileText className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No saved resumes yet. Upload one below to continue.
                  </p>
                </div>
              )}

              <div className="border-t pt-4 space-y-2">
                <p className="text-sm font-medium">Upload a new resume</p>
                <p className="text-xs text-muted-foreground">
                  Upload a PDF, DOC, or DOCX file to add it to your saved resumes.
                </p>
                {baseResumeError && (
                  <div className="text-sm text-destructive">{baseResumeError}</div>
                )}
                <label className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-muted transition-colors cursor-pointer">
                  <Upload className="w-4 h-4" />
                  {baseResumeUploading ? "Uploading..." : "Upload Resume"}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadBaseResume(file);
                      e.currentTarget.value = "";
                    }}
                    disabled={baseResumeUploading}
                  />
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
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
                    Generate ATS-Tailored Content
                  </button>
                )}
              </div>
              {baseResumes.length > 0 && (
                <div className="text-center">
                  <TailoringGuideLink onClick={() => setShowGuide(true)} />
                </div>
              )}
            </div>
          </form>
        )}

        <TailoringGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />

        {step === "generating" && (
          <div className="text-center py-16">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Generating ATS-Tailored Content</h2>
            <p className="text-muted-foreground">
              Analyzing the job description and tailoring your resume content...
            </p>
          </div>
        )}

        {step === "review" && generatedResume && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
              <Check className="w-5 h-5" />
              Tailored content generated! Copy what you need into your resume.
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content - 2 columns */}
              <div className="lg:col-span-2 space-y-6">
                {/* Resume Preview with Copy Buttons */}
                <div className="bg-card border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold">Tailored Content</h2>
                    <CopyAllButton content={formatResumeForCopy(generatedResume.content)} />
                  </div>
                  <ResumePreviewWithCopy content={generatedResume.content} />
                </div>

                {/* Resume for This Application */}
                <div className="bg-card border rounded-lg p-6 space-y-4">
                  <div>
                    <h2 className="font-semibold">Resume for This Application</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Attach the resume you're submitting with this application.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label
                      className={`flex gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                        resumeChoice === "upload" ? "border-primary bg-primary/5" : "hover:bg-muted"
                      }`}
                    >
                      <input
                        type="radio"
                        name="resumeChoice"
                        value="upload"
                        checked={resumeChoice === "upload"}
                        onChange={() => setResumeChoice("upload")}
                        className="mt-1 h-4 w-4 text-primary"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 font-medium">
                          <Upload className="w-4 h-4 text-primary" />
                          Upload new resume
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Upload the resume you updated with the tailored content above.
                        </p>
                      </div>
                    </label>

                    {resumeChoice === "upload" && (
                      <div className="space-y-2 border rounded-lg p-4">
                        {finalResumeError && (
                          <div className="text-sm text-destructive">{finalResumeError}</div>
                        )}
                        {finalResumeFileName && (
                          <div className="text-sm text-muted-foreground">
                            Uploaded: {finalResumeFileName}
                          </div>
                        )}
                        <label className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-muted transition-colors cursor-pointer">
                          <Upload className="w-4 h-4" />
                          {finalResumeUploading ? "Uploading..." : "Upload Resume"}
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) uploadFinalResume(file);
                            }}
                            disabled={finalResumeUploading}
                          />
                        </label>
                      </div>
                    )}

                    <label
                      className={`flex gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                        resumeChoice === "existing" ? "border-primary bg-primary/5" : "hover:bg-muted"
                      }`}
                    >
                      <input
                        type="radio"
                        name="resumeChoice"
                        value="existing"
                        checked={resumeChoice === "existing"}
                        onChange={() => setResumeChoice("existing")}
                        className="mt-1 h-4 w-4 text-primary"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 font-medium">
                          <FileText className="w-4 h-4 text-primary" />
                          Use a saved resume
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Select from your saved resumes.
                        </p>
                      </div>
                    </label>

                    {resumeChoice === "existing" && (
                      <div className="space-y-2 border rounded-lg p-4">
                        {baseResumes.length > 0 ? (
                          <div className="space-y-2">
                            {baseResumes.map((resume) => (
                              <label
                                key={resume.id}
                                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                  appliedResumeId === resume.id
                                    ? "border-primary bg-primary/5"
                                    : "hover:bg-muted"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="savedResume"
                                  value={resume.id}
                                  checked={appliedResumeId === resume.id}
                                  onChange={(e) => setAppliedResumeId(e.target.value)}
                                  className="h-4 w-4 text-primary"
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
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No saved resumes available.
                          </p>
                        )}
                        {useExistingStatus && (
                          <div className="text-xs text-muted-foreground">{useExistingStatus}</div>
                        )}
                      </div>
                    )}

                    <label
                      className={`flex gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                        resumeChoice === "skip" ? "border-primary bg-primary/5" : "hover:bg-muted"
                      }`}
                    >
                      <input
                        type="radio"
                        name="resumeChoice"
                        value="skip"
                        checked={resumeChoice === "skip"}
                        onChange={() => setResumeChoice("skip")}
                        className="mt-1 h-4 w-4 text-primary"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 font-medium">
                          <Clock className="w-4 h-4 text-primary" />
                          Skip for now
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          You can always attach a resume later from the application page.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button
                    onClick={handleReviewApply}
                    className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    Mark as Applied
                  </button>
                  <div className="text-center text-sm text-muted-foreground">
                    <Link href="/applications" className="text-primary hover:underline">
                      Save for later
                    </Link>
                  </div>
                </div>
              </div>

              {/* Sidebar - 1 column */}
              <div className="space-y-4">
                <TailoringTips keywords={generatedResume.keywords} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function formatResumeForCopy(content: ResumeData): string {
  const sections: string[] = [];

  // Header
  sections.push(content.name);
  const contactLine = [content.email, content.phone, content.location].filter(Boolean).join(" | ");
  if (contactLine) sections.push(contactLine);
  const linkLine = [content.linkedin, content.website].filter(Boolean).join(" | ");
  if (linkLine) sections.push(linkLine);
  sections.push("");

  // Summary
  if (content.summary) {
    sections.push("SUMMARY");
    sections.push(content.summary);
    sections.push("");
  }

  // Skills
  if (content.skills && content.skills.length > 0) {
    sections.push("SKILLS");
    sections.push(content.skills.join(", "));
    sections.push("");
  }

  // Experience
  if (content.experience && content.experience.length > 0) {
    sections.push("EXPERIENCE");
    for (const exp of content.experience) {
      sections.push(`${exp.company} | ${exp.title}`);
      sections.push(`${exp.startDate} - ${exp.endDate || "Present"}${exp.location ? ` | ${exp.location}` : ""}`);
      for (const bullet of exp.bullets) {
        sections.push(`• ${bullet}`);
      }
      sections.push("");
    }
  }

  // Projects
  if (content.projects && content.projects.length > 0) {
    sections.push("PROJECTS");
    for (const project of content.projects) {
      sections.push(`${project.name}${project.url ? ` | ${project.url}` : ""}`);
      if (project.description) sections.push(project.description);
      if (project.technologies?.length) {
        sections.push(`Technologies: ${project.technologies.join(", ")}`);
      }
      for (const bullet of project.bullets) {
        sections.push(`• ${bullet}`);
      }
      sections.push("");
    }
  }

  // Education
  if (content.education && content.education.length > 0) {
    sections.push("EDUCATION");
    for (const edu of content.education) {
      sections.push(`${edu.institution}`);
      sections.push(`${edu.degree}${edu.field ? ` in ${edu.field}` : ""}${edu.graduationDate ? ` • ${edu.graduationDate}` : ""}`);
      sections.push("");
    }
  }

  return sections.join("\n");
}

function formatExperienceForCopy(exp: ResumeData["experience"][0]): string {
  const lines: string[] = [];
  lines.push(`${exp.company} | ${exp.title}`);
  lines.push(`${exp.startDate} - ${exp.endDate || "Present"}${exp.location ? ` | ${exp.location}` : ""}`);
  for (const bullet of exp.bullets) {
    lines.push(`• ${bullet}`);
  }
  return lines.join("\n");
}

function formatProjectForCopy(project: ResumeData["projects"][0]): string {
  const lines: string[] = [];
  lines.push(`${project.name}${project.url ? ` | ${project.url}` : ""}`);
  if (project.description) lines.push(project.description);
  if (project.technologies?.length) {
    lines.push(`Technologies: ${project.technologies.join(", ")}`);
  }
  for (const bullet of project.bullets) {
    lines.push(`• ${bullet}`);
  }
  return lines.join("\n");
}

function ResumePreviewWithCopy({ content }: { content: ResumeData }) {
  const contactLine = [content.email, content.phone, content.location].filter(Boolean).join(" • ");
  const linkLine = [content.linkedin, content.website].filter(Boolean).join(" • ");
  const headerCopy = [content.name, contactLine, linkLine].filter(Boolean).join("\n");

  return (
    <div className="space-y-4 text-sm">
      {/* Header */}
      <CopyableSection
        title="Header"
        content={headerCopy}
      >
        <div className="text-center border-b pb-4">
          <h3 className="text-lg font-bold">{content.name}</h3>
          {contactLine && (
            <p className="text-muted-foreground">
              {contactLine}
            </p>
          )}
          {linkLine && (
            <p className="text-muted-foreground text-xs mt-1">
              {linkLine}
            </p>
          )}
        </div>
      </CopyableSection>

      {/* Summary */}
      {content.summary && (
        <CopyableSection title="Summary" content={content.summary}>
          <p>{content.summary}</p>
        </CopyableSection>
      )}

      {/* Skills */}
      {content.skills && content.skills.length > 0 && (
        <CopyableSection title="Skills" content={content.skills.join(", ")}>
          <p>{content.skills.join(", ")}</p>
        </CopyableSection>
      )}

      {/* Experience */}
      {content.experience && content.experience.length > 0 && (
        <div>
          <h4 className="font-semibold text-primary mb-2">Experience</h4>
          <div className="space-y-3">
            {content.experience.map((exp, i) => (
              <div
                key={i}
                className="group relative pl-0 hover:bg-muted/50 -mx-2 px-2 py-1 rounded transition-colors focus:outline-none"
                tabIndex={0}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-medium">{exp.title}</span>
                    <span className="text-muted-foreground"> at {exp.company}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {exp.startDate} - {exp.endDate || "Present"}
                    </span>
                    <CopyButton
                      content={formatExperienceForCopy(exp)}
                      label="Copy"
                      className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
                    />
                  </div>
                </div>
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

      {/* Projects */}
      {content.projects && content.projects.length > 0 && (
        <div>
          <h4 className="font-semibold text-primary mb-2">Projects</h4>
          <div className="space-y-3">
            {content.projects.map((project, i) => (
              <div
                key={i}
                className="group relative pl-0 hover:bg-muted/50 -mx-2 px-2 py-1 rounded transition-colors focus:outline-none"
                tabIndex={0}
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="font-medium">{project.name}</span>
                    {project.url && (
                      <span className="text-muted-foreground"> • {project.url}</span>
                    )}
                  </div>
                  <CopyButton
                    content={formatProjectForCopy(project)}
                    label="Copy"
                    className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
                  />
                </div>
                {project.description && (
                  <div className="text-muted-foreground mt-1">{project.description}</div>
                )}
                {project.technologies && project.technologies.length > 0 && (
                  <div className="text-muted-foreground text-xs mt-1">
                    Tech: {project.technologies.join(", ")}
                  </div>
                )}
                {project.bullets.length > 0 && (
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {project.bullets.map((bullet, j) => (
                      <li key={j}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {content.education && content.education.length > 0 && (
        <CopyableSection
          title="Education"
          content={content.education
            .map((edu) => `${edu.institution}\n${edu.degree}${edu.field ? ` in ${edu.field}` : ""}${edu.graduationDate ? ` • ${edu.graduationDate}` : ""}`)
            .join("\n\n")}
        >
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
        </CopyableSection>
      )}
    </div>
  );
}
