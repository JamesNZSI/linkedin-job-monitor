function doPost(e) {
  const command = (e.parameter.text || "").trim().toLowerCase();

  try {
    if (command === "") {
      //trigger by slack without parameter
      runJobMonitor(false);

    } else if (command === "create-new") {
      //trigger by slack with parameter create-new
      runJobMonitor(true);

    } else {
      return slackResponse_(
        `Unknown parameter: "${command}".\n` +
        `Use no parameter or "create-new".`
      );
    }

    return slackResponse_(
      `LinkedIn job monitor ran successfully.\n` +
      `Please check the result by visiting ${CONFIG.SPREADSHEET_URL}`
    );

  } catch (error) {
    Logger.log(`[Slack Error]: ${error.stack || error}`);

    return slackResponse_(`LinkedIn job monitor failed: ${error.message}`);
  }
}

function slackResponse_(text) {
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.TEXT);
}
function testNormalRun() {
  runJobMonitor(true);
}
function testGetLatestSheet() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  Logger.log(
    `[TEST] Spreadsheet: ${spreadsheet.getName()}`
  );

  Logger.log(
    `[TEST] Spreadsheet ID: ${spreadsheet.getId()}`
  );

  const sheets = spreadsheet.getSheets();

  Logger.log(
    `[TEST] Number of tabs: ${sheets.length}`
  );

  for (const sheet of sheets) {
    Logger.log(
      `[TEST] Tab: "${sheet.getName()}"`
    );
  }

  const latestSheet = getLatestSheet_();

  if (latestSheet) {
    Logger.log(
      `[TEST] Latest sheet found: "${latestSheet.getName()}"`
    );
  } else {
    Logger.log(
      "[TEST] ERROR: getLatestSheet_() returned null"
    );
  }
}