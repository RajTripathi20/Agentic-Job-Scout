/**
 * All prompt templates for agents.
 * Uses simple string interpolation via functions so they're easy to edit.
 */

// ─── Research Agent ──────────────────────────────────────────────────────

export function researchPrompt(company: string, vibe: string): string {
    return `
You are a Job Research Agent. Your task is to find recent, real job openings.

SEARCH TASK:
Find 3-5 recent software engineering, AI, data science, or related technical job openings at ${company}.
Focus on roles that match this vibe: "${vibe}".
Only include jobs that appear to have been posted in the last 7 days.

OUTPUT FORMAT:
Return a JSON array. Each element must have exactly these fields:
- "title": the job title (string)
- "company": "${company}" (string)  
- "url": the direct link to the job posting (string)
- "location": where the job is based (string)
- "description_snippet": a 2-3 sentence summary of the role (string)

RULES:
- Do NOT invent jobs. Only return listings you can find via search.
- Do NOT wrap the output in markdown code fences.
- Return ONLY the raw JSON array, nothing else.
`.trim();
}

// ─── Matching Agent ──────────────────────────────────────────────────────

export function matchingPrompt(
    listing: { title: string; company: string; description_snippet: string },
    resumeSummary: object,
    dealbreakers: string[],
    vibe: string
): string {
    return `
You are the Matching Agent. Your job is to critically evaluate whether a job listing is a good fit for the user.

═══ JOB LISTING ═══
Title: ${listing.title}
Company: ${listing.company}
Description: ${listing.description_snippet}

═══ USER RESUME ═══
${JSON.stringify(resumeSummary, null, 2)}

═══ DEALBREAKERS (non-negotiable) ═══
${dealbreakers.map((d, i) => `${i + 1}. ${d}`).join('\n')}

═══ USER VIBE ═══
"${vibe}"

═══ INSTRUCTIONS ═══
Step 1: Evaluate how well the user's skills and experience match this role.
Step 2: SELF-REFLECT — Argue why the user might HATE this job. Check every dealbreaker explicitly.
Step 3: Assign a final score from 0 to 100.

OUTPUT FORMAT (return ONLY this JSON, no markdown fences):
{
    "score": <number 0-100>,
    "pros": ["<strength 1>", "<strength 2>", ...],
    "cons": ["<concern 1>", "<concern 2>", ...],
    "gap_analysis": "<1-2 sentences on missing skills or dealbreaker risks>"
}
`.trim();
}
