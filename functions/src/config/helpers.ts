/**
 * Shared utility: strips markdown code fences from LLM output.
 */
export function stripCodeFences(text: string): string {
    if (text.includes("```json")) {
        return text.split("```json")[1].split("```")[0].trim();
    } else if (text.includes("```")) {
        return text.split("```")[1].split("```")[0].trim();
    }
    return text.trim();
}
