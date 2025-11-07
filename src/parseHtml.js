/**
 * Main function to run.
 * You can run this function from the Apps Script editor.
 */
function main() {
  // Get the Folder ID from Script Properties (Secrets)
  const folderId =
    PropertiesService.getScriptProperties().getProperty("FOLDER_ID");

  // Stop if the secret is not set
  if (!folderId) {
    Logger.log("ERROR: 'FOLDER_ID' not set in Script Properties.");
    Logger.log(
      "Please run the 'setFolderId' function once from the editor to set it."
    );
    return;
  }

  try {
    const sourceFolder = DriveApp.getFolderById(folderId);

    // 1. Get the target Spreadsheet and Sheet
    // This will find or create 'SJLib' in the sourceFolder
    const spreadsheet = getOrCreateSpreadsheet(sourceFolder);
    if (!spreadsheet) {
      Logger.log("Could not find or create spreadsheet. Exiting.");
      return;
    }
    // This will find or create the 'Complexity' sheet
    const sheet = getOrCreateSheet(spreadsheet);

    // 2. Get helper folders (Done & Error) inside the source folder
    const doneFolder = getOrCreateSubFolder(sourceFolder, "Done");
    const errorFolder = getOrCreateSubFolder(sourceFolder, "Error");

    // 3. Process folder to find valid files
    const validFileIds = processHtmlFolder(sourceFolder, errorFolder);

    Logger.log(
      `Found ${validFileIds.length} valid files. Now parsing and saving...`
    );

    // 4. Parse each valid file and save data to the sheet
    validFileIds.forEach((fileId) => {
      parseAndSaveData(fileId, sheet, doneFolder);
    });

    // 5. Sort the sheet by Timestamp (Column 1)
    // Check if there is data to sort (more than just the header row)
    if (sheet.getLastRow() > 1) {
      const dataRange = sheet.getRange(
        2, // Start row (skip header at row 1)
        1, // Start column
        sheet.getLastRow() - 1, // Number of rows (all data, minus header)
        sheet.getLastColumn() // Number of columns
      );

      // Sort by the first column (Timestamp) in ascending order
      dataRange.sort({ column: 1, ascending: true });
      Logger.log("Successfully sorted the sheet by Timestamp (Column 1).");
    } else {
      Logger.log("No data to sort (sheet is empty or has header only).");
    }

    Logger.log("--- All valid files have been parsed and saved. ---");
  } catch (e) {
    Logger.log("FATAL ERROR in main: " + e.message);
    Logger.log("Stack: " + e.stack);
  }
}

/**
 * !!! RUN THIS FUNCTION ONCE !!!
 * A helper function to set the secret FOLDER_ID in Script Properties.
 * When you run this, it will prompt you for the folder ID.
 */
function setFolderId() {
  const folderId = Browser.inputBox(
    "Set Folder ID",
    "Please enter the Google Drive Folder ID:",
    Browser.Buttons.OK_CANCEL
  );

  if (folderId && folderId !== "cancel") {
    PropertiesService.getScriptProperties().setProperty("FOLDER_ID", folderId);
    Logger.log("Folder ID has been set successfully.");
    Logger.log("You can now run the 'main' function.");
  } else {
    Logger.log("Folder ID was not set.");
  }
}

/**
 * Finds 'SJLib' spreadsheet in a folder, or creates it there.
 * @param {DriveApp.Folder} parentFolder The Folder object to search in.
 * @return {Spreadsheet} The Spreadsheet object, or null on error.
 */
function getOrCreateSpreadsheet(parentFolder) {
  const ssName = "SJLib";
  try {
    const files = parentFolder.getFilesByName(ssName);

    // Check if a spreadsheet with this name already exists in the folder
    while (files.hasNext()) {
      const file = files.next();
      if (file.getMimeType() === MimeType.GOOGLE_SHEETS) {
        Logger.log("Found existing spreadsheet: " + ssName);
        return SpreadsheetApp.openById(file.getId());
      }
    }

    // If not found, create it
    Logger.log("Spreadsheet '" + ssName + "' not found. Creating...");
    const ss = SpreadsheetApp.create(ssName);
    const ssFile = DriveApp.getFileById(ss.getId());

    // Move the new spreadsheet to the target folder
    parentFolder.addFile(ssFile);
    DriveApp.getRootFolder().removeFile(ssFile);

    Logger.log(
      "Created new spreadsheet '" +
        ssName +
        "' in folder: " +
        parentFolder.getName()
    );
    return ss;
  } catch (e) {
    Logger.log("Error in getOrCreateSpreadsheet: " + e.message);
    return null;
  }
}

