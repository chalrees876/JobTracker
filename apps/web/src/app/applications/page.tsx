"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  ExternalLink,
  MoreHorizontal,
  FileText,
  Users,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ApplicationStatus,
  APPLICATION_STATUS_LABELS,
} from "@shared/types";
import { WelcomeCard } from "@/components/WelcomeCard";

interface Application {
  id: string;
  companyName: string;
  title: string;
  location: string | null;
  url: string | null;
  status: string;
  createdAt: string;
  appliedAt: string | null;
  resumeVersions: { id: string }[];
  contacts: { id: string; name: string; role: string | null }[];
}

const STATUS_COLUMNS: ApplicationStatus[] = [
  "saved",
  "applied",
  "phone_screen",
  "interview",
  "offer",
  "rejected",
];

const STATUS_COLORS: Record<string, string> = {
  saved: "bg-gray-100 text-gray-700",
  applied: "bg-blue-100 text-blue-700",
  phone_screen: "bg-yellow-100 text-yellow-700",
  interview: "bg-purple-100 text-purple-700",
  offer: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  withdrawn: "bg-gray-100 text-gray-500",
};

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [onboardingState, setOnboardingState] = useState<"none" | "no-resume" | "no-applications">("none");
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    checkProfileAndFetch();
  }, []);

  async function checkProfileAndFetch() {
    try {
      // Check if user has any resumes
      const profileRes = await fetch("/api/profile");
      const profileData = await profileRes.json();

      if (profileData.success) {
        // Store user name for welcome message
        setUserName(profileData.data.user?.name || null);

        const hasResumes = profileData.data.baseResumes?.length > 0;
        if (!hasResumes) {
          setOnboardingState("no-resume");
          setLoading(false);
          return;
        }
      }

      // Fetch applications
      await fetchApplications();
    } catch (error) {
      console.error("Failed to check profile:", error);
      setLoading(false);
    }
  }

  async function fetchApplications() {
    try {
      const res = await fetch("/api/applications");
      const data = await res.json();
      if (data.success) {
        setApplications(data.data.items);
        // Show welcome state if no applications yet
        if (data.data.items.length === 0) {
          setOnboardingState("no-applications");
        }
      }
    } catch (error) {
      console.error("Failed to fetch applications:", error);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(status === "applied" ? { appliedAt: new Date().toISOString() } : {}),
        }),
      });
      if (res.ok) {
        setApplications((prev) =>
          prev.map((app) => (app.id === id ? { ...app, status } : app))
        );
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  }

  async function deleteApplication(id: string) {
    if (!confirm("Are you sure you want to delete this application?")) return;

    try {
      const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
      if (res.ok) {
        setApplications((prev) => {
          const updated = prev.filter((app) => app.id !== id);
          // Show welcome state if this was the last application
          if (updated.length === 0) {
            setOnboardingState("no-applications");
          }
          return updated;
        });
      }
    } catch (error) {
      console.error("Failed to delete application:", error);
    }
  }

  const applicationsByStatus = STATUS_COLUMNS.reduce(
    (acc, status) => {
      acc[status] = applications.filter((app) => app.status.toLowerCase() === status);
      return acc;
    },
    {} as Record<string, Application[]>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (onboardingState === "no-resume") {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-primary">
              JobTracker
            </Link>
            <Link
              href="/profile"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Profile
            </Link>
          </div>
        </header>
        <main className="container mx-auto px-4 py-16">
          <WelcomeCard userName={userName} variant="no-resume" />
        </main>
      </div>
    );
  }

  if (onboardingState === "no-applications") {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-2xl font-bold text-primary">
                JobTracker
              </Link>
              <nav className="flex gap-4 ml-8">
                <Link
                  href="/applications"
                  className="text-foreground font-medium"
                >
                  Applications
                </Link>
                <Link
                  href="/profile"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Profile
                </Link>
              </nav>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-16">
          <WelcomeCard userName={userName} variant="no-applications" />
        </main>
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
                className="text-foreground font-medium"
              >
                Applications
              </Link>
              <Link
                href="/profile"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Profile
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex border rounded-lg overflow-hidden">
              <button
                onClick={() => setView("kanban")}
                className={cn(
                  "px-3 py-1.5 text-sm",
                  view === "kanban"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted"
                )}
              >
                Kanban
              </button>
              <button
                onClick={() => setView("list")}
                className={cn(
                  "px-3 py-1.5 text-sm",
                  view === "list"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted"
                )}
              >
                List
              </button>
            </div>
            <Link
              href="/applications/new"
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Application
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {view === "kanban" ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STATUS_COLUMNS.map((status) => (
              <div
                key={status}
                className="flex-shrink-0 w-72 bg-muted/50 rounded-lg"
              >
                <div className="p-3 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">
                      {APPLICATION_STATUS_LABELS[status]}
                    </h3>
                    <span className="text-sm text-muted-foreground">
                      {applicationsByStatus[status]?.length || 0}
                    </span>
                  </div>
                </div>
                <div className="p-2 space-y-2 min-h-[200px]">
                  {applicationsByStatus[status]?.map((app) => (
                    <ApplicationCard
                      key={app.id}
                      application={app}
                      onStatusChange={updateStatus}
                      onDelete={deleteApplication}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Company</th>
                  <th className="text-left p-4 font-medium">Title</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Added</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id} className="border-b last:border-0">
                    <td className="p-4">
                      <Link
                        href={`/applications/${app.id}`}
                        className="font-medium hover:text-primary"
                      >
                        {app.companyName}
                      </Link>
                    </td>
                    <td className="p-4">{app.title}</td>
                    <td className="p-4">
                      <span
                        className={cn(
                          "px-2 py-1 rounded text-sm",
                          STATUS_COLORS[app.status.toLowerCase()]
                        )}
                      >
                        {APPLICATION_STATUS_LABELS[app.status.toLowerCase() as ApplicationStatus]}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Link
                          href={`/applications/${app.id}`}
                          className="p-1.5 hover:bg-muted rounded"
                        >
                          <FileText className="w-4 h-4" />
                        </Link>
                        {app.url && (
                          <a
                            href={app.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-muted rounded"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => deleteApplication(app.id)}
                          className="p-1.5 hover:bg-destructive/10 rounded text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function ApplicationCard({
  application,
  onStatusChange,
  onDelete,
}: {
  application: Application;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-card p-3 rounded-lg border shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <Link
          href={`/applications/${application.id}`}
          className="font-medium hover:text-primary line-clamp-1"
        >
          {application.companyName}
        </Link>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-muted rounded"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 bg-card border rounded-lg shadow-lg z-20 py-1 min-w-[140px]">
                <div className="px-2 py-1 text-xs text-muted-foreground font-medium">
                  Move to
                </div>
                {STATUS_COLUMNS.map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      onStatusChange(application.id, status.toUpperCase());
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    {APPLICATION_STATUS_LABELS[status]}
                  </button>
                ))}
                <div className="border-t my-1" />
                <button
                  onClick={() => {
                    onDelete(application.id);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
        {application.title}
      </p>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {application.resumeVersions.length > 0 && (
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {application.resumeVersions.length}
          </span>
        )}
        {application.contacts.length > 0 && (
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {application.contacts.length}
          </span>
        )}
        {application.url && (
          <a
            href={application.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto hover:text-primary"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
