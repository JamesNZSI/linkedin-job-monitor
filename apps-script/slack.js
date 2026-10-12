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