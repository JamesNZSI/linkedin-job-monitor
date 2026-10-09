/**
 * Fetches LinkedIn jobs with pagination support.
 */
function fetchLinkedInJobs_() {
  const url = CONFIG.JOB_SEARCH_URL.replace('${LINKEDIN_COMPANY_ID}', CONFIG.LINKEDIN_COMPANY_ID);
  const allJobs = new Map();

  for (let page = 0; page < CONFIG.MAX_PAGES; page++) {
    const start = page * CONFIG.PAGE_SIZE;
    const pageUrl = `${url}&start=${start}` + (CONFIG.KEYWORDS ? `&keywords=${encodeURIComponent(CONFIG.KEYWORDS)}` : "");

    Logger.log(`[LinkedIn] Fetching page ${page + 1}, start=${start}`);
    Logger.log(`[LinkedIn Jobs] pageUrl: ${pageUrl}`);

    const response = UrlFetchApp.fetch(pageUrl, {
      method: "get",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-AU,en;q=0.9"
      },
      muteHttpExceptions: true
    });

    const html = response.getContentText();
    const jobs = new Map();
    const liMatches = html.match(/<li[\s\S]*?<\/li>/g) || [];

    liMatches.forEach(elementHtml => {
      const hrefMatch = elementHtml.match(/<a[^>]*class="[^"]*base-card__full-link[^"]*"[^>]*href="([^"]+)"/i) || 
                        elementHtml.match(/href="([^"]*\/jobs\/view\/[^"]*)"/i);
      if (!hrefMatch) return;

      const idMatch = hrefMatch[1].match(/\/view\/(?:.+?-)?(\d+)(?:\?|$)/) || hrefMatch[1].match(/currentJobId=(\d+)/);
      if (!idMatch) return;

      const id = idMatch[1];

      const titleMatch = elementHtml.match(/class="[^"]*base-search-card__title[^"]*">([^<]+)<\//i);
      const title = titleMatch ? titleMatch[1].trim() : "";

      const postedByMatch = elementHtml.match(/class="[^"]*base-search-card__subtitle[^"]*"[^>]*>([\s\S]*?)<\/(?:h4|a|span|div)>/i);
      let postedBy = "";
      if (postedByMatch) {
        // Strip out any inner HTML tags (like <a>) and trim whitespace
        postedBy = postedByMatch[1].replace(/<[^>]*>/g, "").trim();
      }
      // Logger.log(`[LinkedIn] postedBy: ${postedBy}`);

      const locationMatch = elementHtml.match(/class="[^"]*job-search-card__location[^"]*">([^<]+)<\//i);
      const location = locationMatch ? locationMatch[1].trim() : "";

      const typeContainerMatch = elementHtml.match(/class="[^"]*(job-search-card__benefits|base-search-card__metadata)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|ul)>/i);
      const typeText = typeContainerMatch ? typeContainerMatch[2].toLowerCase() : "";

      let type = "On-site";
      if (typeText.includes("remote")) {
        type = "Remote";
      } else if (typeText.includes("hybrid")) {
        type = "Hybrid";
      }

      // Clean link and replace prefix
      let cleanLink = hrefMatch[1].split("?")[0];
      cleanLink = cleanLink.replace(/^https:\/\/([a-z]{2}\.)?linkedin\.com/, "https://www.linkedin.com");

      jobs.set(id, {
        id,
        title,
        postedBy,
        location,
        type,
        link: cleanLink
      });
    });

    if (jobs.size === 0) {
      Logger.log("[LinkedIn] No more jobs. Pagination finished.");
      break;
    }

    let newJobsAdded = 0;
    for (const [id, job] of jobs) {
      if (!allJobs.has(id)) {
        allJobs.set(id, job);
        newJobsAdded++;
      }
    }

    if (newJobsAdded === 0) {
      Logger.log("[LinkedIn] No new job IDs found on this page. Stopping pagination.");
      break;
    }

    if (jobs.size < CONFIG.PAGE_SIZE) {
      Logger.log("[LinkedIn] Final page reached.");
      break;
    }
  }

  Logger.log(`[LinkedIn] Total unique jobs found: ${allJobs.size}`);
  return allJobs;
}

/**
 * Fetches individual job details to extract the poster name.
 */
function fetchLinkedInJobDetail_(url) {
  try {
    Logger.log(`[LinkedIn Detail] Fetching URL: ${url}`);
    
    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-AU,en;q=0.9"
      },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 429) {
      Logger.log(`[LinkedIn Detail] Rate limited (429): ${url}`);
      return null;
    }

    const html = response.getContentText();
    
    // Match div.message-the-recruiter and extract the h3 text
    const divMatch = html.match(/<div[^>]*class="[^"]*message-the-recruiter[^"]*"[\s\S]*?>([\s\S]*?)<\/div>/i);
    if (!divMatch) return "";

    const h3Match = divMatch[1].match(/<h3[^>]*class="[^"]*base-main-card__title--link[^"]*"[^>]*>([\s\S]*?)<\/h3>/i);
    if (!h3Match) return "";

    // Strip HTML tags and clean up whitespace, grab first line
    const rawText = h3Match[1].replace(/<[^>]*>/g, "").trim();
    const firstLine = rawText.split(/\r?\n/)[0].trim();

    Logger.log(`[LinkedIn Detail] Extracted text: "${firstLine}"`);
    return firstLine;

  } catch (error) {
    Logger.log(`[LinkedIn Detail Error]: ${error.message}`);
    return "";
  }
}

/**
 * Compare snapshots and process deltas.
 */
function processDeltas_(localCacheDb, incomingSnapshotMap) {
  if (incomingSnapshotMap.size === 0) {
    Logger.log("[Safety Abort] No jobs were extracted. Skipping delta processing.");
    return;
  }

  Logger.log(`[Monitor] Previous: ${localCacheDb.size}, Current: ${incomingSnapshotMap.size}`);
  const updatedTime = getUpdatedTime_();

  // 1. Detect newly posted jobs
  for (const [id, job] of incomingSnapshotMap.entries()) {
    if (!localCacheDb.has(id)) {
      Logger.log(`[Monitor] NEW: ${job.title} (${id})`);
      
      // Delay before requesting detail page
      Utilities.sleep(CONFIG.DETAIL_REQUEST_DELAY);
      job.poster = fetchLinkedInJobDetail_(job.link);
      job.updatedTime = updatedTime;
      
      syncRecordToGoogleSheets_("ADD_NEW", job);
    }
  }

  // 2. Detect closed/removed jobs
  for (const [id, job] of localCacheDb.entries()) {
    if (!incomingSnapshotMap.has(id)) {
      Logger.log(`[Monitor] CLOSED: ${job.title} (${id})`);
      job.updatedTime = updatedTime;
      syncRecordToGoogleSheets_("MARK_CLOSED", job);
    }
  }

  Logger.log("[Monitor] Snapshot updated.");
}

function getUpdatedTime_() {
  const now = new Date();
  const utcPlus10 = new Date(now.getTime() + 10 * 60 * 60 * 1000);
  return utcPlus10.toISOString().slice(0, 16).replace("T", " ");
}