import { ScraperConfig, ScrapedJob } from '../core/types';

export async function scrapeJobs(config: ScraperConfig): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];
    
    // We'll construct a generic search URL to grab recent software/tech roles
    // Google's SPA embeds the initial search results in the HTML inside an AF_initDataCallback script.
    const url = 'https://www.google.com/about/careers/applications/jobs/results/?q="Software"';
    
    try {
        const response = await fetch(url);
        const html = await response.text();
        
        // Extract the JSON data containing the jobs
        const match = html.match(/AF_initDataCallback\(\{key: 'ds:1'.*?data:(\[.*\]), sideChannel/s);
        if (!match) {
            console.error('Failed to find Google Careers job data in HTML');
            return jobs;
        }

        const data = JSON.parse(match[1]);
        
        function findJobsArray(arr: any[]): any[] | null {
            if (!Array.isArray(arr)) return null;
            if (arr.length > 0 && Array.isArray(arr[0]) && typeof arr[0][0] === 'string' && /^\d{10,}$/.test(arr[0][0])) {
                return arr;
            }
            for (const item of arr) {
                if (Array.isArray(item)) {
                    const res = findJobsArray(item);
                    if (res) return res;
                }
            }
            return null;
        }

        const jobList = findJobsArray(data) || [];
        
        if (jobList.length === 0) {
            return jobs;
        }

        for (const job of jobList) {
            try {
                if (!Array.isArray(job) || job.length < 2) continue;
                if (typeof job[1] !== 'string') continue;

                const id = job[0];
                const title = job[1];
                const applyUrl = job[2] || `https://www.google.com/about/careers/applications/jobs/results/${id}`;
                const company = job[7] || 'Google';
                
                // Parse locations
                let location = 'Unknown';
                if (job[9] && Array.isArray(job[9])) {
                    location = job[9].map((l: any) => l[0]).join(', ');
                }

                // Parse description snippet
                const descriptionHtml = job[3] && job[3][1] ? job[3][1] : '';
                const description_snippet = descriptionHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

                // Parse Years of Experience (YOE)
                const qualHtml = job[4] && job[4][1] ? job[4][1] : '';
                const yoeMatch = qualHtml.match(/(\d+)\s+years?/i);
                const yoe_required = yoeMatch ? yoeMatch[1] : "0";

                const scrapedJob: ScrapedJob = {
                    title,
                    company,
                    url: applyUrl,
                    location,
                    yoe_required,
                    description_snippet
                };

                // Filtering logic
                // 1. Exclude keywords
                const titleLower = title.toLowerCase();
                const shouldExclude = config.exclude_keywords.some(keyword => 
                    titleLower.includes(keyword.toLowerCase())
                );
                if (shouldExclude) continue;

                // 2. Target locations
                // If target_locations is empty, allow all. Otherwise, check if any target matches the job location.
                if (config.target_locations && config.target_locations.length > 0) {
                    const locationLower = location.toLowerCase();
                    const matchesLocation = config.target_locations.some(loc => 
                        locationLower.includes(loc.toLowerCase())
                    );
                    if (!matchesLocation) continue;
                }

                jobs.push(scrapedJob);
            } catch (err) {
                console.error('Error parsing individual job', err);
            }
        }
    } catch (error) {
        console.error('Error fetching Google Careers jobs', error);
    }

    return jobs;
}
