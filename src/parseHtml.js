/**
 * Main function to run as an example.
 * Replace 'YOUR_FILE_ID_HERE' with the actual Google Drive file ID.
 * @param {string} fileID The name of the file.
 */
function runHtmlParsingExample(fileID) {
  try {
    // --- Configuration ---
    // !!! REPLACE THIS with the ID of your example HTML file in Google Drive.
    // You can get this from the URL when you open the file.

    // --- Processing ---
    const file = DriveApp.getFileById(fileId);
    const fileName = file.getName();
    const htmlContent = file.getBlob().getDataAsString("UTF-8"); // charset=utf-8 is in the HTML

    // 1. Get date from the file name
    const dateTimeString = parseDateTimeFromFilename(fileName);

    // 2. Get traffic info (with floors) from the HTML content
    const trafficInfo = parseTrafficFromHtmlContent(htmlContent);

    // --- Output ---
    Logger.log("File Name: " + fileName);
    Logger.log("Extracted Date/Time: " + dateTimeString);
    Logger.log("--- Traffic Info ---");
    if (trafficInfo.length > 0) {
      trafficInfo.forEach((info) => {
        // Log the new format: Floor, Location, Status
        Logger.log(
          "Floor: " +
            info.floor +
            ", Location: " +
            info.location +
            ", Status: " +
            info.status
        );
      });
    } else {
      Logger.log(
        "No traffic info found. The HTML structure might have changed."
      );
    }
  } catch (e) {
    Logger.log("Error: " + e.message);
  }
}

/**
 * 1. Extracts a date and time string from a file name.
 *
 * Based on the sample file '2025-11-06_11-20-02_PageContent_Code-200.html',
 * this regex captures the 'YYYY-MM-DD_HH-MM-SS' part.
 *
 * @param {string} fileName The name of the file.
 * @return {string} The extracted date/time string, or null if not found.
 */
function parseDateTimeFromFilename(fileName) {
  // This regex looks for a pattern like '2025-11-06_11-20-02'
  const regex = /(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})/;

  const match = fileName.match(regex);

  if (match && match[1]) {
    return match[1]; // Returns the first captured group (the date/time part)
  } else {
    Logger.log("No date/time pattern found in filename: " + fileName);
    return null;
  }
}

/**
 * 2. Extracts traffic information, including floors, from the HTML content.
 *
 * This function uses a two-stage regex approach.
 * 1. Find each "floor block" and extract the floor number (e.g., "B1", "1F").
 * 2. Within that block's content, find all the "map_pin" entries to get
 * the status and location.
 *
 * @param {string} htmlContent The HTML content as a string.
 * @return {Array<Object>} An array of objects, e.g.,
 * [{floor: 'B1', location: '대강당', status: '원활'}, ...]
 */
function parseTrafficFromHtmlContent(htmlContent) {
  const results = [];

  // Regex to find each floor block.
  // It captures the floor number (e.g., "B1") in group 1
  // and all the HTML for the "floor_img" in group 2.
  const floorRegex =
    /<div class="floor_info">\s*<div class="f_num">([\w\d]+)<\/div>\s*<\/div>\s*<div class="floor_img">([\s\S]*?)<\/div>/g;

  // Regex to find each location pin within a "floor_img" block.
  // It captures the status (e.g., "원활") in group 1
  // and the location (e.g., "대강당") in group 2.
  const locationRegex =
    /<p class="map_pin"[\s\S]*?<span class='situ\d'>(.*?)<\/span>(.*?)<\/p>/g;

  let floorMatch;
  // Loop 1: Find each floor block
  while ((floorMatch = floorRegex.exec(htmlContent)) !== null) {
    const floorNum = floorMatch[1].trim(); // e.g., "B1", "1F"
    const imgContent = floorMatch[2]; // HTML content for that floor's map

    let locMatch;
    // Loop 2: Find all locations *within* that floor block
    while ((locMatch = locationRegex.exec(imgContent)) !== null) {
      const status = locMatch[1].trim();
      const location = locMatch[2].trim();

      // Add all three pieces of information to our results
      results.push({
        floor: floorNum,
        location: location,
        status: status,
      });
    }
  }

  return results;
}
