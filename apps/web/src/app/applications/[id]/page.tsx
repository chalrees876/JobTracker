"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Calendar,
  MapPin,
  FileText,
  Download,
  ChevronDown,
  Clock,
  Building2,
  Briefcase,
  DollarSign,
  Pencil,
  Trash2,
  Check,
  X,
  Plus,
  Sparkles,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ApplicationStatus,
  APPLICATION_STATUS_LABELS,
  type ResumeData,
} from "@shared/types";

interface ResumeVersion {
  id: string;
  content: ResumeData;
  keywords: string[];
  createdAt: string;
  baseResume: { name: string } | null;
}

interface ApplicationDetail {
  id: string;
  companyName: string;
  title: string;
  location: string | null;
  url: string | null;
  description: string;
  salary: string | null;
  source: string | null;
  status: string;
  notes: string | null;
  appliedAt: string | null;
  appliedWithResumeId: string | null;
  appliedWithResume: { id: string; name: string } | null;
  finalResumeFileName: string | null;
  finalResumeFileType: string | null;
  finalResumeFileSize: number | null;
  finalResumeFilePath: string | null;
  finalResumeUploadedAt: string | null;
  createdAt: string;
  updatedAt: string;
  resumeVersions: ResumeVersion[];
  contacts: {
    id: string;
    name: string;
    role: string | null;
    email: string | null;
    linkedinUrl: string | null;
  }[];
  companyInfo: {
    id: string;
    missionStatement: string | null;
    recentNews: string[];
  } | null;
}

const STATUS_COLORS: Record<string, string> = {
  saved: "bg-gray-100 text-gray-700 border-gray-200",
  applied: "bg-blue-100 text-blue-700 border-blue-200",
  phone_screen: "bg-yellow-100 text-yellow-700 border-yellow-200",
  interview: "bg-purple-100 text-purple-700 border-purple-200",
  offer: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  withdrawn: "bg-gray-100 text-gray-500 border-gray-200",
};

const STATUS_OPTIONS: ApplicationStatus[] = [
  "saved",
  "applied",
  "phone_screen",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
];

