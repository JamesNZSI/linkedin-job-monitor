import axios from "axios";
import * as cheerio from "cheerio";

const LINKEDIN_COMPANY_ID = 7846;
const URL_INCOMPLETE = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?f_C=${LINKEDIN_COMPANY_ID}";


const URL = URL_INCOMPLETE.replace(
    "${LINKEDIN_COMPANY_ID}",
    LINKEDIN_COMPANY_ID
);

// Test several offsets without assuming a page size.
const START_VALUES = [5]//, 10, 20, 25, 50, 75, 100];

async function testPage(start) {
    const pageUrl = `${URL}&start=${start}`;

    console.log("\n========================================");
    console.log(`Testing start=${start}`);
    console.log("URL:");
    console.log(pageUrl);
    console.log("========================================");

    try {
        const response = await axios.get(pageUrl, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36",
                "Accept-Language": "en-AU,en;q=0.9"
            }
        });

        console.log(`HTTP status: ${response.status}`);
        console.log(`HTML length: ${response.data.length}`);
        console.log(`HTML DATA: ${response.data}`);

        const $ = cheerio.load(response.data);

        const jobs = new Map();

        $("li").each((_, element) => {
            const linkTag = $(element)
                .find("a.base-card__full-link");

            const href = linkTag.attr("href");

            if (!href) {
                return;
            }

            const idMatch =
                href.match(/\/view\/(\d+)/) ||
                href.match(/currentJobId=(\d+)/);

            if (!idMatch) {
                return;
            }

            const id = idMatch[1];

            const title = $(element)
                .find(".base-search-card__title")
                .text()
                .trim();

            const location = $(element)
                .find(".job-search-card__location")
                .text()
                .trim();

            jobs.set(id, {
                id,
                title,
                location,
                link: href.split("?")[0]
            });
        });

        console.log(`li elements: ${$("li").length}`);
        console.log(`Job links: ${$("a.base-card__full-link").length}`);
        console.log(`Unique jobs parsed: ${jobs.size}`);

        console.log("\nJobs:");

        for (const job of jobs.values()) {
            console.log(
                `${job.id} | ${job.title} | ${job.location}`
            );
        }

        return jobs;

    } catch (error) {
        console.error(
            `Request failed for start=${start}:`,
            error.response?.status || error.message
        );

        return null;
    }
}

async function main() {
    console.log(
        `Testing LinkedIn pagination for company ${LINKEDIN_COMPANY_ID}`
    );

    for (const start of START_VALUES) {
        await testPage(start);

        // Small delay between requests.
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log("\nTesting finished.");
}

main();