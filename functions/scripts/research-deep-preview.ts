import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

import * as admin from 'firebase-admin';
admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'demo-project',
});

import { ai } from '../src/config/models';
import { loadConfig, listingsCollection } from '../src/utils';

export async function runDeepResearchPreview() {
    const config = loadConfig();
    if (!config) throw new Error("Config not found");

    const targetCompanies = config.target_companies as string[];
    const filters = config.search_filters;

    for (const company of targetCompanies) {
        console.log(`Starting deep research for ${company}...`);

        const prompt = `
Find REAL, RECENT, ACTIVE technical job openings at ${company}.
Target locations: ${filters.target_locations.join(', ')}.
Career stage: ${filters.career_stage} (${filters.years_of_experience} years of experience).
Exclude keywords: ${filters.exclude_keywords.join(', ')}.
Return a comprehensive report with details about all the suitable roles you find.
`;

        try {
            const interaction = await ai.interactions.create({
                agent: 'deep-research-preview-04-2026',
                input: prompt,
                background: true
            });

            console.log(`Research started with interaction ID: ${interaction.id}`);

            let result: any;
            while (true) {
                result = await ai.interactions.get(interaction.id);
                if (result.status === 'completed') {
                    break;
                } else if (result.status === 'failed') {
                    throw new Error(`Research failed: ${result.error}`);
                }
                console.log(`Polling status: ${result.status}... waiting 10s.`);
                await new Promise(r => setTimeout(r, 10000));
            }

            const lastOutput = result?.outputs?.[result.outputs.length - 1];
            const reportText = lastOutput?.text || '';
            console.log(`\n--- Deep Research completed for ${company} ---`);
            console.log(`Extracting structured data from report...`);

            // Use gemini-flash-latest to parse the report into our JSON structure
            const parsingPrompt = `
You are a data extraction agent. Read the following deep research report and extract the job listings into a JSON array.

Report:
${reportText}

Return a JSON array where each element has:
- "title": the job title
- "company": "${company}"
- "url": direct link to the job posting
- "location": job location
- "yoe_required": years of experience required
- "description_snippet": a 2-3 sentence summary

Return ONLY the raw JSON array without markdown formatting.
`;

            const parsedResponse = await ai.models.generateContent({
                model: 'gemini-flash-latest',
                contents: parsingPrompt,
                config: { temperature: 0.1 }
            });

            const text = parsedResponse.text || "[]";
            const cleanText = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
            const jobs = JSON.parse(cleanText);

            for (const job of jobs) {
                const docId = Buffer.from(job.url).toString('base64').replace(/[/+=]/g, '');
                await listingsCollection.doc(docId).set({
                    ...job,
                    status: 'unprocessed',
                    discovered_at: new Date().toISOString(),
                    source: 'deep-research-preview'
                }, { merge: true });
                console.log(`  ✓ Found: "${job.title}" — ${job.location}`);
            }

        } catch (error) {
            console.error(`Error during deep research for ${company}:`, error);
        }
    }
}

// Allow running standalone via CLI
if (require.main === module) {
    runDeepResearchPreview().then(() => process.exit(0)).catch(err => {
        console.error(err);
        process.exit(1);
    });
}
