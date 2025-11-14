/**
 * Main function to run the scraper.
 * (This function is already well-structured and needs no changes)
 */
function main() {
  const apikey =
    PropertiesService.getScriptProperties().getProperty("SCRAPERAPI_API_KEY");

  // Get Result 1: The scraped data
  const complexities = ScraperAPI.fromApiKey(
    "https://lib.sejong.go.kr/main/site/sensor/traffic.do",
    apikey
  )
    .bind((scraper) => scraper.hasValidTime())
    .bind((scraper) => Response.fromScraperAPI(scraper))
    .bind((response) => response.hasValidCode())
    .bind((response) => Complexity.fromResponse(response));

  // Get Result 2: The spreadsheet
  // (This now uses the cleaner, refactored 'fromNames')
  const mySheetResult = MySheet.fromNames("SJCityLib", "Complexity");

  // Combine results: Pass Result 1 into a method of Result 2
  const saveResult = mySheetResult.bind((mySheet) =>
    mySheet.saveFrom(complexities)
  );

  // Check the final combined result
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
