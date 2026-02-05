import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const tailoredResumeSchema = z.object({
  summary: z.string().describe("A 2-3 sentence professional summary tailored to the job"),
  skills: z.array(z.string()).describe("Skills list reordered/filtered to match job requirements"),
  experience: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      startDate: z.string(),
      endDate: z.string().nullable(),
      location: z.string().nullable(),
      bullets: z.array(z.string()).describe("Achievement bullets rewritten to emphasize relevant skills"),
    })
  ),
  projects: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      technologies: z.array(z.string()),
      url: z.string().nullable(),
      bullets: z.array(z.string()),
    })
  ),
  keywords: z.array(z.string()).describe("Keywords extracted from the job description"),
});

const baseResume = {
  name: "Alex Rivera",
  email: "alex.rivera@example.com",
  phone: "555-555-0123",
  location: "Austin, TX",
  linkedin: "https://linkedin.com/in/alexrivera",
  website: "https://alexrivera.dev",
  summary: "Full-stack engineer with 5+ years building web apps.",
  skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "AWS", "Docker", "GraphQL"],
  experience: [
    {
      company: "BrightLeaf",
      title: "Senior Software Engineer",
      startDate: "2021-03",
      endDate: null,
      location: "Austin, TX",
      bullets: [
        "Led migration from REST to GraphQL for internal APIs",
        "Built CI pipelines to reduce deploy time",
        "Optimized query performance for reporting dashboards"
      ]
    },
    {
      company: "Cobalt Labs",
      title: "Software Engineer",
      startDate: "2019-01",
      endDate: "2021-02",
      location: "Remote",
      bullets: [
        "Developed React UI for analytics platform",
        "Implemented Node.js services for data ingestion"
      ]
    }
  ],
  education: [
    {
      institution: "UT Austin",
      degree: "B.S.",
      field: "Computer Science",
      graduationDate: "2018",
      gpa: null
    }
  ],
  projects: [
    {
      name: "FleetOps",
      description: "Real-time vehicle tracking dashboard",
      technologies: ["React", "Mapbox", "Node.js"],
      url: "https://fleetops.example.com",
      bullets: ["Built live map view", "Implemented alerting rules"]
    }
  ]
};

const jobDescription = {
  companyName: "Nimbus Health",
  title: "Senior Full-Stack Engineer",
  location: "Remote, US",
  description: `We are looking for a senior full-stack engineer to build healthcare analytics tools.
Requirements: TypeScript, React, Node.js, PostgreSQL, AWS. Experience with GraphQL and CI/CD.
Nice to have: Docker, performance optimization, data pipelines.`,
};

const prompt = `You are an expert ATS resume optimizer. Given a base resume and job description, create a tailored version that:

1. Reorders skills to put the most relevant ones first
2. Rewrites experience bullets to emphasize matching skills and keywords
3. Creates a summary tailored to this specific role
4. Extracts key keywords from the job description

CRITICAL CONSTRAINTS:
- NEVER invent experience, companies, or projects that don't exist in the base resume
- NEVER fabricate metrics or numbers - only include quantifiable achievements if they exist in the original
- You may rephrase and reorder, but the underlying facts must remain truthful
- Focus on highlighting relevant existing experience, not creating new content

BASE RESUME:
${JSON.stringify(baseResume, null, 2)}

JOB DESCRIPTION:
Company: ${jobDescription.companyName}
Title: ${jobDescription.title}
Location: ${jobDescription.location}

${jobDescription.description}

Generate a tailored resume that will perform well in ATS systems while remaining completely truthful.`;

const { object } = await generateObject({
  model: openai("gpt-4o-2024-08-06", { structuredOutputs: true }),
  schemaName: "tailored_resume",
  schemaDescription: "A tailored resume object and extracted keywords",
  schema: tailoredResumeSchema,
  prompt,
});

console.log(JSON.stringify(object, null, 2));
