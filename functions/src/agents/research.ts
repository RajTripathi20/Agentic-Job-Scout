import * as admin from 'firebase-admin';
import { loadConfig, listingsCollection } from '../utils';
import { ScraperConfig, ScrapedJob } from './scripting_sandbox/core/types';

/**
 * Checks if a job should be excluded based on hard keyword filters.
 */
function shouldExclude(job: any, excludeKeywords: string[]): boolean {
    const text = `${job.title} ${job.description_snippet} ${job.location || ''}`.toLowerCase();
    return excludeKeywords.some(kw => text.toLowerCase().includes(kw.toLowerCase()));
}

export async function runResearchPhase() {
    const config = loadConfig();
    if (!config) throw new Error("Config not found");

    const targetCompanies = config.target_companies as string[];
    const filters = config.search_filters || {
        target_locations: ['India', 'Remote'],
        career_stage: 'early-career',
        years_of_experience: 2,
        exclude_keywords: [],
    };

    const scraperConfig: ScraperConfig = {
        company: '', // Overwritten per loop
        target_locations: filters.target_locations,
        exclude_keywords: filters.exclude_keywords,
        career_stage: filters.career_stage,
        years_of_experience: filters.years_of_experience
    };

    let totalJobsFound = 0;
    let totalExcluded = 0;
    
    const db = admin.firestore();
    const tasksCollection = db.collection('scraping_tasks');

    for (const company of targetCompanies) {
        const companyId = company.toLowerCase();
        scraperConfig.company = companyId;
        console.log(`\n🔍 Researching jobs for ${company}...`);

        let scraperModule;
        try {
            scraperModule = require(`./scripting_sandbox/runners/${companyId}`);
        } catch (e: any) {
            if (e.code === 'MODULE_NOT_FOUND') {
                console.warn(`  ⚠️  No scraper found for ${company}. Flagging as 'new' task.`);
                await tasksCollection.doc(companyId).set({
                    company: companyId,
                    status: 'new',
                    last_error: 'Scraper file missing',
                    updated_at: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            } else {
                console.error(`  ❌ Error loading scraper for ${company}:`, e);
            }
            continue;
        }

        try {
            const jobs: ScrapedJob[] = await scraperModule.scrapeJobs(scraperConfig);
            
            for (const job of jobs) {
                if (shouldExclude(job, filters.exclude_keywords)) {
                    console.log(`  ✘ Excluded: "${job.title}"`);
                    totalExcluded++;
                    continue;
                }

                const docId = Buffer.from(job.url).toString('base64').replace(/[/+=]/g, '');
                await listingsCollection.doc(docId).set({
                    ...job,
                    status: 'unprocessed',
                    discovered_at: new Date().toISOString(),
                }, { merge: true });

                totalJobsFound++;
                console.log(`  ✓ Found: "${job.title}" — ${job.location}`);
            }

            // Mark task as active if successful
            await tasksCollection.doc(companyId).set({
                company: companyId,
                status: 'active',
                last_error: null,
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

        } catch (error: any) {
            console.error(`  ❌ Scraper failed for ${company}:`, error.message);
            // Flag as broken
            await tasksCollection.doc(companyId).set({
                company: companyId,
                status: 'broken',
                last_error: error.message || String(error),
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }
    }

    console.log(`\n✅ Research complete: ${totalJobsFound} jobs saved, ${totalExcluded} excluded.`);
    return { success: true, jobsFound: totalJobsFound, excluded: totalExcluded };
}
