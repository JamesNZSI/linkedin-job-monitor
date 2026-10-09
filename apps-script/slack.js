function doPost(e) {
  const text = e.parameter.text || "";
  const returnTxt = `LinkedIn job monitor ran successfully. Please check the result by visiting https://docs.google.com/spreadsheets/d/1K9NUyDyz2gsiVRuUOXw1GG8mygwtQ3hGAvK7U1DJkSA/edit?usp=sharing`;
  return ContentService
    .createTextOutput(returnTxt)
    .setMimeType(ContentService.MimeType.TEXT);
}