import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import type { JobData } from "@shared/types";
import "./popup.css";

const API_BASE = "http://localhost:3000";

function Popup() {
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    extractJobData();
  }, []);

  async function extractJobData() {
    setStatus("loading");
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error("No active tab");

      const response = await chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_JOB" });
      if (response?.success) {
        setJobData(response.data);
        setStatus("idle");
      } else {
        setMessage("Could not detect job posting on this page");
        setStatus("error");
      }
    } catch (error) {
      setMessage("Failed to extract job data");
      setStatus("error");
    }
  }

  async function saveJob() {
    if (!jobData) return;

    setStatus("loading");
    try {
      const response = await fetch(`${API_BASE}/api/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobData),
      });

      if (!response.ok) throw new Error("Failed to save");

      setStatus("success");
      setMessage("Job saved successfully!");
    } catch (error) {
      setStatus("error");
      setMessage("Failed to save job. Is the web app running?");
    }
  }

  return (
    <div className="popup">
      <header className="header">
        <h1>JobTracker</h1>
      </header>

      <main className="content">
        {status === "loading" && (
          <div className="loading">Extracting job details...</div>
        )}

        {status === "error" && (
          <div className="error">{message}</div>
        )}

        {status === "success" && (
          <div className="success">{message}</div>
        )}

        {jobData && status === "idle" && (
          <div className="job-preview">
            <div className="field">
              <label>Company</label>
              <input
                type="text"
                value={jobData.companyName}
                onChange={(e) => setJobData({ ...jobData, companyName: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Title</label>
              <input
                type="text"
                value={jobData.title}
                onChange={(e) => setJobData({ ...jobData, title: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Location</label>
              <input
                type="text"
                value={jobData.location || ""}
                onChange={(e) => setJobData({ ...jobData, location: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Job Description</label>
              <textarea
                value={jobData.description}
                onChange={(e) => setJobData({ ...jobData, description: e.target.value })}
                rows={6}
              />
            </div>

            <button className="save-btn" onClick={saveJob}>
              Save Job
            </button>
          </div>
        )}

        {!jobData && status !== "loading" && status !== "error" && (
          <div className="empty">
            <p>Navigate to a job posting and click the extension to save it.</p>
          </div>
        )}
      </main>

      <footer className="footer">
        <a href="http://localhost:3000/applications" target="_blank" rel="noopener">
          Open Dashboard
        </a>
      </footer>
    </div>
  );
}

const container = document.getElementById("root")!;
const root = createRoot(container);
root.render(<Popup />);
