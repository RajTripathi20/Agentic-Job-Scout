"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runResearchPhase = void 0;
const models_1 = require("../config/models");
const prompts_1 = require("../config/prompts");
const utils_1 = require("../utils");
/**
 * Strips markdown code fences from LLM output.
 */
function stripCodeFences(text) {
    if (text.includes("```json")) {
        return text.split("```json")[1].split("```")[0].trim();
    }
    else if (text.includes("```")) {
        return text.split("```")[1].split("```")[0].trim();
    }
    return text.trim();
}
async function runResearchPhase() {
    const config = (0, utils_1.loadConfig)();
    if (!config)
        throw new Error("Config not found");
    const targetCompanies = config.target_companies;
    let totalJobsFound = 0;
    for (const company of targetCompanies) {
        console.log(`Researching jobs for ${company}...`);
        const prompt = (0, prompts_1.researchPrompt)(company, config.vibe);
        try {
            const response = await models_1.ai.models.generateContent({
                model: models_1.MODELS.research.model,
                contents: prompt,
                config: {
                    tools: models_1.MODELS.research.tools,
                    temperature: models_1.MODELS.research.temperature,
                },
            });
            const text = stripCodeFences(response.text || "[]");
            const jobs = JSON.parse(text);
            for (const job of jobs) {
                // Use URL as document ID to prevent duplicates
                const docId = Buffer.from(job.url).toString('base64').replace(/[/+=]/g, '');
                await utils_1.listingsCollection.doc(docId).set(Object.assign(Object.assign({}, job), { status: 'unprocessed', discovered_at: new Date().toISOString() }), { merge: true });
                totalJobsFound++;
            }
        }
        catch (error) {
            console.error(`Error researching ${company}:`, error);
        }
    }
    return { success: true, jobsFound: totalJobsFound };
}
exports.runResearchPhase = runResearchPhase;
//# sourceMappingURL=research.js.map