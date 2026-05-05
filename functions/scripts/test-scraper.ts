import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

import * as admin from 'firebase-admin';
if (!admin.apps.length) {
    admin.initializeApp();
}

import { loadConfig } from '../src/utils';
import { ScraperConfig } from '../src/agents/scripting_sandbox/core/types';

async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error("Usage: npx ts-node functions/scripts/test-scraper.ts <company_name>");
        console.error("Example: npx ts-node functions/scripts/test-scraper.ts google");
        process.exit(1);
    }

    const companyName = args[0].toLowerCase();
    console.log(`\n🔍 Loading scraper for: ${companyName}`);

    // Load global config to construct the ScraperConfig
    const config = loadConfig();
    if (!config) throw new Error("Could not load config.yaml");

    const scraperConfig: ScraperConfig = {
        company: companyName,
        target_locations: config.search_filters.target_locations,
        exclude_keywords: config.search_filters.exclude_keywords,
        career_stage: config.search_filters.career_stage,
        years_of_experience: config.search_filters.years_of_experience
    };

    let scraperModule;
    try {
        scraperModule = require(`../src/agents/scripting_sandbox/runners/${companyName}`);
    } catch (e: any) {
        if (e.code === 'MODULE_NOT_FOUND') {
            console.error(`❌ Scraper not found at functions/src/agents/scripting_sandbox/runners/${companyName}.ts`);
        } else {
            console.error(`❌ Error loading scraper:`, e);
        }
        process.exit(1);
    }

    if (typeof scraperModule.scrapeJobs !== 'function') {
        console.error(`❌ The scraper file must export an async function named 'scrapeJobs'.`);
        process.exit(1);
    }

    console.log(`🚀 Executing scrapeJobs()...\n`);
    try {
        const jobs = await scraperModule.scrapeJobs(scraperConfig);
        console.log(`✅ Scraper returned ${jobs.length} jobs:\n`);
        console.log(JSON.stringify(jobs, null, 2));
        console.log(`\n(Test complete. No jobs were saved to Firestore.)`);
    } catch (error) {
        console.error(`❌ Scraper threw an error during execution:`, error);
        process.exit(1);
    }
}

main();
