function saveHtmlToDriveInFolder() {
  // --- Time Check Logic ---
  var now = new Date();

  // *** UPDATED LINE ***
  // Force the timezone to KST (Asia/Seoul)
  var timeZone = "Asia/Seoul";
  var dayOfWeek = parseInt(Utilities.formatDate(now, timeZone, "u")); // 1=Mon, 7=Sun
  var hourOfDay = parseInt(Utilities.formatDate(now, timeZone, "H")); // 0-23
  var shouldRun = false;

  // Check for weekdays (Mon-Fri, 1-5)
  if (dayOfWeek >= 2 && dayOfWeek <= 5) {
    // 9:00 AM (9) to 10:00 PM (22)
    if (hourOfDay >= 9 && hourOfDay <= 21) {
      shouldRun = true;
    }
  }
  // Check for weekends (Sat-Sun, 6-7)
  else if (dayOfWeek == 6 || dayOfWeek == 7) {
    // 9:00 AM (9) to 6:00 PM (18)
    if (hourOfDay >= 9 && hourOfDay <= 17) {
      shouldRun = true;
    }
  }
  // --- End of Time Check ---

  // --- Main Script Logic ---
  // The script will only run the code below if "shouldRun" is true.

  if (shouldRun) {
    Logger.log("Scheduled time (KST): Running script."); // Updated log

    // --- Configuration ---
    var apiKey =
      PropertiesService.getScriptProperties().getProperty("SCRAPERAPI_API_KEY");
    var targetUrl = "https://lib.sejong.go.kr/main/site/sensor/traffic.do";
    var folderName = "SJLIB";
    // ---------------------

    if (!apiKey) {
      Logger.log(
        "Error: API key not found. Did you set 'SCRAPERAPI_API_KEY' in your Script Properties?"
      );
      return;
    }

    var apiUrl =
      "http://api.scraperapi.com?api_key=" +
      apiKey +
      "&url=" +
      encodeURIComponent(targetUrl);

    try {
      // 1. Find the target folder
      var folderIterator = DriveApp.getFoldersByName(folderName);
      var targetFolder;

      if (folderIterator.hasNext()) {
        targetFolder = folderIterator.next();
      } else {
        targetFolder = DriveApp.createFolder(folderName);
      }

      // 2. Fetch the HTML content VIA THE API
      var response = UrlFetchApp.fetch(apiUrl, {
        muteHttpExceptions: true,
      });

      var htmlContent = response.getContentText();
      var responseCode = response.getResponseCode();

      // 3. Create the unique file name
      // *** UPDATED LINE ***
      // Use the KST timezone for the filename timestamp
      var timestamp = Utilities.formatDate(
        new Date(),
        timeZone,
        "yyyy-MM-dd_HH-mm-ss"
      );
      var fileName = timestamp + "_PageContent_Code-" + responseCode + ".html";

      // 4. Save the file
      targetFolder.createFile(fileName, htmlContent, MimeType.HTML);

      Logger.log(
        "Successfully saved: " +
          fileName +
          " (API Response: " +
          responseCode +
          ")"
      );
    } catch (e) {
      Logger.log("Error: " + e);
    }
  } else {
    // Log that the script was skipped
    Logger.log(
      "Outside of scheduled KST hours (" +
        dayOfWeek +
        " @ " +
        hourOfDay +
        ":00). Skipping execution."
    );
  }
}
