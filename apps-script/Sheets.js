/**
 * Synchronise job status changes with Google Sheets.
 */
// function syncRecordToGoogleSheets_(action, job) {
//   try {
//     if (action === "ADD_NEW") {
//       addNewJob_(job);
//     } else if (action === "MARK_CLOSED") {
//       markJobClosed_(job);
//     } else {
//       Logger.log(`[Google Sheets] Unknown action: ${action}`);
//     }
//   } catch (error) {
//     Logger.log(`[Sheets Syncer Error]: ${error.message}`);
//     throw error;
//   }
// }

/**
 * Append a new job row. Columns A to J.
 */
function addNewJob_(job, targetSheet) {
  targetSheet.appendRow([
    job.id,
    job.title,
    CONFIG.LINKEDIN_COMPANY_ID,
    job.postedBy,
    job.location,
    job.type,
    "True",
    job.updatedTime,
    job.poster,
    job.link,
    job.searchLocation
  ]);
  Logger.log(`[Google Sheets] Added new ACTIVE job: ${job.title} (${job.id})`);
}

/**
 * Find job by ID and mark it closed (False + updatedTime).
 */
function markJobClosed_(job) {
  const sheet = job.sourceSheet;
  if (!sheet) {
    throw new Error(`Source sheet unavailable for job ${job.id}`);
  }

  sheet.getRange(job.rowNumber, 7, 1, 2).setValues([["False", job.updatedTime]]);

  Logger.log(`[Google Sheets] Updated status to CLOSED for job ID: ${job.id}`);
}

/**
 * Load all ACTIVE jobs from Google Sheets.
 */
function getActiveJobs_(sheet) {
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
      link,
      searchLocation
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
      link: link || "",
      searchLocation: searchLocation || "",
      // Remember where the old record is
      sourceSheet: sheet,
      rowNumber: i+1
    });
  }

  return activeJobs;
}

function getTodaySheet_() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  const today = Utilities.formatDate(
    new Date(),
    CONFIG.TIME_ZONE,
    "yyyy-MM-dd"
  );

  return spreadsheet.getSheetByName(today);
}

function createTodaySheet_() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  const sheetName = Utilities.formatDate(
    new Date(),
    CONFIG.TIME_ZONE,
    "yyyy-MM-dd"
  );

  const sheet = spreadsheet.insertSheet(sheetName);

  // Move new tab to the end
  spreadsheet.setActiveSheet(sheet);
  spreadsheet.moveActiveSheet(
    spreadsheet.getNumSheets()
  );

  sheet.appendRow([
    "Job ID",
    "Title",
    "Company ID",
    "Posted By",
    "Location",
    "Type",
    "Active",
    "Updated Time",
    "Poster",
    "Link",
    "Search-Location"
  ]);

  Logger.log(
    `[Google Sheets] Created today's tab: ${sheetName}`
  );

  return sheet;
}

/**
 * find the tab with current date or create a new tab with current date.
 */
// function getOrCreateTodaySheet_() {
//   const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

//   const sheetName = Utilities.formatDate(
//     new Date(),
//     CONFIG.TIME_ZONE,
//     "yyyy-MM-dd"
//   );

//   let sheet = spreadsheet.getSheetByName(sheetName);

//   if (sheet) {
//     Logger.log(
//       `[Google Sheets] Today's tab already exists: ${sheetName}`
//     );
//     return sheet;
//   }
//   // create a new tab
//   sheet = spreadsheet.insertSheet(sheetName);
//   // Move it to the end of all tabs
//   spreadsheet.setActiveSheet(sheet);
//   spreadsheet.moveActiveSheet(spreadsheet.getNumSheets());

//   sheet.appendRow([
//     "Job ID",
//     "Title",
//     "Company ID",
//     "Posted By",
//     "Location",
//     "Type",
//     "Active",
//     "Updated Time",
//     "Poster",
//     "Link",
//     "Search-Location"
//   ]);

//   Logger.log(
//     `[Google Sheets] Created new tab: ${sheetName}`
//   );

//   return sheet;
// }
/**
 * get the latest tab for updating
 */
function getLatestSheet_() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const dateSheets = spreadsheet.getSheets().filter(sheet => datePattern.test(sheet.getName())).sort((a, b) => b.getName().localeCompare(a.getName()));

  return dateSheets.length > 0 ? dateSheets[0] : null;
}

// Add only newly discovered jobs to an existing tab.
function addNewJobs_(localCacheDb, incomingSnapshotMap, targetSheet) {
  const updatedTime = getUpdatedTime_();

  for (const [id, job] of incomingSnapshotMap) {
    if (!localCacheDb.has(id)) {
      Logger.log(`[Monitor] NEW: ${job.title} (${id})`);

      Utilities.sleep(
        CONFIG.DETAIL_REQUEST_DELAY
      );

      job.poster = fetchLinkedInJobDetail_(job.link);
      job.updatedTime = updatedTime;

      addNewJob_(job, targetSheet);
    }
  }
}

function updateClosedJobs_(oldActiveJobs, currentJobs) {
  const updatedTime = getUpdatedTime_();

  for (const [id, job] of oldActiveJobs) {
    // Old active job is no longer returned by LinkedIn
    if (!currentJobs.has(id)) {
      Logger.log(`[Monitor] CLOSED: ${job.title} (${id})`);

      job.updatedTime = updatedTime;
      markJobClosed_(job);
    }
  }
}

// Write ALL currently active LinkedIn jobs
// into a newly created Today Sheet.
function saveAllActiveJobs_(currentJobs, targetSheet, oldActiveJobs = new Map()) {
  const updatedTime = getUpdatedTime_();

  for (const [id, job] of currentJobs) {
    const oldJob = oldActiveJobs.get(id);

    if (oldJob) {
      // Existing job: reuse old poster. DO NOT request LinkedIn detail again.
      job.poster = oldJob.poster || "";
    } else {
      // Truly NEW job: fetch poster once.
      Logger.log(`[Monitor] NEW: ${job.title} (${id})`);

      Utilities.sleep(
        CONFIG.DETAIL_REQUEST_DELAY
      );

      job.poster = fetchLinkedInJobDetail_(job.link);
    }
    job.updatedTime = updatedTime;

    // ALL current LinkedIn jobs go into Today Sheet
    addNewJob_(job, targetSheet);
  }

  Logger.log(
    `[Monitor] Saved ${currentJobs.size} active jobs to ${targetSheet.getName()}.`
  );
}