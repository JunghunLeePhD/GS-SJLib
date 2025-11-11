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
   * Helper to get the floor.
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

    if (contentText) {
      const results = [];

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
          results.push(new Complexity(floorNum, location, status));
        }
      }

      if (results.length > 0) {
        return new Success(results);
      }
      return new Failure("No complexity in the content");
    }
    return new Failure("No contexts in the response");
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
   * @param {string} timeZone e.g., "Asia/Seoul" or "America/New_York"
   * @returns {Success<Response>|Failure}
   */
  isValidCode() {
    const code = this.getResponseCode();
    if (200 <= code < 300) {
      return new Success(this);
    }
    return new Failure("Response code is not 2XX");
  }
}

/**
 * ScraperAPI class, refactored to return Success or Failure.
 */
class ScraperAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  /**
   * Fetches the URL and returns a monadic result.
   * @param {string} targetUrl
   * @returns {Success<Response>|Failure}
   */
  fetch(targetUrl) {
    try {
      const response = UrlFetchApp.fetch(
        `http://api.scraperapi.com?api_key=${
          this.apiKey
        }&url=${encodeURIComponent(targetUrl)}`,
        {
          muteHttpExceptions: true,
        }
      );
      const { timestamp } = ScraperAPI.getTime("Asia/Seoul");
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

  /**
   * Checks time zone and returns self in a Success or a Failure.
   * @param {string} timeZone e.g., "Asia/Seoul" or "America/New_York"
   * @returns {Success<ScraperAPI>|Failure}
   */
  isValidTime(timeZone) {
    const { dayOfWeek, hourOfDay } = ScraperAPI.getTime(timeZone);

    if (dayOfWeek >= 2 && dayOfWeek <= 5) {
      if (hourOfDay >= 9 && hourOfDay <= 21) {
        return new Success(this);
      }
    } else if (dayOfWeek === 6 || dayOfWeek === 7) {
      if (hourOfDay >= 9 && hourOfDay <= 17) {
        return new Success(this);
      }
    }
    return new Failure(
      `Outside of scheduled KST hours 
      (Day: ${dayOfWeek}, Hour: ${hourOfDay}).`
    );
  }

  /**
   * A "monadic" constructor that returns a Success or Failure.
   * @param {string} apiKey
   * @returns {Success<ScraperAPI>|Failure}
   */
  static fromApiKey(apiKey) {
    if (!apiKey || apiKey.trim() === "") {
      return new Failure("API key is missing or empty.");
    }
    return new Success(new ScraperAPI(apiKey));
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
  static getTime(timeZone) {
    const now = new Date();
    return {
      timestamp: Utilities.formatDate(now, timeZone, "yyyy-MM-dd_HH-mm-ss"),
      dayOfWeek: parseInt(Utilities.formatDate(now, timeZone, "u")),
      hourOfDay: parseInt(Utilities.formatDate(now, timeZone, "H")),
    };
  }
}

function main() {
  const apikey =
    PropertiesService.getScriptProperties().getProperty("SCRAPERAPI_API_KEY");

  const complexities = ScraperAPI.fromApiKey(apikey)
    .bind((scrapper) => scrapper.isValidTime("Asia/Seoul"))
    .bind((scrapper) =>
      scrapper.fetch("https://lib.sejong.go.kr/main/site/sensor/traffic.do")
    )
    .bind((response) => response.isValidCode())
    .bind((response) => Complexity.fromResponse(response));

  if (complexities instanceof Success) {
    for (let {
      timestamp,
      floor,
      location,
      status,
    } of complexities.getValue()) {
      Logger.log(`Success!: ${timestamp}, ${floor}, ${location}, ${status}`);
    }
  }

  if (complexities instanceof Failure) {
    Logger.log(`Operation failed: ${complexities.getMessage()}`);
  }
}
