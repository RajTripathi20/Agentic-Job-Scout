"use strict";
/**
 * Centralized model configuration for all agents.
 * Change model names, temperatures, and tool configs here.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ai = exports.MODELS = void 0;
exports.MODELS = {
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
};
/**
 * Gemini API client singleton.
 * Reads GEMINI_API_KEY from environment automatically.
 */
const genai_1 = require("@google/genai");
exports.ai = new genai_1.GoogleGenAI({});
//# sourceMappingURL=models.js.map