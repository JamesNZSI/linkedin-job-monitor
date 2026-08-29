import axios from "axios";
import * as cheerio from "cheerio";

export async function fetchLinkedInJobs() {
    // add location make linkedin show 25 listings per page otherwise 3 listings per page
    // can use start+3/25 for next page
    const url = process.env.JOB_SEARCH_URL;
    
    // console.log(`url: ${url}`);

    const response = await axios.get(url, {
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36",
            "Accept-Language": "en-AU,en;q=0.9"
        }
    });

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

    return jobs;
}