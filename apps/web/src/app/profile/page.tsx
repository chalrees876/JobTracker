"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Plus, FileText, Trash2, Star, Edit2, Check, X } from "lucide-react";
import type { ResumeData } from "@shared/types";

interface BaseResume {
  id: string;
  name: string;
  content: ResumeData;
  isDefault: boolean;
  createdAt: string;
}

interface Profile {
  id: string;
  headline: string | null;
  onboardingComplete: boolean;
  baseResumes: BaseResume[];
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddResume, setShowAddResume] = useState(false);

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
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Your Profile</h1>
          <p className="text-muted-foreground">
            Manage your base resumes. When you apply to jobs, we'll tailor these
            to match the job description.
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

        {/* Base Resumes */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your Resumes</h2>
          <button
            onClick={() => setShowAddResume(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Resume
          </button>
        </div>

        {profile?.baseResumes.length === 0 ? (
          <div className="bg-card border rounded-lg p-8 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No resumes yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first resume to start generating tailored versions for
              job applications.
            </p>
            <button
              onClick={() => setShowAddResume(true)}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Your First Resume
            </button>
          </div>
        ) : (
          <div className="space-y-4">
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

        {/* Add Resume Modal */}
        {showAddResume && (
          <AddResumeModal
            onClose={() => setShowAddResume(false)}
            onSuccess={(newResume) => {
              setProfile((prev) =>
                prev
                  ? {
                      ...prev,
                      baseResumes: [newResume, ...prev.baseResumes],
                    }
                  : null
              );
              setShowAddResume(false);
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
  const content = resume.content as ResumeData;

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">{resume.name}</h3>
            {resume.isDefault && (
              <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                <Star className="w-3 h-3" />
                Default
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {content.name} • {content.email}
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>{content.experience?.length || 0} experiences</span>
            <span>•</span>
            <span>{content.skills?.length || 0} skills</span>
            <span>•</span>
            <span>{content.education?.length || 0} education</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
    </div>
  );
}

function AddResumeModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (resume: BaseResume) => void;
}) {
  const [step, setStep] = useState<"name" | "content">("name");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Resume content fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [website, setWebsite] = useState("");
  const [summary, setSummary] = useState("");
  const [skills, setSkills] = useState("");
  const [experience, setExperience] = useState<
    Array<{
      company: string;
      title: string;
      startDate: string;
      endDate: string;
      location: string;
      bullets: string;
    }>
  >([{ company: "", title: "", startDate: "", endDate: "", location: "", bullets: "" }]);
  const [education, setEducation] = useState<
    Array<{
      institution: string;
      degree: string;
      field: string;
      graduationDate: string;
    }>
  >([{ institution: "", degree: "", field: "", graduationDate: "" }]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const content: ResumeData = {
        name: fullName,
        email,
        phone: phone || null,
        location: location || null,
        linkedin: linkedin || null,
        website: website || null,
        summary: summary || null,
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        experience: experience
          .filter((e) => e.company && e.title)
          .map((e) => ({
            company: e.company,
            title: e.title,
            startDate: e.startDate,
            endDate: e.endDate || null,
            location: e.location || null,
            bullets: e.bullets.split("\n").filter(Boolean),
          })),
        education: education
          .filter((e) => e.institution && e.degree)
          .map((e) => ({
            institution: e.institution,
            degree: e.degree,
            field: e.field || null,
            graduationDate: e.graduationDate || null,
            gpa: null,
          })),
        projects: [],
      };

      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, content }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save resume");
      }

      onSuccess(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save resume");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add Resume</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-2 rounded">
              {error}
            </div>
          )}

          {/* Resume Name */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Resume Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Software Engineer, Frontend Developer"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              A name to help you identify this resume
            </p>
          </div>

          <hr />

          {/* Contact Info */}
          <div>
            <h3 className="font-medium mb-3">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, State"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  LinkedIn URL
                </label>
                <input
                  type="url"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Website/Portfolio
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Professional Summary
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              placeholder="Brief overview of your experience and goals..."
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-medium mb-1">Skills</label>
            <textarea
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              rows={2}
              placeholder="JavaScript, React, Node.js, Python, AWS..."
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Comma-separated list of skills
            </p>
          </div>

          {/* Experience */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Experience</h3>
              <button
                type="button"
                onClick={() =>
                  setExperience([
                    ...experience,
                    { company: "", title: "", startDate: "", endDate: "", location: "", bullets: "" },
                  ])
                }
                className="text-sm text-primary hover:underline"
              >
                + Add Experience
              </button>
            </div>
            <div className="space-y-4">
              {experience.map((exp, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Experience {i + 1}
                    </span>
                    {experience.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExperience(experience.filter((_, j) => j !== i))
                        }
                        className="text-sm text-destructive hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={exp.company}
                      onChange={(e) => {
                        const updated = [...experience];
                        updated[i].company = e.target.value;
                        setExperience(updated);
                      }}
                      placeholder="Company"
                      className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      type="text"
                      value={exp.title}
                      onChange={(e) => {
                        const updated = [...experience];
                        updated[i].title = e.target.value;
                        setExperience(updated);
                      }}
                      placeholder="Job Title"
                      className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      type="text"
                      value={exp.startDate}
                      onChange={(e) => {
                        const updated = [...experience];
                        updated[i].startDate = e.target.value;
                        setExperience(updated);
                      }}
                      placeholder="Start Date (e.g., Jan 2020)"
                      className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      type="text"
                      value={exp.endDate}
                      onChange={(e) => {
                        const updated = [...experience];
                        updated[i].endDate = e.target.value;
                        setExperience(updated);
                      }}
                      placeholder="End Date (or Present)"
                      className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <textarea
                    value={exp.bullets}
                    onChange={(e) => {
                      const updated = [...experience];
                      updated[i].bullets = e.target.value;
                      setExperience(updated);
                    }}
                    rows={3}
                    placeholder="Achievements and responsibilities (one per line)"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Education */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Education</h3>
              <button
                type="button"
                onClick={() =>
                  setEducation([
                    ...education,
                    { institution: "", degree: "", field: "", graduationDate: "" },
                  ])
                }
                className="text-sm text-primary hover:underline"
              >
                + Add Education
              </button>
            </div>
            <div className="space-y-4">
              {education.map((edu, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Education {i + 1}
                    </span>
                    {education.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setEducation(education.filter((_, j) => j !== i))
                        }
                        className="text-sm text-destructive hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={edu.institution}
                      onChange={(e) => {
                        const updated = [...education];
                        updated[i].institution = e.target.value;
                        setEducation(updated);
                      }}
                      placeholder="Institution"
                      className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      type="text"
                      value={edu.degree}
                      onChange={(e) => {
                        const updated = [...education];
                        updated[i].degree = e.target.value;
                        setEducation(updated);
                      }}
                      placeholder="Degree (e.g., B.S.)"
                      className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      type="text"
                      value={edu.field}
                      onChange={(e) => {
                        const updated = [...education];
                        updated[i].field = e.target.value;
                        setEducation(updated);
                      }}
                      placeholder="Field of Study"
                      className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      type="text"
                      value={edu.graduationDate}
                      onChange={(e) => {
                        const updated = [...education];
                        updated[i].graduationDate = e.target.value;
                        setEducation(updated);
                      }}
                      placeholder="Graduation Date"
                      className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name || !fullName || !email}
              className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Resume"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
