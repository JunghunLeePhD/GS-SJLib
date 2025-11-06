/**
 * Main function to run.
 * You can run this function from the Apps Script editor.
 */
function main() {
  // !!! REPLACE THIS with the ID of your folder
  const folderId = "YOUR_FOLDER_ID_HERE";
  const validFileIds = processHtmlFolder(folderId);

  Logger.log(
    `Found ${validFileIds.length} valid files. Now parsing each one...`
  );

  validFileIds.forEach((fileId) => {
    runHtmlParsingExample(fileId);
  });

  Logger.log("All valid files have been parsed.");
}

/**
 * Processes all HTML files in a folder, validates them, and moves bad files.
 * @param {String} folderId The Google Drive ID of the folder to process.
 * @returns {String[]} An array of file IDs that passed validation.
 */
function processHtmlFolder(folderId) {
  // 1. Declare validFileIds in the function's top scope
  const validFileIds = [];

  try {
    // --- Setup ---
    const sourceFolder = DriveApp.getFolderById(folderId);
    const errorFolder = getOrCreateErrorFolder();
    const files = sourceFolder.getFiles();
    // (Declaration was moved up)

    Logger.log("Starting processing for folder: " + sourceFolder.getName());
    Logger.log("Error folder is: " + errorFolder.getName());

    // --- Processing Loop ---
    while (files.hasNext()) {
      const file = files.next();
      const fileName = file.getName();
      const fileId = file.getId();

      if (file.getMimeType() !== MimeType.HTML) {
        Logger.log("Skipping (not HTML): " + fileName);
        continue;
      }

      Logger.log("Processing file: " + fileName);

      let htmlContent;
      try {
        htmlContent = file.getBlob().getDataAsString("UTF-8");
      } catch (e) {
        Logger.log(
          "  > FAILED: Could not read file content. Moving to Error folder."
        );
        Logger.log("    - Reason: " + e.message);
        file.moveTo(errorFolder);
        continue;
      }

      // --- Validation Checks ---
      const dateTimeString = parseDateTimeFromFilename(fileName);
      const isNameValid = dateTimeString !== null;

      const trafficInfo = parseTrafficFromHtmlContent(htmlContent);
      const isContentValid = trafficInfo.length > 0;

      // --- Decision: Pass or Fail ---
      if (isNameValid && isContentValid) {
        Logger.log("  > SUCCESS: File is valid. ID: " + fileId);
        validFileIds.push(fileId); // Add to the array
      } else {
        Logger.log("  > FAILED: Moving to Error folder.");
        if (!isNameValid) {
          Logger.log(
            "    - Reason: File name does not contain a valid date/time."
          );
        }
        if (!isContentValid) {
          Logger.log("    - Reason: No traffic data found in file content.");
        }
        file.moveTo(errorFolder);
      }
    }
    // --- Final Report ---
    Logger.log("--- Processing Complete ---");
    Logger.log("Total valid files found: " + validFileIds.length);
    Logger.log("Valid File IDs: " + validFileIds.join(", "));
  } catch (e) {
    Logger.log("Error in processHtmlFolder: " + e.message);
  }

  // 2. Return the array at the end of the function.
  // This works even if an error happened (it will return an empty array).
  return validFileIds;
}

/**
 * Parses a single valid HTML file and logs its traffic info.
 * @param {string} fileId The Google Drive ID of the file to parse.
 */
function runHtmlParsingExample(fileId) {
  try {
    // --- Processing ---
    const file = DriveApp.getFileById(fileId);
    const fileName = file.getName();
    const htmlContent = file.getBlob().getDataAsString("UTF-8");

    // 1. Get date from the file name
    const dateTimeString = parseDateTimeFromFilename(fileName);

    // 2. Get traffic info (with floors) from the HTML content
    const trafficInfo = parseTrafficFromHtmlContent(htmlContent);

    // --- Output ---
    Logger.log("--- Parsing File: " + fileName + " ---");
    Logger.log("Extracted Date/Time: " + dateTimeString);
    if (trafficInfo.length > 0) {
      trafficInfo.forEach((info) => {
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
      // This shouldn't happen if it passed processHtmlFolder, but good to have
      Logger.log("No traffic info found in this file.");
    }
  } catch (e) {
    Logger.log("Error parsing file " + fileId + ": " + e.message);
  }
}

/**
 * 1. Extracts a date and time string from a file name.
 * @param {string} fileName The name of the file.
 * @return {string} The extracted date/time string, or null if not found.
 */
function parseDateTimeFromFilename(fileName) {
  const regex = /(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})/;
  const match = fileName.match(regex);
  if (match && match[1]) {
    return match[1];
  } else {
    // We log the failure inside processHtmlFolder,
    // but log here if called directly.
    // Logger.log("No date/time pattern found in filename: " + fileName);
    return null;
  }
}

/**
 * 2. Extracts traffic information, including floors, from the HTML content.
 * @param {string} htmlContent The HTML content as a string.
 * @return {Array<Object>} An array of objects.
 */
function parseTrafficFromHtmlContent(htmlContent) {
  const results = [];
  const floorRegex =
    /<div class="floor_info">\s*<div class="f_num">([\w\d]+)<\/div>\s*<\/div>\s*<div class="floor_img">([\s\S]*?)<\/div>/g;
  const locationRegex =
    /<p class="map_pin"[\s\S]*?<span class='situ\d'>(.*?)<\/span>(.*?)<\/p>/g;

  let floorMatch;
  while ((floorMatch = floorRegex.exec(htmlContent)) !== null) {
    const floorNum = floorMatch[1].trim();
    const imgContent = floorMatch[2];

    let locMatch;
    while ((locMatch = locationRegex.exec(imgContent)) !== null) {
      const status = locMatch[1].trim();
      const location = locMatch[2].trim();
      results.push({
        floor: floorNum,
        location: location,
        status: status,
      });
    }
  }
  return results;
}

/**
 * Finds a folder named "Error" in the root of your Drive, or creates it.
 * @return {DriveApp.Folder} The "Error" folder.
 */
function getOrCreateErrorFolder() {
  const folderName = "Error";
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return DriveApp.createFolder(folderName);
  }
}
