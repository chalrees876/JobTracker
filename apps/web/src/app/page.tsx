import Link from "next/link";
import { Plus, FileText, Users, BarChart3 } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">JobTracker</h1>
          <nav className="flex gap-4">
            <Link
              href="/applications"
              className="text-muted-foreground hover:text-foreground transition-colors"
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
      </header>

      <main className="container mx-auto px-4 py-16">
        <section className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Track Applications. Tailor Resumes. Land Jobs.
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            AI-powered job application tracker that generates tailored resumes
            and helps you find the right contacts at every company.
          </p>
          <Link
            href="/applications"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Get Started
          </Link>
        </section>

        <section className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-card p-6 rounded-lg border">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Tailored Resumes</h3>
            <p className="text-muted-foreground">
              Generate ATS-optimized resumes tailored to each job description in
              seconds.
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg border">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Track Progress</h3>
            <p className="text-muted-foreground">
              Kanban-style pipeline to track every application from saved to
              offer.
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg border">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Find Contacts</h3>
            <p className="text-muted-foreground">
              Identify recruiters and hiring managers with AI-drafted outreach
              messages.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
