import { ai, MODELS } from '../config/models';
import { matchingPrompt } from '../config/prompts';
import { stripCodeFences } from '../config/helpers';
import { loadConfig } from '../utils';
import * as admin from 'firebase-admin';

export async function processListing(snap: admin.firestore.QueryDocumentSnapshot) {
    const listing = snap.data();
    if (listing.status !== 'unprocessed') return; // Safety check

    const config = loadConfig();
    if (!config) throw new Error("Config not found");

    const candidateYoE = config.search_filters?.years_of_experience || 2;

    console.log(`Matching Agent processing: ${listing.title} at ${listing.company}`);

    const prompt = matchingPrompt(
        {
            title: listing.title,
            company: listing.company,
            location: listing.location,
            description_snippet: listing.description_snippet,
        },
        config.resume_summary,
        config.dealbreakers,
        config.vibe,
        candidateYoE
    );

    try {
        const response = await ai.models.generateContent({
            model: MODELS.matching.model,
            contents: prompt,
            config: {
                temperature: MODELS.matching.temperature,
            },
        });

        const text = stripCodeFences(response.text || "{}");
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
    } catch (error) {
        console.error(`Error matching ${listing.title}:`, error);
        await snap.ref.update({
            status: 'failed_processing',
        });
    }
}
