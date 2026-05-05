# Antigravity Scraper Sandbox Instructions

When I ask you to build a scraper for a new company, please follow this exact workflow. 

## Project Context & Goal
**AI Job Scout** is an automated agentic pipeline that researches technical job opportunities, runs semantic matching against my resume, and sends a daily email digest of the best matches. 

To keep daily research costs at exactly $0.00 and maximize speed, we use a **Local Scripting Agent architecture**. Instead of using expensive LLMs to read job boards every day, we use *you* (Antigravity) to write a one-off, highly-optimized TypeScript web scraper for a specific company's portal. Our automated system will then execute your scraper daily to fetch new jobs.

**Your Goal:** Build a zero-dependency, pure TypeScript scraper for the target company's job portal. It must run natively in Node.js using only `fetch` and standard DOM parsing. If absolutely necessary, we can install `cheerio`, but you should **strongly prefer reverse-engineering their internal APIs/JSON payloads** (GraphQL or REST endpoints) as they are faster and less brittle than parsing HTML.

## Required Types
Your generated scraper must strictly adhere to these interfaces so the main system can execute it blindly:

```typescript
// Located in functions/src/agents/scripting_sandbox/core/types.ts

export interface ScraperConfig {
    company: string;               // e.g., "google"
    target_locations: string[];    // e.g., ["India", "Remote"]
    exclude_keywords: string[];    // e.g., ["Staff", "Principal", "Manager"]
    career_stage: string;          // e.g., "early-career"
    years_of_experience: number;   // e.g., 2
}

export interface ScrapedJob {
    title: string;
    company: string;
    url: string;
    location: string;
    yoe_required: string;
    description_snippet: string; // 2-3 sentence summary of the role
}
```

## Step 1: Context Gathering
- Start by finding the company's official career portal.
- Use your web tools (like `read_url_content` or `googleSearch`) to analyze the page.
- Look for hidden GraphQL/JSON endpoints that the Single Page Application uses to render the jobs. These are always preferred over HTML parsing.

## Step 2: Write the Code
Your generated code MUST be saved to `functions/src/agents/scripting_sandbox/runners/[company_name_lowercase].ts`.
It must export exactly one function: `scrapeJobs`.

```typescript
import { ScraperConfig, ScrapedJob } from '../core/types';

export async function scrapeJobs(config: ScraperConfig): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];
    
    // 1. Fetch data from the hidden API or HTML endpoint
    // 2. Parse results
    // 3. Map to ScrapedJob format
    // 4. Apply filtering based on config.target_locations and config.exclude_keywords
    
    return jobs;
}
```

## Step 3: Local Testing
Once you write the file, you MUST test it using our local test CLI:
```bash
npx ts-node functions/scripts/test-scraper.ts [company_name]
```
If the command fails or returns 0 jobs, you must read the stack trace/error output and debug your code until it works perfectly.

## Step 4: Finalizing
Once the test command successfully outputs a list of valid JSON jobs matching the `ScrapedJob` interface, **stop**. 
Do NOT manually update the database status to `active`—I will review the code first. Just let me know the script is ready for review!
