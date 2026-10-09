/**
 * Initial execution point. Set up a time-driven trigger for this function.
 */
function runJobMonitor() {
  if (!checkIsMonitorEnabled_()) {
    Logger.log("[Monitor] Trigger fired, but monitor is currently disabled via properties.");
    return;
  }

  Logger.log("\n==============================");
  Logger.log("[Monitor] Starting monitoring cycle");
  
  try {
    const localCacheDb = getActiveJobs_();
    Logger.log(`[Monitor] Cache initialized with ${localCacheDb.size} ACTIVE job(s).`);

    const currentSnapshot = fetchLinkedInJobs_();
    processDeltas_(localCacheDb, currentSnapshot);

    Logger.log("[Monitor] Monitoring cycle completed.");
  } catch (error) {
    Logger.log(`[Monitor Error]: ${error.message}`);
  }
}