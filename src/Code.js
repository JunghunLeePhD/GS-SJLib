/**
 * Main function to run the scraper.
 */
function main() {
  const apikey =
    PropertiesService.getScriptProperties().getProperty("SCRAPERAPI_API_KEY");

  // This part is fine
  const complexities = ScraperAPI.fromApiKey(
    "https://lib.sejong.go.kr/main/site/sensor/traffic.do",
    apikey
  )
    .bind((scrapper) => scrapper.hasValidTime())
    .bind((response) => Response.fromScraperAPI(response))
    .bind((response) => response.hasValidCode())
    .bind((response) => Complexity.fromResponse(response));

  const mySheetResult = MySheet.fromNames("SJCityLib", "Complexity");

  const saveResult = mySheetResult.bind((mySheet) =>
    mySheet.saveFrom(complexities)
  );

  if (saveResult instanceof Success) {
    Logger.log("Operation Succeeded (including save):");

    if (complexities instanceof Success) {
      for (let {
        timestamp,
        floor,
        location,
        status,
      } of complexities.getValue()) {
        Logger.log(
          `  - Timestamp: ${timestamp}, Floor: ${floor}, Location: ${location}, Status: ${status}`
        );
      }
    }
  }

  if (saveResult instanceof Failure) {
    Logger.log(`Operation failed: ${saveResult.getMessage()}`);
  }
}

/**
 * A container for a successful operation's value.
 */
class Success {
  constructor(value) {
    this.value = value;
  }

  /**
   * Chains an operation that returns a new Success or Failure.
   * @param {function(any): (Success|Failure)} fn The function to run.
   * @returns {Success|Failure}
   */
  bind(fn) {
    try {
      return fn(this.value);
    } catch (e) {
      return new Failure(e); // Pass the whole error
    }
  }

  /**
   * Transforms the value inside the Success container.
   * @param {function(any): any} fn The function to run.
   * @returns {Success|Failure}
   */
  map(fn) {
    try {
      return new Success(fn(this.value));
    } catch (e) {
      return new Failure(e); // Pass the whole error
    }
  }

  /**
   * Helper to get the value.
   */
  getValue() {
    return this.value;
  }
}

/**
 * A container for a failed operation's error.
 */
class Failure {
  constructor(error) {
    // Store the error (string or Error object)
    this.error = error;
  }

  /**
   * Skips the map operation and propagates the failure.
   * @returns {Failure}
   */
  map(fn) {
    return this;
  }

  /**
   * Skips the chained operation and propagates the failure.
   * @returns {Failure}
   */
  bind(fn) {
    return this;
  }

  /**
   * Helper to get the error message.
   */
  getMessage() {
    return this.error.message || String(this.error);
  }

  /**
   * Helper to get the raw error object.
   */
  getError() {
    return this.error;
  }
}

/**
 * ScraperAPI class, refactored to return Success or Failure.
 */
class ScraperAPI {
  constructor(timestamp, url, apiKey) {
    this.timestamp = timestamp;
    this.url = url;
    this.apiKey = apiKey;
  }

  getTimestamp() {
    return this.timestamp;
  }

  getUrl() {
    return this.url;
  }

  getApiKey() {
    return this.apiKey;
  }

  /**
   * A "monadic" constructor that returns a Success or Failure.
   * @param {string} url The URL to scrape.
   * @param {string} apiKey The ScraperAPI key.
   * @returns {Success<ScraperAPI>|Failure}
   */
  static fromApiKey(url, apiKey) {
    const { timestamp } = ScraperAPI.getTime();

    if (!apiKey || apiKey.trim() === "") {
      return new Failure("API key is missing or empty.");
    }
    if (!url || url.trim() === "") {
      return new Failure("URL is missing or empty.");
    }

    return new Success(new ScraperAPI(timestamp, url, apiKey));
  }

  /**
   * Checks time zone and returns self in a Success or a Failure.
   * @returns {Success<ScraperAPI>|Failure}
   */
  hasValidTime() {
    const { dayOfWeek, hourOfDay } = ScraperAPI.getTime("Asia/Seoul");

    // Weekdays (Mon=1, Tue=2, Wed=3, Thu=4, Fri=5)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      if (hourOfDay >= 9 && hourOfDay <= 21) {
        return new Success(this);
      }
    }

    // Weekends (Sat=6, Sun=7)
    if (dayOfWeek === 6 || dayOfWeek === 7) {
      if (hourOfDay >= 9 && hourOfDay <= 17) {
        return new Success(this);
      }
    }

    // Note: Google's 'u' format is 1-7 for Mon-Sun.
    // If you were using 'c', it would be 2-6 for Mon-Fri and 7/1 for Sat/Sun.
    // 'u' is correct here.

    return new Failure(
      `Outside of scheduled KST hours (Day: ${dayOfWeek}, Hour: ${hourOfDay}).`
    );
  }

  /**
   * Gets the current time details for a specific time zone.
   * @param {string} timeZone e.g., "Asia/Seoul" or "America/New_York"
   * @returns {{timestamp: string, dayOfWeek: number, hourOfDay: number}}
   * An object containing:
   * - timestamp: Formatted string (yyyy-MM-dd_HH-mm-ss)
   * - dayOfWeek: Day of the week (1=Mon, 7=Sun)
   * - hourOfDay: Hour of the day (0-23)
   */
  static getTime() {
    const now = new Date();
    const timeZone = "Asia/Seoul";
    return {
      timestamp: Utilities.formatDate(now, timeZone, "yyyy-MM-dd_HH-mm-ss"),
      dayOfWeek: parseInt(Utilities.formatDate(now, timeZone, "u")), // 1=Mon, 7=Sun
      hourOfDay: parseInt(Utilities.formatDate(now, timeZone, "H")), // 0-23
    };
  }
}

