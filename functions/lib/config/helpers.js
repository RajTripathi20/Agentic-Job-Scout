"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripCodeFences = void 0;
/**
 * Shared utility: strips markdown code fences from LLM output.
 */
function stripCodeFences(text) {
    if (text.includes("```json")) {
        return text.split("```json")[1].split("```")[0].trim();
    }
    else if (text.includes("```")) {
        return text.split("```")[1].split("```")[0].trim();
    }
    return text.trim();
}
exports.stripCodeFences = stripCodeFences;
//# sourceMappingURL=helpers.js.map