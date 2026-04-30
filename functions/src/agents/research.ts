import { GoogleGenAI } from '@google/genai';
import { loadConfig, listingsCollection } from '../utils';

// We initialize the client. It automatically uses process.env.GEMINI_API_KEY
const ai = new GoogleGenAI({});

export async function runResearchPhase() {
    const config = loadConfig();
    if (!config) throw new Error("Config not found");

    const targetCompanies = config.target_companies as string[];
    let totalJobsFound = 0;

    for (const company of targetCompanies) {
        console.log(`Researching jobs for ${company}...`);
        
        const prompt = `
            Find exactly 3 recent software engineering, AI, or data science job openings at ${company}.
            Focus on roles that align with: "${config.vibe}".
            Only return jobs posted in the last 7 days if possible.
            You MUST return a JSON array where each object has:
            - "title": the job title
            - "company": "${company}"
            - "url": the link to the job posting
            - "description_snippet": a short summary of the role
            Do NOT include markdown formatting like \`\`\`json. Return ONLY the raw JSON array.
        `;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                    temperature: 0.1
                }
            });

            // Extract the JSON text.
            let text = response.text || "[]";
            if (text.includes("```json")) {
                text = text.split("```json")[1].split("```")[0].trim();
            } else if (text.includes("```")) {
                text = text.split("```")[1].split("```")[0].trim();
            }

            const jobs = JSON.parse(text);

            for (const job of jobs) {
                // Use URL as document ID to prevent duplicates (base64 encoded)
                const docId = Buffer.from(job.url).toString('base64').replace(/[/+=]/g, '');
                
                await listingsCollection.doc(docId).set({
                    ...job,
                    status: 'unprocessed',
                    discovered_at: new Date().toISOString()
                }, { merge: true }); 
                
                totalJobsFound++;
            }

        } catch (error) {
            console.error(`Error researching ${company}:`, error);
        }
    }

    return { success: true, jobsFound: totalJobsFound };
}
