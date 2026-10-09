import axios from 'axios';
import * as cheerio from 'cheerio';
import { google } from 'googleapis';
// CONFIGURATION PARAMETERS
const LINKEDIN_COMPANY_ID = '16247'; // Replace with target numeric ID
const SPREADSHEET_ID = 'YOUR_GOOGLE_SHEET_SPREADSHEET_ID';
const SHEET_NAME = 'Job Monitoring Logs';
// Google API Authentication Setup (Requires Service Account JSON file)
const auth = new google.auth.GoogleAuth({
    keyFile: './google-credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const sheets = google.sheets({ version: 'v4', auth });
let localCacheDb = new Map();
/**
* Handles appending new records or toggling status states inside the target Google Sheet
*/
async function syncRecordToGoogleSheets(action, job) {
    try {
        if (action === 'ADD_NEW') {
            // Append a row structured to track our minimum required layout variables
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SHEET_NAME}!A:G`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [[job.id, job.title, job.postedBy, job.location, job.type, 'ACTIVE', job.link]]
                }
            });
            console.log(`[Google Sheets] Logged new row for role: ${job.title}`);
        } else if (action === 'MARK_CLOSED') {
            // Locate row matching job.id and update status column to 'CLOSED'
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SHEET_NAME}!A:G`
            });
            const rows = response.data.values || [];
            const rowIndex = rows.findIndex(row => row[0] === job.id);
            if (rowIndex !== -1) {
                await sheets.spreadsheets.values.update({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `${SHEET_NAME}!F${rowIndex + 1}`, // Target Status Column
                    valueInputOption: 'USER_ENTERED',
                    requestBody: { values: [['CLOSED']] }
                });
                console.log(`[Google Sheets] Updated status to CLOSED for job ID: ${job.id}`);
            }
        }
    } catch (err) {
        console.error(`[Sheets Syncer Error]: ${err.message}`);
    }
}
/**
* Comparator Engine processing architectural deltas between executions
*/
async function processDeltas(incomingSnapshotMap) {
    if (incomingSnapshotMap.size === 0) {
        console.warn('[Safety Abort] Extracted array is empty. Skipping execution loop to protect spreadsheet data.');
        return;
    }
    // 1. Evaluate additions
    for (const [id, job] of incomingSnapshotMap.entries()) {
        if (!localCacheDb.has(id)) {
            await syncRecordToGoogleSheets('ADD_NEW', job);
        }
    }
    // 2. Evaluate closures / take downs
    for (const [id, job] of localCacheDb.entries()) {
        if (!incomingSnapshotMap.has(id)) {
            await syncRecordToGoogleSheets('MARK_CLOSED', job);
        }
    }
    localCacheDb = incomingSnapshotMap;
}
/**
* Primary Crawler Pipeline Execution Function
*/
async function monitorPipeline() {
    try {
        const currentSnapshot = new Map();
        const targetUrl = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings?f_C=${LINKEDIN_COMPANY_ID}&start;=0`;
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
                'Accept-Language': 'en-AU,en;q=0.9'
            }
        });
        const $ = cheerio.load(response.data);
        $('li').each((_, el) => {
            const linkTag = $(el).find('a.base-card__full-link');
            const href = linkTag.attr('href');
            if (href) {
                const idMatch = href.match(/\/view\/(\d+)/) || href.match(/currentJobId=(\d+)/);
                if (idMatch) {
                    const id = idMatch[1];
                    const title = $(el).find('.base-search-card__title').text().trim();
                    const postedBy = $(el).find('.base-search-card__subtitle').text().trim();
                    const location = $(el).find('.job-search-card__location').text().trim();
                    // Parse localized badges or metadata arrays to determine workspace model type
                    const typeText = $(el).find('.job-search-card__benefits, .base-search-card__metadata').text().toLowerCase();
                    let type = 'On-site';
                    if (typeText.includes('remote')) type = 'Remote';
                    else if (typeText.includes('hybrid')) type = 'Hybrid';
                    const cleanLink = href.split('?')[0];
                    currentSnapshot.set(id, { id, title, postedBy, location, type, link: cleanLink });
                }
            }
        });
        await processDeltas(currentSnapshot);
    } catch (error) {
        console.error(`[Pipeline Error]: ${error.message} `);
    }
}
// Initialise daemon loop intervals
setInterval(monitorPipeline, 15 * 60 * 1000);