import { ai, MODELS } from '../config/models';
import { researchPrompt, SearchFilters } from '../config/prompts';
import { stripCodeFences } from '../config/helpers';
import { loadConfig, listingsCollection } from '../utils';

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
    const filters: SearchFilters = config.search_filters || {
        target_locations: ['India', 'Remote'],
        career_stage: 'early-career',
        years_of_experience: 2,
        exclude_keywords: [],
    };

    let totalJobsFound = 0;
    let totalExcluded = 0;

    for (const company of targetCompanies) {
        console.log(`Researching jobs for ${company}...`);

        const prompt = researchPrompt(company, config.vibe, filters);

        try {
            const response = await ai.models.generateContent({
                model: MODELS.research.model,
                contents: prompt,
                config: {
                    tools: MODELS.research.tools as any,
                    temperature: MODELS.research.temperature,
                },
            });

            const text = stripCodeFences(response.text || "[]");
            const jobs = JSON.parse(text);

            for (const job of jobs) {
                // Post-search hard filter: drop jobs matching exclude keywords
                if (shouldExclude(job, filters.exclude_keywords)) {
                    console.log(`  ✘ Excluded: "${job.title}" (matched exclude keyword)`);
                    totalExcluded++;
                    continue;
                }

                // Use URL as document ID to prevent duplicates
                const docId = Buffer.from(job.url).toString('base64').replace(/[/+=]/g, '');

                await listingsCollection.doc(docId).set({
                    ...job,
                    status: 'unprocessed',
                    discovered_at: new Date().toISOString(),
                }, { merge: true });

                totalJobsFound++;
                console.log(`  ✓ Found: "${job.title}" — ${job.location}`);
            }
        } catch (error) {
            console.error(`Error researching ${company}:`, error);
        }
    }

    console.log(`\nResearch complete: ${totalJobsFound} jobs saved, ${totalExcluded} excluded.`);
    return { success: true, jobsFound: totalJobsFound, excluded: totalExcluded };
}
