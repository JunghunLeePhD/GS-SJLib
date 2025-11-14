/**
 * Serves the HTML file for the web app.
 * @param {object} e The event parameter for a web app request.
 * @returns {HtmlService.HtmlOutput} The HTML output for the web app.
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile("index")
    .evaluate()
    .setTitle("Library Complexity Dashboard")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

/**
 * Gets the data from the 'SJCityLib' spreadsheet and processes it for visualization and prediction.
 *
 * @returns {Object} An object containing data for charts and the prediction model.
 */
function getSheetData() {
  try {
    // --- 1. Fetch Data ---
    const files = DriveApp.getFilesByName("SJCityLib");
    if (!files.hasNext()) {
      Logger.log("Error: Spreadsheet 'SJCityLib' not found.");
      throw new Error("Spreadsheet 'SJCityLib' not found.");
    }

    const ss = SpreadsheetApp.open(files.next());
    const sheet = ss.getSheetByName("Complexity");
    if (!sheet) {
      Logger.log("Error: Sheet 'Complexity' not found in spreadsheet.");
      throw new Error("Sheet 'Complexity' not found in spreadsheet.");
    }

    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
    Logger.log(`Found ${data.length} rows of data.`);

    // --- 2. Process Data & Build Model ---
    const chartData = {};
    const predictionModel = {};
    const hourlyComplexity = {}; // For time series

    const uniqueFloors = new Set();
    const uniqueLocations = new Set();
    const uniqueDays = new Set([
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ]);
    const uniqueHours = new Set();

    let processedRows = 0;

    data.forEach((row, index) => {
      try {
        const timestampCell = row[0];
        const floor = row[1] ? row[1].trim() : null;
        const location = row[2] ? row[2].trim() : null;
        const status = row[3] ? row[3].trim() : null;

        // Skip row if key data is missing
        if (!timestampCell || !floor || !location || !status) {
          Logger.log(`Skipping row ${index + 2}: Missing data.`);
          return;
        }

        let date;

        // --- NEW TIMESTAMP LOGIC ---
        // Check if Google Sheets has already converted it to a Date object
        if (timestampCell instanceof Date) {
          date = timestampCell;
          Logger.log(`Processing row ${index + 2} as Date object.`);
        }
        // Check if it's a string in the expected format
        else if (
          typeof timestampCell === "string" &&
          timestampCell.includes("_")
        ) {
          const parts = timestampCell.split("_");
          const dateStr = parts[0];
          const timeStr = parts[1];
          const dateParts = dateStr.split("-");

          // --- THIS IS THE FIX ---
          // We are changing split(':') to split('-') to match your data format (e.g., "13-20-03")
          const timeParts = timeStr.split("-");

          if (dateParts.length < 3 || timeParts.length < 3) {
            Logger.log(
              `Skipping row ${
                index + 2
              }: Incomplete date/time parts. Got '${timestampCell}'`
            );
            return;
          }
          // Months are 0-indexed (0=Jan, 10=Nov)
          date = new Date(
            dateParts[0],
            dateParts[1] - 1,
            dateParts[2],
            timeParts[0],
            timeParts[1],
            timeParts[2]
          );
          Logger.log(`Processing row ${index + 2} as String.`);
        }
        // If neither, we can't parse it
        else {
          Logger.log(
            `Skipping row ${
              index + 2
            }: Unknown timestamp format. Type: ${typeof timestampCell}, Value: ${timestampCell}`
          );
          return;
        }

        // Final check on the parsed date
        if (!date || isNaN(date.getTime())) {
          Logger.log(
            `Skipping row ${
              index + 2
            }: Could not parse a valid date from '${timestampCell}'`
          );
          return;
        }
        // --- END TIMESTAMP LOGIC ---

        const dayOfWeek = date.getDay();
        const dayName = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ][dayOfWeek];
        const hour = date.getHours();

        uniqueFloors.add(floor);
        uniqueLocations.add(location);
        uniqueHours.add(hour);

        // --- UPDATED to handle '혼잡' (Congested) ---

        // a) Populate Bar Chart Data
        if (!chartData[location])
          chartData[location] = { 원활: 0, 보통: 0, 혼잡: 0, total: 0 };
        if (status === "원활") chartData[location]["원활"]++;
        else if (status === "보통") chartData[location]["보통"]++;
        else if (status === "혼잡") chartData[location]["혼잡"]++;
        chartData[location]["total"]++;

        // b) Populate Prediction Model
        const modelKey = `${floor}|${location}|${dayName}|${hour}`;
        if (!predictionModel[modelKey])
          predictionModel[modelKey] = { 원활: 0, 보통: 0, 혼잡: 0, total: 0 };
        if (status === "원활") predictionModel[modelKey]["원활"]++;
        else if (status === "보통") predictionModel[modelKey]["보통"]++;
        else if (status === "혼잡") predictionModel[modelKey]["혼잡"]++;
        predictionModel[modelKey]["total"]++;

        // c) Populate Time Series Data (Tracking % of "not smooth")
        if (!hourlyComplexity[hour])
          hourlyComplexity[hour] = { notSmooth: 0, total: 0 };
        hourlyComplexity[hour].total++;
        if (status === "보통" || status === "혼잡") {
          hourlyComplexity[hour].notSmooth++;
        }

        processedRows++;
      } catch (e) {
        Logger.log(
          `Error processing row ${index + 2}: ${e.message}. Row data: ${row}`
        );
      }
    });

    Logger.log(
      `Successfully processed ${processedRows} out of ${data.length} rows.`
    );

    // --- 3. Format Data for Frontend ---

    // a) Bar Chart (Now with 3 statuses)
    const barChartArray = [
      ["Location", "원활 (Smooth)", "보통 (Moderate)", "혼잡 (Congested)"],
    ];
    for (const location in chartData) {
      barChartArray.push([
        location,
        chartData[location]["원활"],
        chartData[location]["보통"],
        chartData[location]["혼잡"],
      ]);
    }

    // b) Time Series Line Chart (Tracking "not smooth" %)
    const timeSeriesChartData = [
      ["Hour", "Not Smooth % (Moderate or Congested)"],
    ];
    const sortedHoursForChart = Object.keys(hourlyComplexity)
      .map(Number)
      .sort((a, b) => a - b);

    for (const hour of sortedHoursForChart) {
      const entry = hourlyComplexity[hour];
      const percentage =
        entry.total > 0 ? (entry.notSmooth / entry.total) * 100 : 0;
      const hourLabel = String(hour).padStart(2, "0") + ":00";
      timeSeriesChartData.push([hourLabel, percentage]);
    }

    // c) Filters
    const sortedHours = Array.from(uniqueHours).sort((a, b) => a - b);

    if (processedRows === 0) {
      Logger.log(
        "Warning: No data was successfully processed. Check data format and permissions."
      );
    }

    return {
      barChartData: barChartArray,
      timeSeriesChartData: timeSeriesChartData,
      predictionModel: predictionModel,
      filters: {
        floors: Array.from(uniqueFloors),
        locations: Array.from(uniqueLocations),
        days: Array.from(uniqueDays),
        hours: sortedHours,
      },
    };
  } catch (error) {
    Logger.log(`Fatal Error in getSheetData: ${error.message}`);
    return { error: error.message }; // Send error to frontend
  }
}
