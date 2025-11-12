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

class ScraperAPI {
  // **IMPROVEMENT 1: Store all time info on the instance**
  constructor(timestamp, dayOfWeek, hourOfDay, url, apiKey) {
    this.timestamp = timestamp;
    this.dayOfWeek = dayOfWeek;
    this.hourOfDay = hourOfDay;
    this.url = url;
    this.apiKey = apiKey;
  }

  getTimestamp() {
    return this.timestamp;
  }

  getDayOfWeek() {
    return this.dayOfWeek;
  }

  getHourOfDay() {
    return this.hourOfDay;
  }

  getUrl() {
    return this.url;
  }

  getApiKey() {
    return this.apiKey;
  }

  /**
   * @returns {Success<ScraperAPI>|Failure}
   */
  static fromApiKey(url, apiKey) {
    // **IMPROVEMENT 2: Get all time info at once**
    const { timestamp, dayOfWeek, hourOfDay } = ScraperAPI.getTime();

    if (!apiKey || apiKey.trim() === "") {
      return new Failure("API key is missing or empty.");
    }
    if (!url || url.trim() === "") {
      return new Failure("URL is missing or empty.");
    }

    // **Pass all time info to the constructor**
    return new Success(
      new ScraperAPI(timestamp, dayOfWeek, hourOfDay, url, apiKey)
    );
  }

  /**
   * **IMPROVEMENT 3: Use instance properties and simplify logic**
   * @returns {Success<ScraperAPI>|Failure}
   */
  hasValidTime() {
    // **Get time info from 'this' instead of calling getTime() again**
    const { dayOfWeek, hourOfDay } = this;

    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isWeekdayTime = isWeekday && hourOfDay >= 9 && hourOfDay <= 21;

    const isWeekend = dayOfWeek === 6 || dayOfWeek === 7;
    const isWeekendTime = isWeekend && hourOfDay >= 9 && hourOfDay <= 17;

    // **Flattened boolean logic is easier to read**
    if (isWeekdayTime || isWeekendTime) {
      return new Success(this);
    }

    return new Failure(
      `Outside of scheduled KST hours (Day: ${dayOfWeek}, Hour: ${hourOfDay}).`
    );
  }

  /**
   * Gets the current time details for a specific time zone.
   * @returns {{timestamp: string, dayOfWeek: number, hourOfDay: number}}
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
  // **IMPROVEMENT 1: Renamed 'fileId' to 'spreadsheet' for clarity**
  constructor(spreadsheet, sheet) {
    this.spreadsheet = spreadsheet;
    this.sheet = sheet;
  }

  // **IMPROVEMENT 2: Renamed getter**
  getSpreadsheet() {
    return this.spreadsheet;
  }

  getSheet() {
    return this.sheet;
  }

  /**
   * **IMPROVEMENT 3: Refactored 'fromNames' to use .bind()**
   * This is much cleaner and perfectly follows your monadic pattern.
   * @param {*} fileName
   * @param {*} sheetName
   * @returns {Success<MySheet>|Failure}
   */
  static fromNames(fileName, sheetName) {
    return MySheet.fromFileName(fileName, "").bind((mySheet) => {
      // The value from the Success is 'mySheet'.
      // We get its spreadsheet and pass it to the next step in the chain.
      return MySheet.fromSheetName(mySheet.getSpreadsheet(), sheetName);
    });
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
          const spreadsheet = SpreadsheetApp.openById(file.getId());
          // **Pass the Spreadsheet object**
          return new Success(new MySheet(spreadsheet, sheet));
        }
      }

      Logger.log(`Spreadsheet '${fileName}' not found in root. Creating...`);
      const file = SpreadsheetApp.create(fileName);

      // **Pass the Spreadsheet object**
      return new Success(new MySheet(file, sheet));
    } catch (e) {
      return new Failure(`Error in 'getFileId': ${e}`);
    }
  }

  /**
   * **IMPROVEMENT 4: Simplified header logic**
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} spreadsheet
   * @param {string} sheetName
   * @returns {Success<MySheet>|Failure}
   */
  static fromSheetName(spreadsheet, sheetName) {
    try {
      let sheet = spreadsheet.getSheetByName(sheetName);

      if (!sheet) {
        Logger.log("Sheet '" + sheetName + "' not found. Creating...");
        sheet = spreadsheet.insertSheet(sheetName);
        // **Header logic is now cleaner**
        sheet.appendRow(["Timestamp", "Floor", "Location", "Status"]);
        Logger.log("Created new sheet and added header.");
      } else if (sheet.getLastRow() === 0) {
        Logger.log(
          "Sheet '" + sheetName + "' exists but is empty. Adding header."
        );
        sheet.appendRow(["Timestamp", "Floor", "Location", "Status"]);
      } else {
        Logger.log("Found existing sheet: " + sheetName);
      }

      if (sheetName !== "Sheet1") {
        const defaultSheet = spreadsheet.getSheetByName("Sheet1");
        if (defaultSheet) {
          spreadsheet.deleteSheet(defaultSheet);
          Logger.log("Removed default 'Sheet1'.");
        }
      }
      // **Pass the full spreadsheet object, not just its ID**
      return new Success(new MySheet(spreadsheet, sheet));
    } catch (e) {
      return new Failure(`Error in 'getSheet' ${e}`);
    }
  }

  // ... saveFrom ... (This function is already correct from the fix)
  /**
   * Appends the complexity data to the sheet.
   * @param {Success<Complexity[]>|Failure} complexityResult
   * @returns {Success<MySheet>|Failure}
   */
  saveFrom(complexityResult) {
    try {
      if (complexityResult instanceof Failure) {
        Logger.log(`Skipping save: ${complexityResult.getMessage()}`);
        return new Failure(complexityResult.getError()); // Propagate the error
      }

      const complexities = complexityResult.getValue();

      if (!complexities || complexities.length === 0) {
        Logger.log("No complexity data to save.");
        return new Success(this);
      }

      const sheet = this.getSheet();

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
          sheet.getLastRow() + 1,
          1,
          rowsToAdd.length,
          rowsToAdd[0].length
        )
        .setValues(rowsToAdd);

      Logger.log("Successfully saved " + rowsToAdd.length + " rows ");
      return new Success(this);
    } catch (e) {
      return new Failure(`Error in 'saveFrom': ${e.message}`);
    }
  }
}