/**
 * Response class
 */
class Response {
  /**
   * @param {string} timestamp
   * @param {string} contentText
   * @param {number} responseCode
   */
  constructor(timestamp, contentText, responseCode) {
    this.timestamp = timestamp;
    this.contentText = contentText;
    this.responseCode = responseCode;
  }

  /** @returns {string} */
  getTimestamp() {
    return this.timestamp;
  }

  /** @returns {string} */
  getContentText() {
    return this.contentText;
  }

  /** @returns {number} */
  getResponseCode() {
    return this.responseCode;
  }

  /**
   * Checks response code and returns self in a Success or a Failure.
   * @returns {Success<Response>|Failure}
   */
  hasValidCode() {
    const code = this.getResponseCode();
    // [FIX 2] Corrected JavaScript for a range check.
    // The expression `200 <= code < 300` does not work as intended.
    if (code >= 200 && code < 300) {
      return new Success(this);
    }
    return new Failure(`Response code was ${code}, not 2XX.`);
  }

  /**
   * Fetches the URL and returns a monadic result.
   * @param {ScraperAPI} scraperapi
   * @returns {Success<Response>|Failure}
   */
  static fromScraperAPI(scraperapi) {
    const timestamp = scraperapi.getTimestamp();
    const apiKey = scraperapi.getApiKey();
    const targetUrl = scraperapi.getUrl();

    try {
      const apiUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(
        targetUrl
      )}`;

      const response = UrlFetchApp.fetch(apiUrl, {
        muteHttpExceptions: true, // This is crucial!
      });

      return new Success(
        new Response(
          timestamp,
          response.getContentText(),
          response.getResponseCode()
        )
      );
    } catch (e) {
      return new Failure(e); // Pass the whole error
    }
  }
}

/**
 * Complexity class
 */
class Complexity {
  /**
   * @param {string} timestamp
   * @param {string} floor
   * @param {string} location
   * @param {string} status
   */
  constructor(timestamp, floor, location, status) {
    this.timestamp = timestamp;
    this.floor = floor;
    this.location = location;
    this.status = status;
  }

  /**
   * Helper to get the timestamp.
   * @returns {string}
   */
  getTimestamp() {
    return this.timestamp;
  }

  /**
   * Helper to get the floor.
   * @returns {string}
   */
  getFloor() {
    return this.floor;
  }

  /**
   * Helper to get the location.
   * @returns {string}
   */
  getLocation() {
    return this.location;
  }

  /**
   * Helper to get the status.
   * @returns {string}
   */
  getStatus() {
    return this.status;
  }

  /**
   * Parses the contents and returns complexity list in a Success or Failure
   * @param {Response} response
   * @returns {Success<Complexity[]>|Failure}
   */
  static fromResponse(response) {
    const contentText = response.getContentText();
    if (!contentText) {
      return new Failure("No content in the response");
    }

    const timestamp = response.getTimestamp();
    let results = [];

    const floorRegex =
      /<div class="floor_info">\s*<div class="f_num">([\w\d]+)<\/div>\s*<\/div>\s*<div class="floor_img">([\s\S]*?)<\/div>/g;
    const locationRegex =
      /<p class="map_pin"[\s\S]*?<span class='situ\d'>(.*?)<\/span>(.*?)<\/p>/g;

    let floorMatch;
    while ((floorMatch = floorRegex.exec(contentText)) !== null) {
      const floorNum = floorMatch[1].trim();
      const imgContent = floorMatch[2];

      let locMatch;
      while ((locMatch = locationRegex.exec(imgContent)) !== null) {
        const status = locMatch[1].trim();
        const location = locMatch[2].trim();

        results.push(new Complexity(timestamp, floorNum, location, status));
      }
    }

    if (results.length > 0) {
      return new Success(results);
    }
    return new Failure("No complexity data found in the content");
  }
}

class MySheet {
  constructor(fileId, sheet) {
    this.fileId = fileId;
    this.sheet = sheet;
  }

  getFileId() {
    return this.fileId;
  }

  getSheet() {
    return this.sheet;
  }

  /**
   *
   * @param {*} fileName
   * @param {*} sheetName
   * @returns {Success<MySheet>|Failure}
   */
  static fromNames(fileName, sheetName) {
    // **FIX:** Properly chain the monadic results

    // 1. Get the file result
    const fileResult = MySheet.fromFileName(fileName, "");

    // 2. If fileResult is a Failure, stop and return it.
    if (fileResult instanceof Failure) {
      return fileResult;
    }

    // 3. We have Success, so get the Spreadsheet object
    // .getFileId() here returns this.fileId, which we set as the Spreadsheet object
    const spreadsheet = fileResult.getValue().getFileId();

    // 4. Now get the sheet result
    const sheetResult = MySheet.fromSheetName(spreadsheet, sheetName);

    // 5. Return the final result (which is Success<MySheet> or Failure)
    return sheetResult;
  }
  /**
   *
   * @param {string} fileName
   * @returns {Success<MySheet>|Failure}
   */
  static fromFileName(fileName, sheet) {
    try {
      const rootFolder = DriveApp.getRootFolder();
      const files = rootFolder.getFilesByName(fileName);

      while (files.hasNext()) {
        const file = files.next();
        if (file.getMimeType() === MimeType.GOOGLE_SHEETS) {
          Logger.log(
            `Found existing Spreadsheet: '${fileName}' in root folder.`
          );
          // Get the Spreadsheet object
          const spreadsheet = SpreadsheetApp.openById(file.getId());
          return new Success(new MySheet(spreadsheet, sheet));
        }
      }

      Logger.log(`Spreadsheet '${fileName}' not found in root. Creating...`);

      // Create returns the Spreadsheet object
      const file = SpreadsheetApp.create(fileName);

      // **FIX:** Pass the Spreadsheet object 'file', not 'file.getId()'
      return new Success(new MySheet(file, sheet));
    } catch (e) {
      return new Failure(`Error in 'getFileId': ${e}`);
    }
  }

  /**
   *
   * @param {string} sheetName
   * @returns {Success<MySheet>|Failure}
   */
  static fromSheetName(fileId, sheetName) {
    try {
      const sheet = fileId.getSheetByName(sheetName);

      if (!sheet) {
        Logger.log("Sheet '" + sheetName + "' not found. Creating...");
        sheet = fileId.insertSheet(sheetName);
        sheet.appendRow(["Timestamp", "Floor", "Location", "Status"]);
        Logger.log("Created new sheet and added header.");
      }

      if (sheet.getLastRow() === 0) {
        Logger.log(
          "Sheet '" + sheetName + "' exists but is empty. Adding header."
        );
        sheet.appendRow(["Timestamp", "Floor", "Location", "Status"]);
      }

      Logger.log("Found existing sheet: " + sheetName);

      if (sheetName !== "Sheet1") {
        const defaultSheet = fileId.getSheetByName("Sheet1");
        if (defaultSheet) {
          fileId.deleteSheet(defaultSheet);
          Logger.log("Removed default 'Sheet1'.");
        }
      }
      return new Success(new MySheet(fileId, sheet));
    } catch (e) {
      return new Failure(`Error in 'getSheet' ${e}`);
    }
  }

  /**
   * Appends the complexity data to the sheet.
   * @param {Success<Complexity[]>|Failure} complexityResult
   * @returns {Success<MySheet>|Failure}
   */
  saveFrom(complexityResult) {
    try {
      // **FIX 1: Check if the *input* was a failure**
      if (complexityResult instanceof Failure) {
        Logger.log(`Skipping save: ${complexityResult.getMessage()}`);
        return new Failure(complexityResult.getError()); // Propagate the error
      }

      // **FIX 2: Get the *value* (the array) from the Success object**
      const complexities = complexityResult.getValue();

      if (!complexities || complexities.length === 0) {
        Logger.log("No complexity data to save.");
        return new Success(this); // Successful, but nothing to do
      }

      const sheet = this.getSheet(); // this.sheet is a Sheet object

      // **FIX 3: Now map the 'complexities' array**
      const rowsToAdd = complexities.map((complexity) => {
        return [
          complexity.getTimestamp(),
          complexity.getFloor(),
          complexity.getLocation(),
          complexity.getStatus(),
        ];
      });

      if (rowsToAdd.length === 0) {
        Logger.log("No rows to add after mapping.");
        return new Success(this);
      }

      sheet
        .getRange(
          sheet.getLastRow() + 1, // Start row (next empty row)
          1, // Start column
          rowsToAdd.length, // Number of rows
          rowsToAdd[0].length // Number of columns
        )
        .setValues(rowsToAdd);

      Logger.log("Successfully saved " + rowsToAdd.length + " rows ");
      // **FIX 4: Return a Success object for consistency**
      return new Success(this);
    } catch (e) {
      return new Failure(`Error in 'saveFrom': ${e.message}`);
    }
  }
}
