// import "dotenv/config";

import { fetchLinkedInJobs } from "./linkedin.js";

const jobs = await fetchLinkedInJobs();

console.log("\n--- Jobs ---");

for (const [id, job] of jobs) {
    console.log(job);
}