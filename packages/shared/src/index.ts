import { z } from "zod";

// ============================================
// Application Status
// ============================================

export const ApplicationStatus = {
  SAVED: "saved",
  APPLIED: "applied",
  PHONE_SCREEN: "phone_screen",
  INTERVIEW: "interview",
  OFFER: "offer",
  REJECTED: "rejected",
  WITHDRAWN: "withdrawn",
} as const;

export type ApplicationStatus = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  phone_screen: "Phone Screen",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

// ============================================
// Job Data (from extension)
// ============================================

export const jobDataSchema = z.object({
  title: z.string().min(1),
  companyName: z.string().min(1),
  location: z.string().optional(),
  description: z.string(),
  url: z.string().url(),
  source: z.string().optional(),
  salary: z.string().optional(),
});

export type JobData = z.infer<typeof jobDataSchema>;

// ============================================
// Application
// ============================================

export const createApplicationSchema = z.object({
  title: z.string().min(1),
  companyName: z.string().min(1),
  location: z.string().optional(),
  url: z.preprocess(
    (val) => {
      if (val === null) return undefined;
      if (typeof val === "string" && val.trim() === "") return undefined;
      return val;
    },
    z.string().url().optional()
  ),
  description: z.string(),
  salary: z.string().optional(),
  source: z.string().optional(),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

export const updateApplicationSchema = z.object({
  status: z.nativeEnum(ApplicationStatus as unknown as z.EnumLike).optional(),
  notes: z.string().optional(),
  appliedAt: z.string().datetime().optional(),
});

export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;

export interface Application {
  id: string;
  userId: string;
  companyName: string;
  title: string;
  location: string | null;
  url: string | null;
  description: string;
  descriptionHash: string;
  salary: string | null;
  source: string | null;
  status: ApplicationStatus;
  notes: string | null;
  appliedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Resume
// ============================================

export interface ResumeExperience {
  company: string;
  title: string;
  startDate: string;
  endDate: string | null;
  location: string | null;
  bullets: string[];
}

export interface ResumeEducation {
  institution: string;
  degree: string;
  field: string | null;
  graduationDate: string | null;
  gpa: string | null;
}

export interface ResumeProject {
  name: string;
  description: string;
  technologies: string[];
  url: string | null;
  bullets: string[];
}

export interface ResumeData {
  name: string;
  email: string;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
  website: string | null;
  summary: string | null;
  skills: string[];
  experience: ResumeExperience[];
  education: ResumeEducation[];
  projects: ResumeProject[];
}

export interface ResumeVersion {
  id: string;
  applicationId: string;
  content: ResumeData;
  keywords: string[];
  pdfUrl: string | null;
  createdAt: Date;
}

// ============================================
// Contact
// ============================================

export const ContactConfidence = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const;

export type ContactConfidence = (typeof ContactConfidence)[keyof typeof ContactConfidence];

export interface Contact {
  id: string;
  applicationId: string;
  name: string;
  role: string | null;
  email: string | null;
  linkedinUrl: string | null;
  confidence: ContactConfidence;
  source: string | null;
  notes: string | null;
  createdAt: Date;
}

export interface OutreachMessage {
  id: string;
  contactId: string;
  subject: string | null;
  body: string;
  channel: "email" | "linkedin";
  createdAt: Date;
  sentAt: Date | null;
}

// ============================================
// User Profile (Base Resume)
// ============================================

export interface UserProfile {
  id: string;
  userId: string;
  headline: string | null;
  targetRoles: string[];
  targetLocations: string[];
  baseResume: ResumeData | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
