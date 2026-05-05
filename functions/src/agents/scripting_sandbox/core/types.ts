export interface ScraperConfig {
    company: string;
    target_locations: string[];
    exclude_keywords: string[];
    career_stage: string;
    years_of_experience: number;
}

export interface ScrapedJob {
    title: string;
    company: string;
    url: string;
    location: string;
    yoe_required: string;
    description_snippet: string;
}

/**
 * A CompanyScraper is a pure function that fetches jobs for a specific company.
 * It must not write to the database or rely on external state.
 */
export interface CompanyScraper {
    (config: ScraperConfig): Promise<ScrapedJob[]>;
}
