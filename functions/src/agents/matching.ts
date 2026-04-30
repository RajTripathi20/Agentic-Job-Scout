import { GoogleGenAI } from '@google/genai';
import { loadConfig } from '../utils';
import * as admin from 'firebase-admin';

const ai = new GoogleGenAI({});

export async function processListing(snap: admin.firestore.QueryDocumentSnapshot) {
    const listing = snap.data();
    if (listing.status !== 'unprocessed') return; // Safety check

    const config = loadConfig();
    if (!config) throw new Error("Config not found");

    console.log(`Matching Agent processing: ${listing.title} at ${listing.company}`);

    const prompt = `
        You are the Matching Agent. Analyze this job listing against the user's resume and dealbreakers.
        
        JOB LISTING:
        Title: ${listing.title}
        Company: ${listing.company}
        Description Snippet: ${listing.description_snippet}
        
        USER RESUME SUMMARY:
        ${JSON.stringify(config.resume_summary, null, 2)}
        
        DEALBREAKERS:
        ${JSON.stringify(config.dealbreakers, null, 2)}
        
        VIBE:
        ${config.vibe}
        
        INSTRUCTIONS:
        1. Evaluate how well the user matches the job.
        2. Explicitly self-reflect: argue why the user might HATE this job based on their dealbreakers.
        3. Provide a score from 0-100.
        4. Return ONLY a JSON object with this exact structure (no markdown tags):
        {
            "score": <number>,
            "pros": ["<pro1>", "<pro2>"],
            "cons": ["<con1>", "<con2>"],
            "gap_analysis": "<string explaining missing skills or dealbreaker warnings>"
        }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                temperature: 0.2
            }
        });

        let text = response.text || "{}";
        if (text.includes("```json")) {
            text = text.split("```json")[1].split("```")[0].trim();
        } else if (text.includes("```")) {
            text = text.split("```")[1].split("```")[0].trim();
        }

        const evaluation = JSON.parse(text);

        // Update Firestore
        await snap.ref.update({
            score: evaluation.score,
            pros: evaluation.pros || [],
            cons: evaluation.cons || [],
            gap_analysis: evaluation.gap_analysis || "",
            status: 'processed',
            processed_at: new Date().toISOString()
        });

        console.log(`Matched ${listing.title} with score ${evaluation.score}`);
    } catch (error) {
        console.error(`Error matching ${listing.title}:`, error);
        await snap.ref.update({
            status: 'failed_processing'
        });
    }
}
