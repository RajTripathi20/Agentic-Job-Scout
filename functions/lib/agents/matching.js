"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processListing = void 0;
const models_1 = require("../config/models");
const prompts_1 = require("../config/prompts");
const helpers_1 = require("../config/helpers");
const utils_1 = require("../utils");
async function processListing(snap) {
    var _a;
    const listing = snap.data();
    if (listing.status !== 'unprocessed')
        return; // Safety check
    const config = (0, utils_1.loadConfig)();
    if (!config)
        throw new Error("Config not found");
    const candidateYoE = ((_a = config.search_filters) === null || _a === void 0 ? void 0 : _a.years_of_experience) || 2;
    console.log(`Matching Agent processing: ${listing.title} at ${listing.company}`);
    const prompt = (0, prompts_1.matchingPrompt)({
        title: listing.title,
        company: listing.company,
        location: listing.location,
        description_snippet: listing.description_snippet,
    }, config.resume_summary, config.dealbreakers, config.vibe, candidateYoE);
    try {
        const response = await models_1.ai.models.generateContent({
            model: models_1.MODELS.matching.model,
            contents: prompt,
            config: {
                temperature: models_1.MODELS.matching.temperature,
            },
        });
        const text = (0, helpers_1.stripCodeFences)(response.text || "{}");
        const evaluation = JSON.parse(text);
        // Update Firestore with enriched match data
        await snap.ref.update({
            score: evaluation.score,
            recommendation: evaluation.recommendation || 'CONSIDER',
            why_you_fit: evaluation.why_you_fit || '',
            why_role_fits_you: evaluation.why_role_fits_you || '',
            watch_out: evaluation.watch_out || '',
            yoe_gap: evaluation.yoe_gap || '',
            pros: evaluation.pros || [],
            cons: evaluation.cons || [],
            gap_analysis: evaluation.gap_analysis || '',
            status: 'processed',
            processed_at: new Date().toISOString(),
        });
        const emoji = evaluation.score >= 75 ? '🟢' : evaluation.score >= 50 ? '🟡' : '🔴';
        console.log(`${emoji} ${listing.title} — Score: ${evaluation.score} (${evaluation.recommendation})`);
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