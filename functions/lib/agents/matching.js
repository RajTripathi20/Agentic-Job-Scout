"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processListing = void 0;
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
async function processListing(snap) {
    const listing = snap.data();
    if (listing.status !== 'unprocessed')
        return; // Safety check
    const config = (0, utils_1.loadConfig)();
    if (!config)
        throw new Error("Config not found");
    console.log(`Matching Agent processing: ${listing.title} at ${listing.company}`);
    const prompt = (0, prompts_1.matchingPrompt)({
        title: listing.title,
        company: listing.company,
        description_snippet: listing.description_snippet,
    }, config.resume_summary, config.dealbreakers, config.vibe);
    try {
        const response = await models_1.ai.models.generateContent({
            model: models_1.MODELS.matching.model,
            contents: prompt,
            config: {
                temperature: models_1.MODELS.matching.temperature,
            },
        });
        const text = stripCodeFences(response.text || "{}");
        const evaluation = JSON.parse(text);
        // Update Firestore
        await snap.ref.update({
            score: evaluation.score,
            pros: evaluation.pros || [],
            cons: evaluation.cons || [],
            gap_analysis: evaluation.gap_analysis || "",
            status: 'processed',
            processed_at: new Date().toISOString(),
        });
        console.log(`Matched ${listing.title} with score ${evaluation.score}`);
    }
    catch (error) {
        console.error(`Error matching ${listing.title}:`, error);
        await snap.ref.update({
            status: 'failed_processing',
        });
    }
}
exports.processListing = processListing;
//# sourceMappingURL=matching.js.map