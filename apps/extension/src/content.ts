// Content script for extracting job data from pages

import type { JobData } from "@shared/types";

interface JobBoardExtractor {
  match: (url: string) => boolean;
  extract: () => JobData | null;
}

// Extractors for common job boards
const extractors: JobBoardExtractor[] = [
  // LinkedIn
  {
    match: (url) => url.includes("linkedin.com/jobs"),
    extract: () => {
      const title = document.querySelector(".job-details-jobs-unified-top-card__job-title")?.textContent?.trim()
        ?? document.querySelector(".jobs-unified-top-card__job-title")?.textContent?.trim()
        ?? document.querySelector("h1")?.textContent?.trim()
        ?? "";

      const companyName = document.querySelector(".job-details-jobs-unified-top-card__company-name")?.textContent?.trim()
        ?? document.querySelector(".jobs-unified-top-card__company-name")?.textContent?.trim()
        ?? "";

      const location = document.querySelector(".job-details-jobs-unified-top-card__primary-description-container")?.textContent?.trim()
        ?? document.querySelector(".jobs-unified-top-card__bullet")?.textContent?.trim()
        ?? "";

      const description = document.querySelector(".jobs-description-content__text")?.textContent?.trim()
        ?? document.querySelector(".jobs-box__html-content")?.textContent?.trim()
        ?? "";

      if (!title || !companyName) return null;

      return {
        title,
        companyName,
        location,
        description,
        url: window.location.href,
        source: "linkedin",
      };
    },
  },
  // Greenhouse
  {
    match: (url) => url.includes("greenhouse.io") || url.includes("boards.greenhouse"),
    extract: () => {
      const title = document.querySelector(".app-title")?.textContent?.trim()
        ?? document.querySelector("h1")?.textContent?.trim()
        ?? "";

      const companyName = document.querySelector(".company-name")?.textContent?.trim()
        ?? document.title.split(" at ")[1]?.split(" - ")[0]?.trim()
        ?? "";

      const location = document.querySelector(".location")?.textContent?.trim() ?? "";

      const description = document.querySelector("#content")?.textContent?.trim()
        ?? document.querySelector(".content")?.textContent?.trim()
        ?? "";

      if (!title) return null;

      return {
        title,
        companyName,
        location,
        description,
        url: window.location.href,
        source: "greenhouse",
      };
    },
  },
  // Lever
  {
    match: (url) => url.includes("lever.co") || url.includes("jobs.lever"),
    extract: () => {
      const title = document.querySelector(".posting-headline h2")?.textContent?.trim()
        ?? document.querySelector("h1")?.textContent?.trim()
        ?? "";

      const companyName = document.querySelector(".main-header-logo img")?.getAttribute("alt")
        ?? document.title.split(" - ")[1]?.trim()
        ?? "";

      const locationEl = document.querySelector(".posting-categories .location");
      const location = locationEl?.textContent?.trim() ?? "";

      const description = document.querySelector(".posting-page .content")?.textContent?.trim()
        ?? document.querySelector("[data-qa='job-description']")?.textContent?.trim()
        ?? "";

      if (!title) return null;

      return {
        title,
        companyName,
        location,
        description,
        url: window.location.href,
        source: "lever",
      };
    },
  },
  // Indeed
  {
    match: (url) => url.includes("indeed.com"),
    extract: () => {
      const title = document.querySelector(".jobsearch-JobInfoHeader-title")?.textContent?.trim()
        ?? document.querySelector("h1")?.textContent?.trim()
        ?? "";

      const companyName = document.querySelector("[data-company-name]")?.textContent?.trim()
        ?? document.querySelector(".jobsearch-InlineCompanyRating-companyHeader")?.textContent?.trim()
        ?? "";

      const location = document.querySelector("[data-testid='jobsearch-JobInfoHeader-companyLocation']")?.textContent?.trim()
        ?? document.querySelector(".jobsearch-JobInfoHeader-subtitle > div:last-child")?.textContent?.trim()
        ?? "";

      const description = document.querySelector("#jobDescriptionText")?.textContent?.trim()
        ?? "";

      if (!title) return null;

      return {
        title,
        companyName,
        location,
        description,
        url: window.location.href,
        source: "indeed",
      };
    },
  },
  // Generic fallback - tries to extract from any page
  {
    match: () => true,
    extract: () => {
      // Try common patterns
      const title = document.querySelector("h1")?.textContent?.trim() ?? "";

      // Try to find company from various sources
      const ogSiteName = document.querySelector('meta[property="og:site_name"]')?.getAttribute("content");
      const companyName = ogSiteName ?? document.title.split(" - ")[1]?.trim() ?? "";

      // Get the main content
      const mainContent = document.querySelector("main")?.textContent
        ?? document.querySelector("article")?.textContent
        ?? document.querySelector(".content")?.textContent
        ?? document.body.textContent
        ?? "";

      // Trim to reasonable length
      const description = mainContent.slice(0, 10000);

      if (!title) return null;

      return {
        title,
        companyName,
        location: "",
        description,
        url: window.location.href,
        source: "generic",
      };
    },
  },
];

// Extract job data from current page
function extractJobData(): JobData | null {
  const url = window.location.href;

  for (const extractor of extractors) {
    if (extractor.match(url)) {
      const data = extractor.extract();
      if (data && data.title) {
        return data;
      }
    }
  }

  return null;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "EXTRACT_JOB") {
    const data = extractJobData();
    sendResponse({ success: !!data, data });
  }
  return true;
});
