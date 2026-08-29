import { google } from "googleapis";

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME;

const auth = new google.auth.GoogleAuth({
    keyFile: "./google-credentials.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

const sheets = google.sheets({
    version: "v4",
    auth
});

async function testConnection() {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:G`
        });

        console.log("Successfully connected to Google Sheets.");
        console.log(response.data.values);
    } catch (error) {
        console.error("Google Sheets error:");
        console.error(error.message);
    }
}

// testConnection();

//test add
// import "dotenv/config";
import { syncRecordToGoogleSheets } from "./sheets.js";

const testJob = {
    id: "999999999",
    title: "Test Software Developer",
    postedBy: "Test Company",
    location: "Melbourne, VIC",
    type: "Hybrid",
    link: "https://www.linkedin.com/jobs/view/999999999"
};

// await syncRecordToGoogleSheets("ADD_NEW", testJob);

//test update
const testJob1 = {
    id: "999999999",
    title: "Test Software Developer"
};

// await syncRecordToGoogleSheets("MARK_CLOSED", testJob1);