import axios from "axios";
import * as cheerio from "cheerio";

export async function fetchLinkedInJobs() {
    const LINKEDIN_COMPANY_ID = process.env.LINKEDIN_COMPANY_ID;
    const URL_INCOMPLETE = process.env.JOB_SEARCH_URL;
    const URL = URL_INCOMPLETE.replace('${LINKEDIN_COMPANY_ID}', LINKEDIN_COMPANY_ID);
    const PAGE_SIZE = parseInt(process.env.PAGE_SIZE, 10) || 25;
    // default max pages is 2
    const MAX_PAGES = parseInt(process.env.MAX_PAGES, 10) || 2;
    // search by keywords
    const KEYWORDS = process.env.KEYWORDS;

    console.log(`[LinkedIn Jobs] url: ${URL}`);
    const allJobs = new Map();
    /*
     * Pagination
     * &start=0
     * &start=10
     * ...
     */
    for (let page = 0; page < MAX_PAGES; page++) {
        const start = page * PAGE_SIZE;
        const pageUrl = `${URL}&start=${start}` + (KEYWORDS ? `&keywords=${encodeURIComponent(KEYWORDS)}` : "");

        console.log(
            `[LinkedIn] Fetching page ${page + 1}, start=${start}`
        );
        console.log(`[LinkedIn Jobs] pageUrl: ${pageUrl}`);
        /*
         * If any page request fails, an error is thrown.
         * do NOT return partially collected jobs because
         * monitor.js could incorrectly mark missing jobs CLOSED.
         */
        const response = await axios.get(pageUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36",
                "Accept-Language": "en-AU,en;q=0.9"
            },
            timeout: 10000
        });
        // console.log(response);

        const $ = cheerio.load(response.data);
        const jobs = new Map();

        $("li").each((_, element) => {
            const link = $(element).find("a.base-card__full-link");
            // console.log(`link: ${link}`);
            const href = link.attr("href");

            if (!href) return;

            // const match = href.match(/\/view\/(?:.+?-)?(\d+)/) || href.match(/currentJobId=(\d+)/);
            const match = href.match(/\/view\/(?:.+?-)?(\d+)(?:\?|$)/) || href.match(/currentJobId=(\d+)/);

            if (!match) return;

            const id = match[1];
            // console.log(`url: ${href}`);
            // console.log(`id: ${id}`);

            const title = $(element)
                .find(".base-search-card__title")
                .text()
                .trim();

            const postedBy = $(element)
                .find(".base-search-card__subtitle")
                .text()
                .trim();

            const location = $(element)
                .find(".job-search-card__location")
                .text()
                .trim();

            const typeText = $(element)
                .find(".job-search-card__benefits, .base-search-card__metadata")
                .text()
                .toLowerCase();
            // linkedin does not show relevant information anymore
            // so it is not accurate right now
            let type = "On-site";
            if (typeText.includes("remote")) {
                type = "Remote";
            } else if (typeText.includes("hybrid")) {
                type = "Hybrid";
            }

            jobs.set(id, {
                id,
                title,
                postedBy,
                location,
                type,
                link: href.split("?")[0]
            });
        });
        // console.log(jobs);
        /*
         * No jobs, gone beyond the available result pages.
         */
        if (jobs.size === 0) {
            console.log(
                "[LinkedIn] No more jobs. Pagination finished."
            );
            break;
        }
        // count new job added, for checking returning the same page later
        let newJobsAdded = 0;
        /*
         * Add this page's jobs to the all jobs Map.
         * Because Job ID is the Map key, duplicate jobs are automatically avoided.
         */
        for (const [id, job] of jobs) {
            if (!allJobs.has(id)) {
                allJobs.set(id, job);
                newJobsAdded++;
            }
        }
        /*
         * Protection against LinkedIn repeatedly returning the same page.
         */
        if (newJobsAdded === 0) {
            console.warn(
                "[LinkedIn] No new job IDs found on this page. Stopping pagination."
            );

            break;
        }
        /*
         * If fewer than PAGE_SIZE, probably the final page.
         */
        if (jobs.size < PAGE_SIZE) {
            console.log(
                "[LinkedIn] Final page reached."
            );

            break;
        }
    }
    console.log(
        `[LinkedIn] Total unique jobs found: ${allJobs.size}`
    );
    return allJobs;
}