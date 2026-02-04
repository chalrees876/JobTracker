// Background service worker for JobTracker extension

chrome.runtime.onInstalled.addListener(() => {
  console.log("JobTracker extension installed");
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SAVE_JOB") {
    // Handle saving job in background if needed
    console.log("Saving job:", message.data);
    sendResponse({ success: true });
  }
  return true;
});
