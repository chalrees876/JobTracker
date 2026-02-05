"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
  Plus,
  FileText,
  Trash2,
  Star,
  Upload,
  Download,
  File,
  Loader2,
} from "lucide-react";
import { ResumeViewer } from "@/components/ResumeViewer";

interface BaseResume {
  id: string;
  name: string;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  isDefault: boolean;
  createdAt: string;
}

interface Profile {
  id: string;
  headline: string | null;
  onboardingComplete: boolean;
  baseResumes: BaseResume[];
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType: string | null): string {
  if (fileType?.includes("pdf")) return "PDF";
  if (fileType?.includes("word") || fileType?.includes("document")) return "DOC";
  return "FILE";
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (data.success) {
        setProfile(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteResume(id: string) {
    if (!confirm("Are you sure you want to delete this resume?")) return;

    try {
      const res = await fetch(`/api/resumes/${id}`, { method: "DELETE" });
      if (res.ok) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                baseResumes: prev.baseResumes.filter((r) => r.id !== id),
              }
            : null
        );
      }
    } catch (error) {
      console.error("Failed to delete resume:", error);
    }
  }

  async function setDefaultResume(id: string) {
    try {
      const res = await fetch(`/api/resumes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (res.ok) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                baseResumes: prev.baseResumes.map((r) => ({
                  ...r,
                  isDefault: r.id === id,
                })),
              }
            : null
        );
      }
    } catch (error) {
      console.error("Failed to set default resume:", error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl font-bold text-primary">
              JobTracker
            </Link>
            <nav className="flex gap-4 ml-8">
              <Link
                href="/applications"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Applications
              </Link>
              <Link href="/profile" className="text-foreground font-medium">
                Profile
              </Link>
            </nav>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Your Profile</h1>
          <p className="text-muted-foreground">
            Upload your resumes as PDF or Word documents. Select which one you
            used when tracking job applications.
          </p>
        </div>

        {/* User Info */}
        <div className="bg-card border rounded-lg p-6 mb-8">
          <div className="flex items-center gap-4">
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || "User"}
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-semibold text-primary">
                  {session?.user?.name?.[0] || session?.user?.email?.[0] || "U"}
                </span>
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold">{session?.user?.name}</h2>
              <p className="text-muted-foreground">{session?.user?.email}</p>
            </div>
          </div>
        </div>

        {/* Resumes Section */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your Resumes</h2>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload Resume
          </button>
        </div>

        {profile?.baseResumes.length === 0 ? (
          <div className="bg-card border-2 border-dashed rounded-lg p-12 text-center">
            <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No resumes uploaded yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Upload your resume as a PDF or Word document. You can upload
              multiple versions for different types of positions.
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium"
            >
              <Upload className="w-4 h-4" />
              Upload Your First Resume
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {profile?.baseResumes.map((resume) => (
              <ResumeCard
                key={resume.id}
                resume={resume}
                onDelete={() => deleteResume(resume.id)}
                onSetDefault={() => setDefaultResume(resume.id)}
              />
            ))}
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <UploadResumeModal
            onClose={() => setShowUploadModal(false)}
            onSuccess={(newResume) => {
              setProfile((prev) =>
                prev
                  ? {
                      ...prev,
                      baseResumes: [newResume, ...prev.baseResumes],
                    }
                  : null
              );
              setShowUploadModal(false);
            }}
          />
        )}
      </main>
    </div>
  );
}

function ResumeCard({
  resume,
  onDelete,
  onSetDefault,
}: {
  resume: BaseResume;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const fileIcon = getFileIcon(resume.fileType);

  async function handleDownload() {
    try {
      const res = await fetch(`/api/resumes/${resume.id}/file`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = resume.fileName || "resume";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Failed to download:", error);
    }
  }

  async function handleView() {
    try {
      // Open in new tab
      window.open(`/api/resumes/${resume.id}/file`, "_blank");
    } catch (error) {
      console.error("Failed to view:", error);
    }
  }

  return (
    <div className="bg-card border rounded-lg p-4 hover:border-primary/50 transition-colors">
      <div className="flex items-center gap-4">
        {/* File Type Icon */}
        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <span className="text-xs font-bold text-primary">{fileIcon}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate">{resume.name}</h3>
            {resume.isDefault && (
              <span className="flex-shrink-0 flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                <Star className="w-3 h-3" />
                Default
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {resume.fileName || "No file"}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(resume.fileSize)} •{" "}
            {new Date(resume.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {resume.fileName && (
            <>
              <button
                onClick={handleView}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                title="View"
              >
                <FileText className="w-4 h-4" />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
            </>
          )}
          {!resume.isDefault && (
            <button
              onClick={onSetDefault}
              className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors"
              title="Set as default"
            >
              <Star className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {resume.fileName && (
        <div className="mt-4">
          <ResumeViewer
            src={`/api/resumes/${resume.id}/file`}
            fileType={resume.fileType}
            fileName={resume.fileName}
            heightClassName="h-[360px]"
          />
        </div>
      )}
    </div>
  );
}

function UploadResumeModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (resume: BaseResume) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  function handleFileSelect(selectedFile: File) {
    // Validate file type
    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const ext = selectedFile.name.toLowerCase();

    if (!validTypes.includes(selectedFile.type) &&
        !ext.endsWith(".pdf") &&
        !ext.endsWith(".doc") &&
        !ext.endsWith(".docx")) {
      setError("Please upload a PDF, DOC, or DOCX file.");
      return;
    }

    // Validate file size (5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("File is too large. Maximum size is 5MB.");
      return;
    }

    setFile(selectedFile);
    setError("");

    // Auto-fill name from filename if empty
    if (!name) {
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
      setName(nameWithoutExt);
    }
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }

  async function handleUpload() {
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    if (!name.trim()) {
      setError("Please enter a name for this resume.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", name.trim());

      const res = await fetch("/api/resumes/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        onSuccess(data.data);
      } else {
        setError(data.error || "Failed to upload resume");
      }
    } catch (err) {
      setError("Failed to upload resume. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Upload Resume</h2>

          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? "border-primary bg-primary/5"
                : file
                ? "border-green-500 bg-green-50"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            {file ? (
              <div>
                <File className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <p className="font-medium text-green-700">{file.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatFileSize(file.size)}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="text-sm text-primary hover:underline mt-2"
                >
                  Choose a different file
                </button>
              </div>
            ) : (
              <div>
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium mb-1">
                  Drag and drop your resume here
                </p>
                <p className="text-sm text-muted-foreground">
                  or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  Supports PDF, DOC, DOCX (max 5MB)
                </p>
              </div>
            )}
          </div>

          {/* Name Input */}
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">
              Resume Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Software Engineer Resume, General Resume"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Give your resume a descriptive name to easily identify it later.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg font-medium hover:bg-muted transition-colors"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || !file || !name.trim()}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
