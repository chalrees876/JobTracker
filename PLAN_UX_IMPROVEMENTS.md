# JobTracker UX Improvement Plan

## Overview

This plan covers three main initiatives:
1. **Improved Welcome Experience** - Better onboarding for new users
2. **Resume Tailoring Guide** - Help users understand and use tailored resumes
3. **Google Docs Template Integration** - Structured resume format for easy filling

---

## Initiative 1: Improved Welcome Experience

### Current State
- New users land on `/applications` and see a basic empty state
- Message mentions "tailored resumes" before explaining the core value
- Users are directed to profile page without context

### Goal
- Welcome users warmly to JobTracker
- Position the app as a **job application tracker first**
- Mention resume upload as a simple next step
- Save tailoring features for later discovery

### Milestones

#### Milestone 1.1: New Welcome Component
**Changes:**
- Create a dedicated `WelcomeCard` component
- Friendly greeting with user's name (if available)
- Clear value proposition: "Track all your job applications in one place"
- Simple CTA: "Upload your resume to get started"

**Files to modify:**
- `apps/web/src/app/applications/page.tsx` - Update empty state
- `apps/web/src/components/WelcomeCard.tsx` - NEW component

**Test:**
1. Sign in as new user (no resumes)
2. Verify welcome message displays
3. Verify CTA links to profile page
4. Verify no mention of "tailoring" or "AI"

#### Milestone 1.2: Post-Resume Welcome State
**Changes:**
- After resume upload, show different welcome on applications page
- "Great! You're ready to start tracking. Add your first application."
- Quick tips: "Use our browser extension to save jobs with one click"

**Files to modify:**
- `apps/web/src/app/applications/page.tsx` - Add conditional for has-resume-no-apps state

**Test:**
1. Upload a resume
2. Return to applications page
3. Verify updated welcome message
4. Verify "Add Application" CTA is prominent

---

## Initiative 2: Resume Tailoring Guide

### Current State
- Users see tailored resume output but don't understand how to use it
- AI returns structured sections (summary, experience, skills, etc.)
- No guidance on copying content to their actual resume

### Goal
- Create a clear guide explaining the tailoring workflow
- Show users how each section maps to their resume
- Provide copy-to-clipboard functionality for each section

### Milestones

#### Milestone 2.1: Tailoring Explainer Modal
**Changes:**
- Add "How does this work?" link on the generate resume step
- Modal explaining:
  - "We analyze the job description for keywords"
  - "We rewrite your bullets to highlight relevant experience"
  - "Copy each section to your resume document"
- Include visual diagram of the process

**Files to modify:**
- `apps/web/src/app/applications/new/page.tsx` - Add explainer link
- `apps/web/src/components/TailoringGuide.tsx` - NEW modal component

**Test:**
1. Start adding application with job description
2. Click "How does this work?"
3. Verify modal explains process clearly
4. Verify modal can be dismissed

#### Milestone 2.2: Section-by-Section Copy UI
**Changes:**
- In the tailored resume preview, add copy buttons per section
- Sections: Summary, Skills, each Experience entry, each Project
- Toast notification: "Copied to clipboard!"
- Visual feedback on copy action

**Files to modify:**
- `apps/web/src/app/applications/new/page.tsx` - Update resume preview
- `apps/web/src/components/CopyableSection.tsx` - NEW component

**Test:**
1. Generate a tailored resume
2. Click copy on Summary section
3. Verify toast appears
4. Paste in external app, verify content matches

#### Milestone 2.3: Tailoring Tips Sidebar
**Changes:**
- Add collapsible tips panel alongside resume preview
- Tips like:
  - "Copy the summary to your resume header"
  - "Update your skills section with the reordered list"
  - "Replace bullet points with the tailored versions"
  - "Keywords to naturally include: [keyword pills]"

**Files to modify:**
- `apps/web/src/app/applications/new/page.tsx` - Add tips sidebar

**Test:**
1. Generate tailored resume
2. Verify tips panel is visible
3. Verify tips are actionable and clear
4. Verify keywords are displayed as pills

---

## Initiative 3: Google Docs Template Integration

### Current State
- Users must manually format their resume
- Tailored content is displayed but not in a usable format
- No standardized template

### Goal
- Provide a Google Docs template users can copy
- AI tailors content to fit the exact template sections
- Users fill in the template with copy-paste from our UI

### Milestones

#### Milestone 3.1: Create Google Docs Template
**Changes:**
- Design a clean, ATS-friendly resume template in Google Docs
- Sections clearly labeled:
  - Header (Name, Contact Info)
  - Professional Summary
  - Skills
  - Experience (Company, Title, Dates, Bullets)
  - Education
  - Projects (optional)
