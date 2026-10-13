/**
 * Initial execution point. Set up a time-driven trigger for this function.
 */
function runJobMonitor(createNew = false) {
  if (!checkIsMonitorEnabled_()) {
    Logger.log("[Monitor] Trigger fired, but monitor is currently disabled via properties.");
    return;
  }

  Logger.log("\n==============================");
  Logger.log("[Monitor] Starting monitoring cycle");
  Logger.log(`[Monitor] Create new tab: ${createNew}`);
  
  try {
    let latestSheet = getLatestSheet_();
    //no existed sheet
    if (!latestSheet) {
      Logger.log("[Monitor] No existing date tab found. Need to create a new tab.");

      const targetSheet = createTodaySheet_();
      const currentJobs = fetchAllLinkedInJobs_();

      saveAllActiveJobs_(
        currentJobs,
        targetSheet
      );

      Logger.log("[Monitor] Initial snapshot completed.");
      return;
    }
    //do not create new sheet, use existed sheet
    if (!createNew) {
      const oldActiveJobs = getActiveJobs_(latestSheet);
      const currentJobs = fetchAllLinkedInJobs_();

      if (currentJobs.size === 0) {
        Logger.log("[Safety Abort] No jobs were extracted.");
        return;
      }
      // Missing from LinkedIn → CLOSED
      updateClosedJobs_(oldActiveJobs, currentJobs);

      // New on LinkedIn → append
      addNewJobs_(oldActiveJobs, currentJobs, latestSheet);

      return;
    }

    const todaySheet = getTodaySheet_();
    //create new sheet triggered, but today sheet existed, use today sheet
    if (todaySheet) {
      const oldActiveJobs = getActiveJobs_(todaySheet);
      const currentJobs = fetchAllLinkedInJobs_();

      if (currentJobs.size === 0) {
        Logger.log("[Safety Abort] No jobs were extracted.");
        return;
      }

      updateClosedJobs_(oldActiveJobs, currentJobs);
      addNewJobs_(oldActiveJobs, currentJobs, todaySheet);

      return;
    }

    //create a new today sheet
    const oldActiveJobs = getActiveJobs_(latestSheet);
    const currentJobs = fetchAllLinkedInJobs_();

    if (currentJobs.size === 0) {
      Logger.log("[Safety Abort] No jobs were extracted.");
      return;
    }

    // Old job missing from current LinkedIn, mark False in old sheet
    updateClosedJobs_(oldActiveJobs, currentJobs);

    // Create today's sheet
    const newTodaySheet = createTodaySheet_();

    // Today's sheet contains ALL jobs currently returned by LinkedIn.
    // Existing jobs reuse poster, Only truly new jobs fetch poster.
    saveAllActiveJobs_(currentJobs, newTodaySheet, oldActiveJobs);

    Logger.log("[Monitor] Monitoring cycle completed.");
  } catch (error) {
    Logger.log(`[Monitor Error]: ${error.message}`);
    throw error;
  }
}