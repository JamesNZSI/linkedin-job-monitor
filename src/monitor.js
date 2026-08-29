import { fetchLinkedInJobs } from "./linkedin.js";
import { syncRecordToGoogleSheets, getActiveJobs } from "./sheets.js";

let localCacheDb = new Map();
let cacheInitialized = false;


/**
 * Initialise local cache 
 * using ACTIVE jobs already stored in Google Sheets.
 */
export async function initializeCache() {
    console.log(
        "[Monitor] Initializing cache from Google Sheets..."
    );

    localCacheDb = await getActiveJobs();
    cacheInitialized = true;

    console.log(
        `[Monitor] Cache initialized with ` +
        `${localCacheDb.size} ACTIVE job(s).`
    );
}

/**
 * Compare the latest LinkedIn snapshot with the previous one.
 *
 * New job:
 *   incoming snapshot contains ID
 *   previous snapshot does not
 *   -> ADD_NEW
 *
 * Closed job:
 *   previous snapshot contains ID
 *   incoming snapshot does not
 *   -> MARK_CLOSED
 */
async function processDeltas(incomingSnapshotMap) {
    // Safety protection:
    // An empty result may indicate a LinkedIn/network/parser problem.
    // We must NOT interpret that as "every job has closed".
    if (incomingSnapshotMap.size === 0) {
        console.warn(
            "[Safety Abort] No jobs were extracted. " +
            "Skipping delta processing."
        );
        return;
    }

    console.log(
        `[Monitor] Previous: ${localCacheDb.size}, ` +
        `Current: ${incomingSnapshotMap.size}`
    );

    // 1. Detect newly posted jobs
    for (const [id, job] of incomingSnapshotMap.entries()) {
        if (!localCacheDb.has(id)) {
            console.log(
                `[Monitor] NEW: ${job.title} (${id})`
            );

            await syncRecordToGoogleSheets(
                "ADD_NEW",
                job
            );
        }
    }

    // 2. Detect closed/removed jobs
    for (const [id, job] of localCacheDb.entries()) {
        if (!incomingSnapshotMap.has(id)) {
            console.log(
                `[Monitor] CLOSED: ${job.title} (${id})`
            );

            await syncRecordToGoogleSheets(
                "MARK_CLOSED",
                job
            );
        }
    }

    // Current state becomes previous state
    // for the next monitoring cycle.
    localCacheDb = incomingSnapshotMap;

    console.log("[Monitor] Snapshot updated.");
}


/**
 * Run one complete monitoring cycle.
 *
 * LinkedIn -> fetch jobs -> compare with previous state -> Google Sheets
 */
export async function monitorPipeline() {
    const companyId = process.env.LINKEDIN_COMPANY_ID;
    if (!companyId) {
        throw new Error(
            "LINKEDIN_COMPANY_ID is not configured."
        );
    }

    try {
        console.log("\n==============================");
        console.log("[Monitor] Starting monitoring cycle");
        console.log(new Date().toLocaleString());

        const currentSnapshot = await fetchLinkedInJobs();
        await processDeltas(currentSnapshot);

        console.log(
            "[Monitor] Monitoring cycle completed."
        );
    } catch (error) {
        console.error(
            `[Monitor Error]: ${error.message}`
        );
    }
}