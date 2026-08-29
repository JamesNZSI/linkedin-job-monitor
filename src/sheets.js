import { google } from "googleapis";

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME;

// Authenticate using the Google Service Account
const auth = new google.auth.GoogleAuth({
    keyFile: "./google-credentials.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

// Create Google Sheets API client
const sheets = google.sheets({
    version: "v4",
    auth
});

/**
 * Synchronise a job status change with Google Sheets.
 *
 * Supported actions:
 *   ADD_NEW     -> append a new ACTIVE job
 *   MARK_CLOSED -> find an existing job and mark it CLOSED
 *
 * @param {"ADD_NEW" | "MARK_CLOSED"} action
 * @param {Object} job
 */
export async function syncRecordToGoogleSheets(action, job) {
    try {
        if (action === "ADD_NEW") {
            await addNewJob(job);
        } else if (action === "MARK_CLOSED") {
            await markJobClosed(job);
        } else {
            console.warn(`[Google Sheets] Unknown action: ${action}`);
        }
    } catch (error) {
        console.error(`[Sheets Syncer Error]: ${error.message}`);
        throw error;
    }
}

/**
 * Append a new job to the spreadsheet.
 */
async function addNewJob(job) {
    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A:G`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",

        requestBody: {
            values: [
                [
                    job.id,
                    job.title,
                    job.postedBy,
                    job.location,
                    job.type,
                    "ACTIVE",
                    job.link
                ]
            ]
        }
    });

    console.log(
        `[Google Sheets] Added new ACTIVE job: ${job.title} (${job.id})`
    );
}

/**
 * Find a job by ID and change its status to CLOSED.
 */
async function markJobClosed(job) {
    // Read the existing spreadsheet rows
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A:G`
    });

    const rows = response.data.values || [];

    // Column A contains the Job ID.
    //
    // Google Sheets may return IDs as strings, so convert both values
    // to strings before comparing them.
    const rowIndex = rows.findIndex(
        (row) => String(row[0]) === String(job.id)
    );

    if (rowIndex === -1) {
        console.warn(
            `[Google Sheets] Cannot mark job ${job.id} CLOSED: Job ID not found.`
        );
        return;
    }

    /*
     * Arrays are zero-indexed:
     * rows[0] = spreadsheet row 1
     * rows[1] = spreadsheet row 2
     *
     * Therefore the actual Google Sheets row number is:
     * rowIndex + 1
     */
    const sheetRowNumber = rowIndex + 1;

    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!F${sheetRowNumber}`,
        valueInputOption: "USER_ENTERED",

        requestBody: {
            values: [["CLOSED"]]
        }
    });

    console.log(`[Google Sheets] Updated status to CLOSED for job ID: ${job.id}`);
}

/**
 * Read all rows from the google spreadsheet.
 *
 * run once when we initialise the application's
 * cache from existing spreadsheet data.
 */
export async function getAllJobRows() {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${SHEET_NAME}'!A:G`
        });

        return response.data.values || [];
    } catch (error) {
        console.error(`[Sheets Read Error]: ${error.message}`);
        throw error;
    }
}

/**
 * Load all ACTIVE jobs from Google Sheets.
 *
 * The spreadsheet structure is:
 * A = Job ID
 * B = Role
 * C = Who Posted
 * D = Location
 * E = Workplace Type
 * F = Status
 * G = Job URL Link
 */
export async function getActiveJobs() {
    const rows = await getAllJobRows();
    const activeJobs = new Map();

    // Start from index 1 because row 0 contains column headers.
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const [
            id,
            title,
            postedBy,
            location,
            type,
            status,
            link
        ] = row;

        // no job id, could be a blank line.
        if (!id) {
            continue;
        }

        // Only keep ACTIVE jobs in our current-state cache.
        if (status?.toUpperCase() !== "ACTIVE") {
            continue;
        }

        activeJobs.set(String(id), {
            id: String(id),
            title: title || "",
            postedBy: postedBy || "",
            location: location || "",
            type: type || "",
            link: link || ""
        });
    }

    console.log(
        `[Google Sheets] Loaded ${activeJobs.size} ACTIVE job(s).`
    );

    return activeJobs;
}