import OpenAI from "openai";
import type { GrammarMistake } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface GrammarCheckResult {
  totalMistakes: number;
  spellingErrors: number;
  grammarErrors: number;
  punctuationErrors: number;
  styleErrors: number;
  overallScore: number;
  mistakes: GrammarMistake[];
  correctedText: string;
}

export async function checkGrammar(text: string): Promise<GrammarCheckResult> {
  const chunks = splitTextIntoChunks(text, 2500);
  const allMistakes: GrammarMistake[] = [];
  const correctedChunks: string[] = [];
  let currentOffset = 0;

  for (const chunk of chunks.slice(0, 5)) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert grammar, spelling, and style checker. Analyze the provided text thoroughly and identify ALL errors.

ERROR CATEGORIES:
1. SPELLING: Misspelled words, typos, incorrect word forms
2. GRAMMAR: Subject-verb agreement, tense errors, incorrect word order, article usage, pronoun errors
3. PUNCTUATION: Missing/incorrect commas, periods, apostrophes, quotation marks, semicolons, colons
4. STYLE: Redundant words, passive voice overuse, wordy sentences, unclear phrasing, informal language in formal context

ANALYSIS REQUIREMENTS:
- Find EVERY error, no matter how small
- For each error, provide the EXACT text as it appears (copy precisely)
- Provide specific, actionable corrections
- Include clear explanations that help the user learn

RESPONSE FORMAT - Return ONLY valid JSON:
{
  "mistakes": [
    {
      "text": "exact text with error (copy verbatim)",
      "type": "spelling|grammar|punctuation|style",
      "suggestion": "corrected version of the text",
      "explanation": "clear explanation of the error and why the correction is better"
    }
  ],
  "correctedText": "the complete chunk with ALL corrections applied"
}

IMPORTANT:
- The "text" field must match the original EXACTLY (same capitalization, spacing)
- The "correctedText" field must contain the ENTIRE chunk with all fixes applied
- Be thorough - users rely on this for important documents
- Don't flag correct usage as errors (avoid false positives)`
          },
          {
            role: "user",
            content: chunk
          }
        ],
        max_completion_tokens: 3000,
      });

      const content = response.choices[0]?.message?.content || '{"mistakes": [], "correctedText": ""}';
      const cleanedContent = content.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleanedContent);

      for (const mistake of parsed.mistakes || []) {
        const startIndex = chunk.indexOf(mistake.text);
        if (startIndex >= 0) {
          allMistakes.push({
            text: mistake.text,
            startIndex: currentOffset + startIndex,
            endIndex: currentOffset + startIndex + mistake.text.length,
            type: mistake.type || "grammar",
            suggestion: mistake.suggestion || mistake.text,
            explanation: mistake.explanation || "Error detected",
          });
        }
      }

      correctedChunks.push(parsed.correctedText || chunk);
    } catch (error) {
      console.error("Grammar check error for chunk:", error);
      correctedChunks.push(chunk);
    }
    currentOffset += chunk.length;
  }

  const spellingErrors = allMistakes.filter(m => m.type === "spelling").length;
  const grammarErrors = allMistakes.filter(m => m.type === "grammar").length;
  const punctuationErrors = allMistakes.filter(m => m.type === "punctuation").length;
  const styleErrors = allMistakes.filter(m => m.type === "style").length;
  const totalMistakes = allMistakes.length;

  const wordCount = text.split(/\s+/).length;
  const errorRate = totalMistakes / Math.max(wordCount, 1);
  const overallScore = Math.max(0, Math.min(100, 100 - (errorRate * 300)));

  const correctedText = correctedChunks.length > 0 
    ? correctedChunks.join("")
    : text;

  return {
    totalMistakes,
    spellingErrors,
    grammarErrors,
    punctuationErrors,
    styleErrors,
    overallScore,
    mistakes: allMistakes,
    correctedText,
  };
}

function splitTextIntoChunks(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    let splitPoint = remaining.lastIndexOf(". ", maxLength);
    if (splitPoint === -1 || splitPoint < maxLength / 2) {
      splitPoint = remaining.lastIndexOf(" ", maxLength);
    }
    if (splitPoint === -1) {
      splitPoint = maxLength;
    }

    chunks.push(remaining.substring(0, splitPoint + 1));
    remaining = remaining.substring(splitPoint + 1);
  }

  return chunks;
}
