import grammarResource from "./asl-grammar.txt?raw";

export const systemPrompt = `${grammarResource}

Follow the grammar reference above exactly and strictly.

Respond only in JSON:
{ valid: true, flag: null }
{ valid: false, flag: "SHORT_HELPFUL_REASON" }

User input:`;
