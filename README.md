# JobTracker

AI-powered job application tracker with resume tailoring and contact discovery.

## Features

- **Application Tracking**: Kanban-style pipeline to track applications from saved to offer
- **Resume Tailoring**: Generate ATS-optimized resumes tailored to each job description
- **Chrome Extension**: Save job postings in one click from LinkedIn, Greenhouse, Lever, Indeed
- **Contact Finder**: Identify recruiters and hiring managers with AI-drafted outreach

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **AI**: OpenAI GPT-4o (via Vercel AI SDK)
- **Extension**: Chrome Manifest V3, Vite, React

## Project Structure

```
├── apps/
│   ├── web/                 # Next.js web application
│   │   ├── prisma/          # Database schema
│   │   └── src/
│   │       ├── app/         # Pages and API routes
│   │       ├── components/  # React components
│   │       └── lib/         # Utilities
│   └── extension/           # Chrome extension
│       └── src/
│           ├── popup.tsx    # Extension popup UI
│           ├── content.ts   # Job extraction scripts
│           └── background.ts
└── packages/
    └── shared/              # Shared types and schemas
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL (or use SQLite for local dev)

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment
cp apps/web/.env.example apps/web/.env
# Edit .env with your DATABASE_URL and OPENAI_API_KEY

# Push database schema
pnpm db:push

# Generate Prisma client
pnpm db:generate

# Start development server
pnpm dev
```

### Chrome Extension

```bash
# Build extension
pnpm build:extension

# Load in Chrome:
# 1. Go to chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select apps/extension/dist
```

## Development

```bash
pnpm dev              # Start web app
pnpm build            # Build web app
pnpm build:extension  # Build Chrome extension
pnpm db:studio        # Open Prisma Studio
pnpm typecheck        # Type check all packages
```

## License

MIT