/**
 * Gets 'Complexity' sheet from a spreadsheet, or creates it with a header.
 * @param {Spreadsheet} spreadsheet The Spreadsheet object.
 * @return {Sheet} The Sheet object.
 */
function getOrCreateSheet(spreadsheet) {
  const sheetName = "Complexity";
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    Logger.log("Sheet '" + sheetName + "' not found. Creating...");
    sheet = spreadsheet.insertSheet(sheetName);
    // Add header row
    sheet.appendRow(["Timestamp", "Floor", "Location", "Status"]);
    Logger.log("Created new sheet and added header.");
  } else if (sheet.getLastRow() === 0) {
    // Sheet exists but is empty, add header
    Logger.log("Sheet '" + sheetName + "' exists but is empty. Adding header.");
    sheet.appendRow(["Timestamp", "Floor", "Location", "Status"]);
  } else {
    Logger.log("Found existing sheet: " + sheetName);
  }

  // Clean up the default "Sheet1" if it exists and isn't the one we want
  if (sheetName !== "Sheet1") {
    const defaultSheet = spreadsheet.getSheetByName("Sheet1");
    if (defaultSheet) {
      try {
        spreadsheet.deleteSheet(defaultSheet);
        Logger.log("Removed default 'Sheet1'.");
      } catch (e) {
        // This might fail if "Sheet1" was renamed or is the only sheet
        // We can safely ignore this error.
      }
    }
  }

  return sheet;
}

/**
 * Parses a single valid HTML file and appends its data to the sheet.
 * @param {string} fileId The Google Drive ID of the file to parse.
 * @param {Sheet} sheet The Google Sheet object to append data to.
 * @param {DriveApp.Folder} doneFolder The Folder to move the file to after success.
 */
function parseAndSaveData(fileId, sheet, doneFolder) {
  let file; // Declare file here to access it
  try {
    // --- Get Data ---
    file = DriveApp.getFileById(fileId);
    const fileName = file.getName();
    const htmlContent = file.getBlob().getDataAsString("UTF-8");

    const dateTimeString = parseDateTimeFromFilename(fileName);
    const trafficInfo = parseTrafficFromHtmlContent(htmlContent);

    // --- Prepare Data for Sheet ---
    const rowsToAdd = [];
    if (trafficInfo.length > 0) {
      trafficInfo.forEach((info) => {
        // New row: [Timestamp, Floor, Location, Status]
        rowsToAdd.push([
          dateTimeString,
          info.floor,
          info.location,
          info.status,
        ]);
      });
    } else {
      Logger.log("No traffic info found in file: " + fileName);
      return; // Nothing to save
    }

    // --- Save Data to Sheet ---
    if (rowsToAdd.length > 0) {
      // Append all rows at once for efficiency
      sheet
        .getRange(
          sheet.getLastRow() + 1, // Start row (next empty row)
          1, // Start column
          rowsToAdd.length, // Number of rows
          rowsToAdd[0].length // Number of columns
        )
        .setValues(rowsToAdd);

      Logger.log(
        "Successfully saved " +
          rowsToAdd.length +
          " rows from file: " +
          fileName
      );

      // --- Move File to "Done" folder ---
      if (file && doneFolder) {
        file.moveTo(doneFolder);
        Logger.log("Moved file '" + fileName + "' to Done folder.");
      }
    }
  } catch (e) {
    Logger.log(
      "Error in parseAndSaveData for file " + fileId + ": " + e.message
    );
  }
}

// --- YOUR ORIGINAL FUNCTIONS (Unchanged) ---

/**
 * Processes all HTML files in a folder, validates them, and moves bad files.
 * @param {DriveApp.Folder} sourceFolder The Google Drive Folder to process.
 *A* @param {DriveApp.Folder} errorFolder The Folder to move bad files to.
 * @returns {String[]} An array of file IDs that passed validation.
 */
function processHtmlFolder(sourceFolder, errorFolder) {
  const validFileIds = [];
  try {
    const files = sourceFolder.getFiles();

    Logger.log("Starting processing for folder: " + sourceFolder.getName());
    Logger.log("Error folder is: " + errorFolder.getName());

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
        Logger.log("  > SUCCESS: File is- valid. ID: " + fileId);
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
  return validFileIds;
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
 * Finds a folder by name inside a parent folder, or creates it.
 * @param {DriveApp.Folder} parentFolder The folder to search/create in.
 * @param {string} folderName The name of the subfolder to find or create.
 * @return {DriveApp.Folder} The Folder object.
 */
function getOrCreateSubFolder(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    Logger.log(
      "Creating folder '" +
        folderName +
        "' inside '" +
        parentFolder.getName() +
        "'."
    );
    return parentFolder.createFolder(folderName);
  }
}
