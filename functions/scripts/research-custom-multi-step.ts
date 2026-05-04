import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

import * as admin from 'firebase-admin';
admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'demo-project',
});

import { ai } from '../src/config/models';
import { loadConfig, listingsCollection } from '../src/utils';
import { stripCodeFences } from '../src/config/helpers';

export async function runCustomMultiStepResearch() {
    const config = loadConfig();
    if (!config) throw new Error("Config not found");

    const targetCompanies = config.target_companies as string[];
    const filters = config.search_filters;

    for (const company of targetCompanies) {
        console.log(`\n--- Starting multi-step research for ${company} ---`);

        try {
            // STEP 1: Discovery - Find the official careers portal
            console.log(`Step 1: Finding official careers portal for ${company}...`);
            const discoveryPrompt = `
Find the official careers portal or job openings page for ${company}.
Return ONLY the raw URL as a string. Do not include any markdown or other text.
`;

            const discoveryResponse = await ai.models.generateContent({
                model: 'gemini-flash-latest',
                contents: discoveryPrompt,
                config: {
                    temperature: 0.1,
                    tools: [{ googleSearch: {} }]
                }
            });

            const portalUrl = discoveryResponse.text?.trim() || '';

            if (!portalUrl || !portalUrl.startsWith('http')) {
                console.log(`Failed to find a valid portal URL for ${company}. Got: ${portalUrl}`);
                continue;
            }

            console.log(`Found portal URL: ${portalUrl}`);

            // STEP 2: Deep Dive - Use urlContext to read the live portal and extract jobs
            console.log(`Step 2: Fetching live context and extracting jobs from ${portalUrl}...`);

            const extractionPrompt = `
You are a Job Research Agent. Please visit the following official careers portal and extract REAL, RECENT, ACTIVE technical job openings.
URL: ${portalUrl}

Company: ${company}
Vibe: "${config.vibe}"

═══ MANDATORY FILTERS ═══
1. LOCATION: ONLY return jobs based in or available for: ${filters.target_locations.join(', ')}.
2. CAREER STAGE: Target ${filters.career_stage} roles (${filters.years_of_experience} years of experience).
3. EXCLUDE: Skip any listing containing these keywords: ${filters.exclude_keywords.join(', ')}.

═══ OUTPUT FORMAT ═══
Return a JSON array. Each element must have exactly these fields:
- "title": the job title (string)
- "company": "${company}" (string)
- "url": the direct link to the job posting (string) — MUST be a working, active URL
- "location": where the job is based, e.g. "Gurugram, India" or "Remote" (string)
- "yoe_required": estimated years of experience required, e.g. "2-4" or "0-2" (string)
- "description_snippet": a 2-3 sentence summary of the role (string)

Return ONLY the raw JSON array, nothing else. If you cannot find any jobs matching ALL filters, return an empty array [].
`;

            const extractionResponse = await ai.models.generateContent({
                model: 'gemini-flash-latest',
                contents: extractionPrompt,
                config: {
                    temperature: 0.1,
                    // Use type assertions to allow undocumented/experimental tools
                    tools: [
                        { googleSearch: {} },
                        // In case the SDK uses a different casing/format for url_context:
                        { urlContext: {} } as any,
                        { type: 'url_context' } as any
                    ]
                }
            });

            const text = stripCodeFences(extractionResponse.text || "[]");
            let jobs = [];
            try {
                jobs = JSON.parse(text);
            } catch (err) {
                console.error(`Failed to parse extracted JSON for ${company}: ${text}`);
                continue;
            }

            console.log(`Step 3: Found ${jobs.length} relevant jobs. Saving to Firestore...`);

            for (const job of jobs) {
                const docId = Buffer.from(job.url).toString('base64').replace(/[/+=]/g, '');
                await listingsCollection.doc(docId).set({
                    ...job,
                    status: 'unprocessed',
                    discovered_at: new Date().toISOString(),
                    source: 'custom-multi-step'
                }, { merge: true });
                console.log(`  ✓ Found: "${job.title}" — ${job.location}`);
            }

        } catch (error) {
            console.error(`Error during multi-step research for ${company}:`, error);
        }
    }
    console.log(`\nCustom multi-step research complete.`);
}

// Allow running standalone via CLI
if (require.main === module) {
    runCustomMultiStepResearch().then(() => process.exit(0)).catch(err => {
        console.error(err);
        process.exit(1);
    });
}
