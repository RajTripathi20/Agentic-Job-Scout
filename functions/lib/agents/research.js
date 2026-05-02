"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runResearchPhase = void 0;
const models_1 = require("../config/models");
const prompts_1 = require("../config/prompts");
const helpers_1 = require("../config/helpers");
const utils_1 = require("../utils");
/**
 * Checks if a job should be excluded based on hard keyword filters.
 */
function shouldExclude(job, excludeKeywords) {
    const text = `${job.title} ${job.description_snippet} ${job.location || ''}`.toLowerCase();
    return excludeKeywords.some(kw => text.toLowerCase().includes(kw.toLowerCase()));
}
async function runResearchPhase() {
    const config = (0, utils_1.loadConfig)();
    if (!config)
        throw new Error("Config not found");
    const targetCompanies = config.target_companies;
    const filters = config.search_filters || {
        target_locations: ['India', 'Remote'],
        career_stage: 'early-career',
        years_of_experience: 2,
        exclude_keywords: [],
    };
    let totalJobsFound = 0;
    let totalExcluded = 0;
    for (const company of targetCompanies) {
        console.log(`Researching jobs for ${company}...`);
        const prompt = (0, prompts_1.researchPrompt)(company, config.vibe, filters);
        try {
            const response = await models_1.ai.models.generateContent({
                model: models_1.MODELS.research.model,
                contents: prompt,
                config: {
                    tools: models_1.MODELS.research.tools,
                    temperature: models_1.MODELS.research.temperature,
                },
            });
            const text = (0, helpers_1.stripCodeFences)(response.text || "[]");
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
                await utils_1.listingsCollection.doc(docId).set(Object.assign(Object.assign({}, job), { status: 'unprocessed', discovered_at: new Date().toISOString() }), { merge: true });
                totalJobsFound++;
                console.log(`  ✓ Found: "${job.title}" — ${job.location}`);
            }
        }
        catch (error) {
            console.error(`Error researching ${company}:`, error);
        }
    }
    console.log(`\nResearch complete: ${totalJobsFound} jobs saved, ${totalExcluded} excluded.`);
    return { success: true, jobsFound: totalJobsFound, excluded: totalExcluded };
}
exports.runResearchPhase = runResearchPhase;
//# sourceMappingURL=research.js.map