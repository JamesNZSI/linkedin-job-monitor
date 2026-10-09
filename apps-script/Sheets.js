/**
 * Synchronise job status changes with Google Sheets.
 */
function syncRecordToGoogleSheets_(action, job) {
  try {
    if (action === "ADD_NEW") {
      addNewJob_(job);
    } else if (action === "MARK_CLOSED") {
      markJobClosed_(job);
    } else {
      Logger.log(`[Google Sheets] Unknown action: ${action}`);
    }
  } catch (error) {
    Logger.log(`[Sheets Syncer Error]: ${error.message}`);
    throw error;
  }
}

/**
 * Append a new job row. Columns A to J.
 */
function addNewJob_(job) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAME);
  sheet.appendRow([
    job.id,
    job.title,
    CONFIG.LINKEDIN_COMPANY_ID,
    job.postedBy,
    job.location,
    job.type,
    "True",
    job.updatedTime,
    job.poster,
    job.link
  ]);
  Logger.log(`[Google Sheets] Added new ACTIVE job: ${job.title} (${job.id})`);
}

/**
 * Find job by ID and mark it closed (False + updatedTime).
 */
function markJobClosed_(job) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAME);
  const rows = sheet.getDataRange().getValues();

  const rowIndex = rows.findIndex(row => String(row[0]) === String(job.id));
  if (rowIndex === -1) {
    Logger.log(`[Google Sheets] Cannot mark job ${job.id} CLOSED: Job ID not found.`);
    return;
  }

  const sheetRowNumber = rowIndex + 1;
  // Update Columns G (Status -> False) and H (Updated Time)
  sheet.getRange(sheetRowNumber, 7, 1, 2).setValues([[
    "False",
    job.updatedTime
  ]]);

  Logger.log(`[Google Sheets] Updated status to CLOSED for job ID: ${job.id}`);
}

/**
 * Load all ACTIVE jobs from Google Sheets.
 */
function getActiveJobs_() {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAME);
  const rows = sheet.getDataRange().getValues();
  const activeJobs = new Map();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const [
      id,
      title,
      companyId,
      postedBy,
      location,
      type,
      status,
      updatedTime,
      poster,
      link
    ] = row;

    if (!id) continue;
    if (String(status).toUpperCase() !== "TRUE") continue;

    activeJobs.set(String(id), {
      id: String(id),
      title: title || "",
      companyId: companyId || "",
      postedBy: postedBy || "",
      location: location || "",
      type: type || "",
      poster: poster || "",
      link: link || ""
    });
  }

  return activeJobs;
}