- Make template publicly viewable with "Make a copy" option

**Deliverable:**
- Google Docs template URL
- Template screenshot for UI
- Store template ID in environment variable or config

**Test:**
1. Open template link
2. Verify "Make a copy" works
3. Verify sections are clearly marked
4. Verify formatting is ATS-friendly (simple fonts, no tables/columns)

#### Milestone 3.2: Template Download/Link in UI
**Changes:**
- Add "Get Resume Template" button on profile page
- Add template link in tailoring results page
- Instructions: "1. Copy our template → 2. Generate tailored content → 3. Fill in the sections"

**Files to modify:**
- `apps/web/src/app/profile/page.tsx` - Add template section
- `apps/web/src/app/applications/new/page.tsx` - Add template link in results

**Test:**
1. Go to profile page
2. Click "Get Resume Template"
3. Verify Google Docs opens in new tab
4. Verify instructions are clear

#### Milestone 3.3: Template-Aware Tailoring Output
**Changes:**
- Update tailored resume display to match template structure exactly
- Format experience entries as:
  ```
  Company Name | Job Title
  Start Date - End Date | Location
  • Bullet 1
  • Bullet 2
  ```
- Add "Copy All" button that copies entire resume in template format

**Files to modify:**
- `apps/web/src/app/applications/new/page.tsx` - Update preview formatting
- Add formatting utilities for template-compatible output

**Test:**
1. Generate tailored resume
2. Click "Copy All"
3. Paste into Google Docs template copy
4. Verify content fits sections correctly

#### Milestone 3.4: Template Section Mapping Guide
**Changes:**
- Visual guide showing template ↔ UI mapping
- Highlight which UI section goes where in template
- Numbered steps with screenshots

**Files to modify:**
- `apps/web/src/components/TemplateGuide.tsx` - NEW component
- Add to tailoring results page

**Test:**
1. View tailored resume
2. Open template mapping guide
3. Verify each section clearly maps to template
4. Verify guide is helpful for first-time users

---

## Implementation Order

### Phase 1: Quick Wins (1-2 days)
1. ✅ Milestone 1.1: New Welcome Component
2. ✅ Milestone 1.2: Post-Resume Welcome State

### Phase 2: Tailoring Guide (2-3 days)
3. Milestone 2.1: Tailoring Explainer Modal
4. Milestone 2.2: Section-by-Section Copy UI
5. Milestone 2.3: Tailoring Tips Sidebar

### Phase 3: Template Integration (3-4 days)
6. Milestone 3.1: Create Google Docs Template
7. Milestone 3.2: Template Download/Link in UI
8. Milestone 3.3: Template-Aware Tailoring Output
9. Milestone 3.4: Template Section Mapping Guide

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| New user completes onboarding | Unknown | Track with event |
| Users who generate tailored resume | Unknown | Track with event |
| Users who copy content sections | N/A | Track copy events |
| Users who access template | N/A | Track template clicks |

---

## Copy/Messaging Guidelines

### Welcome Messages (No Tailoring Mention)
- "Welcome to JobTracker!"
- "Track all your job applications in one place"
- "Never lose track of where you applied"
- "Upload your resume to get started"

### Tailoring Messages (After Discovery)
- "Get an edge with tailored resumes"
- "We'll help you highlight the right experience for each job"
- "Copy the tailored content to your resume document"

### Template Messages
- "Use our ATS-friendly template"
- "Consistent formatting that recruiters love"
- "Fill in the sections with your tailored content"

---

## Technical Notes

### New Components Needed
1. `WelcomeCard.tsx` - Onboarding welcome
2. `TailoringGuide.tsx` - Explainer modal
3. `CopyableSection.tsx` - Section with copy button
4. `TemplateGuide.tsx` - Template mapping visual

### Environment Variables
```
GOOGLE_DOCS_TEMPLATE_ID=your-template-id
GOOGLE_DOCS_TEMPLATE_URL=https://docs.google.com/document/d/xxx/copy
```

### Clipboard API
```typescript
await navigator.clipboard.writeText(content);
// Show toast notification
```

---

## Questions to Resolve

1. **Template Design:** What sections should the template include? (Proposed: Summary, Skills, Experience, Education, Projects)

2. **Template Hosting:** Should we:
   - Host on your Google account (you control)
   - Create a public template gallery link
   - Generate a fresh copy for each user via API

3. **Copy Format:** When copying experience bullets, should we:
   - Include the company/title header
   - Just copy bullets
   - Copy entire experience section

4. **Analytics:** Do you want to track these events for metrics?

---

## Next Steps

1. Review and approve this plan
2. Decide on template hosting approach
3. Start Phase 1 implementation
4. Create Google Docs template (can be done in parallel)
