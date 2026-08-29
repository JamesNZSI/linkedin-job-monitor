import { monitorPipeline } from "./monitor.js";

// 15mins as default
const RUNNING_INTERVAL = parseInt(process.env.RUNNING_INTERVAL, 10) || 15*60*1000;

console.log(`LinkedIn Job Monitor starting with interval ${RUNNING_INTERVAL}...`);

// Run immediately when the application starts.
await monitorPipeline();

// Then run every 15 minutes.
setInterval(
    monitorPipeline,
    RUNNING_INTERVAL
);