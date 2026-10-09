// import "dotenv/config";

import { fetchLinkedInJobs, fetchLinkedInJobDetail } from "./linkedin.js";
// import { fetchLinkedInJobs } from "./linkedin-web.js";
// const url = `https://www.linkedin.com/jobs/view/volunteer-copyeditor-at-the-thrive-project-4471918504/`
const url = `https://www.linkedin.com/jobs/view/volunteer-business-developer-at-the-thrive-project-4472519044`
// const jobs = await fetchLinkedInJobs();

// console.log("\n--- Jobs ---");

// for (const [id, job] of jobs) {g
//     console.log(job);
// }
const posterName = await fetchLinkedInJobDetail(url);

console.log(`\n--- Poster Name ---: ${posterName}, ==="":${posterName === ""}`);