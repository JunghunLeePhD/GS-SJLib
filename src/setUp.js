/**
 * Deletes all existing triggers for the main function and
 * creates a new 30-minute time-based trigger.
 * Run this using 'clasp run setupTrigger'.
 */
function setupTrigger() {
  var functionToRun = "saveHtmlToDriveInFolder";

  // 1. Delete all existing triggers for this function to prevent duplicates
  var allTriggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < allTriggers.length; i++) {
    if (allTriggers[i].getHandlerFunction() === functionToRun) {
      ScriptApp.deleteTrigger(allTriggers[i]);
      Logger.log("Deleted existing trigger: " + allTriggers[i].getUniqueId());
    }
  }

  // 2. Create the new 30-minute trigger
  ScriptApp.newTrigger(functionToRun)
    .timeBased()
    .everyMinutes(15) // <-- You can change this to 15 if you want
    .create();

  Logger.log("Successfully created new trigger for " + functionToRun);
  return "Trigger created successfully.";
}
