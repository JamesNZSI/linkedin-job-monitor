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
  
  try {
    let latestSheet = getLatestSheet_();
    let targetSheet;

    if (!latestSheet) {
      // First run: today's sheet becomes both source and target
      latestSheet = getOrCreateTodaySheet_();
      targetSheet = latestSheet;

    } else if (createNew) {
      // Existing data: load from latest, write new jobs to today's sheet
      targetSheet = getOrCreateTodaySheet_();

    } else {
      // Normal run: read/write latest sheet
      targetSheet = latestSheet;
    }

    Logger.log(
      `[Monitor] Loading active jobs from: ${latestSheet.getName()}`
    );

    const localCacheDb = getActiveJobs_(latestSheet);

    Logger.log(`[Monitor] ${localCacheDb.size} ACTIVE jobs loaded.`);

    Logger.log(`[Monitor] New jobs will be written to: ${targetSheet.getName()}`);

    const currentSnapshot = fetchAllLinkedInJobs_();

    processDeltas_(
      localCacheDb,
      currentSnapshot,
      targetSheet
    );

    Logger.log("[Monitor] Monitoring cycle completed.");
  } catch (error) {
    Logger.log(`[Monitor Error]: ${error.message}`);
    throw error;
  }
}