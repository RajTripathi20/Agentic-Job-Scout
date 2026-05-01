import { ai, MODELS } from '../config/models';
import { researchPrompt } from '../config/prompts';
import { loadConfig, listingsCollection } from '../utils';

/**
 * Strips markdown code fences from LLM output.
 */
function stripCodeFences(text: string): string {
    if (text.includes("```json")) {
        return text.split("```json")[1].split("```")[0].trim();
    } else if (text.includes("```")) {
        return text.split("```")[1].split("```")[0].trim();
    }
    return text.trim();
}

export async function runResearchPhase() {
    const config = loadConfig();
    if (!config) throw new Error("Config not found");

    const targetCompanies = config.target_companies as string[];
    let totalJobsFound = 0;

    for (const company of targetCompanies) {
        console.log(`Researching jobs for ${company}...`);

        const prompt = researchPrompt(company, config.vibe);

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
                // Use URL as document ID to prevent duplicates
                const docId = Buffer.from(job.url).toString('base64').replace(/[/+=]/g, '');

                await listingsCollection.doc(docId).set({
                    ...job,
                    status: 'unprocessed',
                    discovered_at: new Date().toISOString(),
                }, { merge: true });

                totalJobsFound++;
            }
        } catch (error) {
            console.error(`Error researching ${company}:`, error);
        }
    }

    return { success: true, jobsFound: totalJobsFound };
}
