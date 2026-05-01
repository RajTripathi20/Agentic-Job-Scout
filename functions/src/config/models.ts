/**
 * Centralized model configuration for all agents.
 * Change model names, temperatures, and tool configs here.
 */

export const MODELS = {
    // Research Agent: needs grounding via Google Search
    research: {
        model: 'gemini-flash-latest',
        temperature: 0.1,
        tools: [{ googleSearch: {} }],
    },

    // Matching Agent: analytical scoring, low temperature for consistency
    matching: {
        model: 'gemini-flash-latest',
        temperature: 0.2,
        tools: [],
    },
} as const;

/**
 * Gemini API client singleton.
 * Reads GEMINI_API_KEY from environment automatically.
 */
import { GoogleGenAI } from '@google/genai';
export const ai = new GoogleGenAI({});