export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "resume" | "contacts">("overview");
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const finalResumeInputRef = useRef<HTMLInputElement>(null);
  const [finalResumeUploading, setFinalResumeUploading] = useState(false);
  const [finalResumeError, setFinalResumeError] = useState("");

  // For setting/changing resume used
  const [baseResumes, setBaseResumes] = useState<{ id: string; name: string }[]>([]);
  const [editingResumeUsed, setEditingResumeUsed] = useState(false);
  const [selectedBaseResumeId, setSelectedBaseResumeId] = useState<string>("");

  useEffect(() => {
    fetchApplication();
    fetchBaseResumes();
  }, [id]);

  async function fetchBaseResumes() {
    try {
      const res = await fetch("/api/resumes");
      const data = await res.json();
      if (data.success) {
        setBaseResumes(data.data.map((r: { id: string; name: string }) => ({ id: r.id, name: r.name })));
      }
    } catch (err) {
      console.error("Failed to fetch base resumes:", err);
    }
  }

  async function fetchApplication() {
    try {
      const res = await fetch(`/api/applications/${id}`);
      const data = await res.json();
      if (data.success) {
        setApplication(data.data);
        setNotes(data.data.notes || "");
        if (data.data.resumeVersions.length > 0) {
          setSelectedResumeId(data.data.resumeVersions[0].id);
        }
      } else {
        setError(data.error || "Application not found");
      }
    } catch (err) {
      setError("Failed to load application");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(status: string) {
    if (!application) return;

    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(status === "APPLIED" && !application.appliedAt
            ? { appliedAt: new Date().toISOString() }
            : {}),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setApplication((prev) => prev ? { ...prev, status, appliedAt: data.data.appliedAt } : null);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
    setShowStatusMenu(false);
  }

  async function saveNotes() {
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });

      if (res.ok) {
        setApplication((prev) => prev ? { ...prev, notes } : null);
        setEditingNotes(false);
      }
    } catch (err) {
      console.error("Failed to save notes:", err);
    }
  }

  async function deleteApplication() {
    if (!confirm("Are you sure you want to delete this application?")) return;

    try {
      const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/applications");
      }
    } catch (err) {
      console.error("Failed to delete application:", err);
    }
  }

  async function saveResumeUsed() {
    if (!application) return;

    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appliedWithResumeId: selectedBaseResumeId || null,
        }),
      });

      if (res.ok) {
        // Refresh to get updated data with resume name
        await fetchApplication();
        setEditingResumeUsed(false);
      }
    } catch (err) {
      console.error("Failed to save resume used:", err);
    }
  }

  async function generateResume() {
    if (!application) return;

    setGenerating(true);
    try {
      const res = await fetch(`/api/applications/${id}/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (data.success) {
        // Refresh application to get new resume version
        await fetchApplication();
        setActiveTab("resume");
      } else {
        alert(data.error || "Failed to generate resume");
      }
    } catch (err) {
      console.error("Failed to generate resume:", err);
      alert("Failed to generate resume");
    } finally {
      setGenerating(false);
    }
  }

  async function uploadFinalResume(file: File) {
    if (!application) return;
    setFinalResumeUploading(true);
    setFinalResumeError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/applications/${id}/final-resume`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload final resume");
      setApplication((prev) =>
        prev
          ? {
              ...prev,
              finalResumeFileName: data.data?.fileName ?? prev.finalResumeFileName,
              finalResumeFileType: data.data?.fileType ?? prev.finalResumeFileType,
              finalResumeFileSize: data.data?.fileSize ?? prev.finalResumeFileSize,
              finalResumeFilePath: data.data?.filePath ?? prev.finalResumeFilePath,
              finalResumeUploadedAt: data.data?.uploadedAt ?? prev.finalResumeUploadedAt,
            }
          : prev
      );
    } catch (err) {
      setFinalResumeError(err instanceof Error ? err.message : "Failed to upload final resume");
    } finally {
      setFinalResumeUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error || !application) {
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
            <h1 className="text-xl font-semibold">Application Not Found</h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground mb-4">{error || "This application doesn't exist or you don't have access to it."}</p>
          <Link
            href="/applications"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg"
          >
            Back to Applications
          </Link>
        </main>
      </div>
    );
  }

  const selectedResume = application.resumeVersions.find((r) => r.id === selectedResumeId);
  const statusLower = application.status.toLowerCase();
  const hasUrl = Boolean(application.url);
  const resumeCount =
    application.resumeVersions.length > 0
      ? application.resumeVersions.length
      : application.appliedWithResume
      ? 1
      : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/applications"
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold">{application.companyName}</h1>
                <p className="text-muted-foreground">{application.title}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Status Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium",
                    STATUS_COLORS[statusLower]
                  )}
                >
                  {APPLICATION_STATUS_LABELS[statusLower as ApplicationStatus]}
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showStatusMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowStatusMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 bg-card border rounded-lg shadow-lg z-20 py-1 min-w-[160px]">
                      {STATUS_OPTIONS.map((status) => (
                        <button
                          key={status}
                          onClick={() => updateStatus(status.toUpperCase())}
                          className={cn(
                            "w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2",
                            statusLower === status && "bg-muted"
                          )}
                        >
                          {statusLower === status && <Check className="w-4 h-4" />}
                          <span className={statusLower === status ? "" : "ml-6"}>
                            {APPLICATION_STATUS_LABELS[status]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* External Link */}
              {hasUrl && (
                <a
                  href={application.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="View Job Posting"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              )}

              {/* Delete */}
              <button
                onClick={deleteApplication}
                className="p-2 hover:bg-destructive/10 rounded-lg transition-colors text-destructive"
                title="Delete Application"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="flex border-b">
              {(["overview", "resume", "contacts"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                    activeTab === tab
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab === "overview" && "Overview"}
                  {tab === "resume" &&
                    `Resumes${resumeCount ? ` (${resumeCount})` : ""}`}
                  {tab === "contacts" && `Contacts (${application.contacts.length})`}
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Resume Used */}
                <div className="bg-card border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold">Resume Used</h2>
                    {!editingResumeUsed && baseResumes.length > 0 && (
                      <button
                        onClick={() => {
                          setSelectedBaseResumeId(application.appliedWithResumeId || "");
                          setEditingResumeUsed(true);
                        }}
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <Pencil className="w-3 h-3" />
                        {application.appliedWithResume ? "Change" : "Set"}
                      </button>
                    )}
                  </div>

                  {editingResumeUsed ? (
                    <div className="space-y-3">
                      <select
                        value={selectedBaseResumeId}
                        onChange={(e) => setSelectedBaseResumeId(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      >
                        <option value="">-- No resume selected --</option>
                        {baseResumes.map((resume) => (
                          <option key={resume.id} value={resume.id}>
                            {resume.name}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={saveResumeUsed}
                          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingResumeUsed(false)}
                          className="px-3 py-1.5 border rounded-lg text-sm font-medium hover:bg-muted"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : application.appliedWithResume ? (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{application.appliedWithResume.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Used when applying on {application.appliedAt ? new Date(application.appliedAt).toLocaleDateString() : "N/A"}
                        </p>
                      </div>
                      <a
                        href={`/api/resumes/${application.appliedWithResume.id}/file`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted transition-colors flex items-center gap-1"
                      >
                        <Download className="w-4 h-4" />
                        View
                      </a>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      No resume recorded for this application.
                      {baseResumes.length > 0 ? " Click 'Set' above to record which resume you used." : ""}
                    </p>
                  )}
                </div>

                {/* Job Description */}
                <div className="bg-card border rounded-lg p-6">
                  <h2 className="font-semibold mb-4">Job Description</h2>
                  {application.description ? (
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap font-sans text-sm text-muted-foreground">
                        {application.description}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No job description provided.</p>
                  )}
                </div>

                {/* Notes */}
                <div className="bg-card border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold">Notes</h2>
                    {!editingNotes && (
                      <button
                        onClick={() => setEditingNotes(true)}
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                    )}
                  </div>

                  {editingNotes ? (
                    <div className="space-y-3">
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={4}
                        placeholder="Add notes about this application..."
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={saveNotes}
                          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setNotes(application.notes || "");
                            setEditingNotes(false);
                          }}
                          className="px-3 py-1.5 border rounded-lg text-sm font-medium hover:bg-muted"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : application.notes ? (
                    <p className="text-sm whitespace-pre-wrap">{application.notes}</p>
                  ) : (
                    <p className="text-muted-foreground text-sm">No notes yet. Click edit to add some.</p>
                  )}
                </div>
              </div>
            )}

            {/* Resume Tab */}
            {activeTab === "resume" && (
              <div className="space-y-6">
                {/* Final Resume */}
                <div className="bg-card border rounded-lg p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Final Resume</h3>
                    {application.finalResumeFileName && (
                      <a
                        href={`/api/applications/${application.id}/final-resume`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        View
                      </a>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Upload the exact file you actually submitted for this application.
                  </p>
                  {finalResumeError && (
                    <div className="text-sm text-destructive">{finalResumeError}</div>
                  )}
                  {application.finalResumeFileName && (
                    <div className="text-sm text-muted-foreground">
                      Uploaded: {application.finalResumeFileName}
                    </div>
                  )}
                  {application.finalResumeUploadedAt && (
                    <div className="text-xs text-muted-foreground">
                      {new Date(application.finalResumeUploadedAt).toLocaleDateString()}
                    </div>
                  )}
                  <div>
                    <input
                      ref={finalResumeInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadFinalResume(file);
                      }}
                      disabled={finalResumeUploading}
                    />
                    <button
                      onClick={() => finalResumeInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-muted transition-colors"
                      disabled={finalResumeUploading}
                    >
                      <Upload className="w-4 h-4" />
                      {finalResumeUploading ? "Uploading..." : "Upload Final Resume"}
                    </button>
                  </div>
                </div>

                {/* Base Resume Used */}
                {application.appliedWithResume && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-900">
                          Applied with: {application.appliedWithResume.name}
                        </p>
                        <p className="text-sm text-blue-700">
                          This is the base resume you used for this application
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {application.resumeVersions.length === 0 && !application.appliedWithResume ? (
                  <div className="bg-card border rounded-lg p-8 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">No Resume Recorded</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      No resume was recorded for this application. You can generate a tailored resume below.
                    </p>
                    <button
                      onClick={generateResume}
                      disabled={generating || !application.description}
                      className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {generating ? (
                        <>Generating...</>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Generate Tailored Resume
                        </>
                      )}
                    </button>
                    {!application.description && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Add a job description to enable resume generation.
                      </p>
                    )}
                  </div>
                ) : application.resumeVersions.length === 0 ? (
                  <div className="bg-card border rounded-lg p-6">
                    <h3 className="font-semibold mb-2">Generate a Tailored Version</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Want an ATS-optimized version? Generate a tailored resume for this job.
                    </p>
                    <button
                      onClick={generateResume}
                      disabled={generating || !application.description}
                      className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {generating ? (
                        <>Generating...</>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Generate Tailored Resume
                        </>
                      )}
                    </button>
                    {!application.description && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Add a job description to enable resume generation.
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Resume Version Selector */}
                    {application.resumeVersions.length > 1 && (
                      <div className="flex gap-2 flex-wrap">
                        {application.resumeVersions.map((version, idx) => (
                          <button
                            key={version.id}
                            onClick={() => setSelectedResumeId(version.id)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-sm border",
                              selectedResumeId === version.id
                                ? "border-primary bg-primary/5"
                                : "hover:bg-muted"
                            )}
                          >
                            Version {application.resumeVersions.length - idx}
                            {version.baseResume && (
                              <span className="text-muted-foreground ml-1">
                                ({version.baseResume.name})
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {selectedResume && (
                      <>
                        {/* Keywords */}
                        <div className="bg-card border rounded-lg p-6">
                          <h3 className="font-semibold mb-3">Matched Keywords</h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedResume.keywords.map((keyword, i) => (
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
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">Resume Preview</h3>
                            <button
                              onClick={() => alert("PDF download coming soon!")}
                              className="flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm hover:bg-muted"
                            >
                              <Download className="w-4 h-4" />
                              Download PDF
                            </button>
                          </div>
                          <ResumePreview content={selectedResume.content} />
                        </div>
                      </>
                    )}

                    {/* Generate Another */}
                    <button
                      onClick={generateResume}
                      disabled={generating || !application.description}
                      className="w-full flex items-center justify-center gap-2 border border-dashed rounded-lg p-4 text-muted-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
                    >
                      {generating ? (
                        "Generating..."
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Generate Another Version
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Contacts Tab */}
            {activeTab === "contacts" && (
              <div className="space-y-4">
                {application.contacts.length === 0 ? (
                  <div className="bg-card border rounded-lg p-8 text-center">
                    <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">No Contacts Yet</h3>
                    <p className="text-muted-foreground text-sm">
                      Contact tracking coming soon!
                    </p>
                  </div>
                ) : (
                  application.contacts.map((contact) => (
                    <div key={contact.id} className="bg-card border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{contact.name}</h4>
                          {contact.role && (
                            <p className="text-sm text-muted-foreground">{contact.role}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {contact.email && (
                            <a
                              href={`mailto:${contact.email}`}
                              className="text-sm text-primary hover:underline"
                            >
                              Email
                            </a>
                          )}
                          {contact.linkedinUrl && (
                            <a
                              href={contact.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline"
                            >
                              LinkedIn
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <h3 className="font-semibold">Details</h3>

              <div className="space-y-3 text-sm">
                {application.location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span>{application.location}</span>
                  </div>
                )}

                {application.salary && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span>{application.salary}</span>
                  </div>
                )}

                {application.source && (
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span>{application.source}</span>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span>Added {new Date(application.createdAt).toLocaleDateString()}</span>
                </div>

                {application.appliedAt && (
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Applied {new Date(application.appliedAt).toLocaleDateString()}</span>
                  </div>
                )}

                {application.appliedWithResume && (
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span>Used: {application.appliedWithResume.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-card border rounded-lg p-6 space-y-3">
              <h3 className="font-semibold">Quick Actions</h3>

              {hasUrl && (
                <a
                  href={application.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 border rounded-lg px-4 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Job Posting
                </a>
              )}

              {application.resumeVersions.length > 0 && (
                <button
                  onClick={() => alert("PDF download coming soon!")}
                  className="w-full flex items-center justify-center gap-2 border rounded-lg px-4 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Resume
                </button>
              )}

              {statusLower === "saved" && (
                <button
                  onClick={() => updateStatus("APPLIED")}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Mark as Applied
                </button>
              )}
            </div>

            {/* Timeline placeholder */}
            <div className="bg-card border rounded-lg p-6">
              <h3 className="font-semibold mb-4">Activity Timeline</h3>
              <div className="space-y-3 text-sm">
                {application.appliedAt && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                    <div>
                      <p className="font-medium">Applied</p>
                      <p className="text-muted-foreground">
                        {new Date(application.appliedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                  <div>
                    <p className="font-medium">Application Added</p>
                    <p className="text-muted-foreground">
                      {new Date(application.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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
        <div className="flex justify-center gap-3 mt-1">
          {content.linkedin && (
            <a
              href={content.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary text-xs hover:underline"
            >
              LinkedIn
            </a>
          )}
          {content.website && (
            <a
              href={content.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary text-xs hover:underline"
            >
              Portfolio
            </a>
          )}
        </div>
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
                {exp.bullets && exp.bullets.length > 0 && (
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {exp.bullets.map((bullet, j) => (
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

      {/* Projects */}
      {content.projects && content.projects.length > 0 && (
        <div>
          <h4 className="font-semibold text-primary mb-2">Projects</h4>
          <div className="space-y-3">
            {content.projects.map((project, i) => (
              <div key={i}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{project.name}</span>
                  {project.url && (
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-xs"
                    >
                      Link
                    </a>
                  )}
                </div>
                <p className="text-muted-foreground">{project.description}</p>
                {project.technologies.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Tech: {project.technologies.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
