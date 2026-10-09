// Config.gs
const CONFIG = {
  SPREADSHEET_ID: "1K9NUyDyz2gsiVRuUOXw1GG8mygwtQ3hGAvK7U1DJkSA",
  SHEET_NAME: "Job Monitoring Logs",
  LINKEDIN_COMPANY_ID: "54347115",
  JOB_SEARCH_URL: "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?location=Australia&f_C=${LINKEDIN_COMPANY_ID}",
  PAGE_SIZE: 25,
  MAX_PAGES: 2,
  KEYWORDS: "",
  DETAIL_REQUEST_DELAY: 1000 // milliseconds sleep between detail fetches
};

/**
 * Helper functions to toggle the execution switch via PropertiesService
 */
function enableMonitor() {
  PropertiesService.getScriptProperties().setProperty("MONITOR_ENABLED", "true");
  Logger.log("Monitor has been enabled.");
}

function disableMonitor() {
  PropertiesService.getScriptProperties().setProperty("MONITOR_ENABLED", "false");
  Logger.log("Monitor has been disabled.");
}

function checkIsMonitorEnabled_() {
  var scriptProperties = PropertiesService.getScriptProperties();
  return scriptProperties.getProperty("MONITOR_ENABLED") === "true";
}