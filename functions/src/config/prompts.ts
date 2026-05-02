/**
 * All prompt templates for agents.
 * Uses simple string interpolation via functions so they're easy to edit.
 */

// ─── Types ───────────────────────────────────────────────────────────────

export interface SearchFilters {
    target_locations: string[];
    career_stage: string;
    years_of_experience: number;
    exclude_keywords: string[];
}

export interface ListingInput {
    title: string;
    company: string;
    location?: string;
    description_snippet: string;
}

// ─── Research Agent ──────────────────────────────────────────────────────

export function researchPrompt(
    company: string,
    vibe: string,
    filters: SearchFilters
): string {
    const locationList = filters.target_locations.join(', ');
    const careerStageHint = {
        'early-career': 'entry-level, junior, new grad, 0-3 years experience, SDE-1, SDE-2, L3, L4, Analyst, Associate',
        'mid-level': 'mid-level, 3-7 years experience, SDE-2, SDE-3, L4, L5',
        'senior': 'senior, staff, lead, 7+ years experience, L5+, SDE-3+',
    }[filters.career_stage] || 'any level';

    return `
You are a Job Research Agent. Find REAL, RECENT, ACTIVE job openings.

═══ SEARCH TASK ═══
Find 3-5 recent technical job openings at ${company}.
Vibe: "${vibe}"

═══ MANDATORY FILTERS ═══
1. LOCATION: ONLY return jobs based in or available for: ${locationList}.
   - If a job says "United States only" or lists a US city with no remote option, SKIP IT.
   - Remote/hybrid roles available to candidates in India are acceptable.
2. CAREER STAGE: Target ${filters.career_stage} roles (${careerStageHint}).
   - The candidate has ~${filters.years_of_experience} years of professional experience.
   - Do NOT return roles requiring 5+ years unless the candidate has that experience.
   - Do NOT return Staff/Principal/Director level roles for early-career candidates.
3. RECENCY: Only include jobs that appear to have been posted within the last 7 days.
   - Use search operators like "after:YYYY-MM-DD" if helpful.
   - If you cannot confirm the posting date, prefer more recently indexed results.
4. EXCLUDE: Skip any listing containing these keywords: ${filters.exclude_keywords.join(', ')}.

═══ OUTPUT FORMAT ═══
Return a JSON array. Each element must have exactly these fields:
- "title": the job title (string)
- "company": "${company}" (string)
- "url": the direct link to the job posting (string) — MUST be a working, active URL
- "location": where the job is based, e.g. "Bangalore, India" or "Remote" (string)
- "yoe_required": estimated years of experience required, e.g. "2-4" or "0-2" (string)
- "description_snippet": a 2-3 sentence summary of the role (string)

═══ RULES ═══
- Do NOT invent jobs. Only return listings you can actually find via search.
- Do NOT return jobs that are clearly expired or have dead links.
- Do NOT wrap the output in markdown code fences.
- Return ONLY the raw JSON array, nothing else.
- If you cannot find any jobs matching ALL filters, return an empty array [].
`.trim();
}

// ─── Matching Agent ──────────────────────────────────────────────────────

export function matchingPrompt(
    listing: ListingInput,
    resumeSummary: object,
    dealbreakers: string[],
    vibe: string,
    candidateYoE: number
): string {
    return `
You are the Matching Agent. Critically evaluate this job listing for the candidate.

═══ JOB LISTING ═══
Title: ${listing.title}
Company: ${listing.company}
Location: ${listing.location || 'Unknown'}
Description: ${listing.description_snippet}

═══ CANDIDATE RESUME ═══
${JSON.stringify(resumeSummary, null, 2)}

═══ CANDIDATE CONTEXT ═══
- Years of Professional Experience: ~${candidateYoE} years
- Dealbreakers: ${dealbreakers.map((d, i) => `${i + 1}. ${d}`).join('; ')}
- Vibe: "${vibe}"

═══ SCORING INSTRUCTIONS ═══

Step 1 — HARD DISQUALIFIERS (if ANY are true, score MUST be ≤ 30):
  • The role requires ${candidateYoE + 3}+ years of experience → HARD PENALTY.
    A person with ${candidateYoE} YoE applying for a role requiring ${candidateYoE + 5}+ YoE is NOT a good match.
  • The role is Senior/Staff/Principal level and candidate is early-career → HARD PENALTY.
  • The role requires a specific credential the candidate cannot obtain (clearance, citizenship, PhD) → HARD PENALTY.
  • Any dealbreaker is clearly triggered → HARD PENALTY.

Step 2 — SKILLS & FIT EVALUATION:
  • How well do the candidate's technical skills match the JD requirements?
  • Does the role align with the candidate's career trajectory and interests?

Step 3 — SELF-REFLECT:
  • Argue specifically why the candidate might HATE this role.
  • Check EVERY dealbreaker explicitly against the listing.

Step 4 — FINAL SCORE (0–100):
  • 90-100: Near-perfect match. Apply immediately.
  • 75-89: Strong match. Worth applying.
  • 50-74: Decent match but significant gaps.
  • 30-49: Weak match. Major concerns.
  • 0-29: Disqualified by hard requirements.

═══ OUTPUT FORMAT (return ONLY this JSON, no markdown fences) ═══
{
    "score": <number 0-100>,
    "recommendation": "<APPLY | CONSIDER | SKIP>",
    "why_you_fit": "<1 concise sentence: why the candidate is a good fit>",
    "why_role_fits_you": "<1 concise sentence: why this role is good for the candidate>",
    "watch_out": "<1 concise sentence: the single biggest concern or risk>",
    "yoe_gap": "<e.g. 'Role wants 5+ yrs, candidate has ~2' or 'Aligned'>",
    "pros": ["<strength 1>", "<strength 2>"],
    "cons": ["<concern 1>", "<concern 2>"],
    "gap_analysis": "<1-2 sentences on missing skills or dealbreaker risks>"
}
`.trim();
}
