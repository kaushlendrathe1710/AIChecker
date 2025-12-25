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
  const chunks = splitTextIntoChunks(text, 2000);
  const allMistakes: GrammarMistake[] = [];
  let currentOffset = 0;

  for (const chunk of chunks.slice(0, 3)) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a professional grammar checker. Analyze the text and identify ALL grammatical, spelling, punctuation, and style errors.

For each error found, provide:
- The exact text with the error
- The type of error (spelling, grammar, punctuation, or style)
- A suggested correction
- A brief explanation

Respond with ONLY a JSON object in this exact format:
{
  "mistakes": [
    {
      "text": "the exact text with error",
      "type": "spelling|grammar|punctuation|style",
      "suggestion": "the corrected text",
      "explanation": "brief explanation of the error"
    }
  ],
  "correctedText": "the full text with all corrections applied"
}

Be thorough but accurate. Do not flag correct usage as errors.`
          },
          {
            role: "user",
            content: chunk
          }
        ],
        temperature: 0.1,
        max_completion_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content || '{"mistakes": [], "correctedText": ""}';
      const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, ""));

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
    } catch (error) {
      console.error("Grammar check error for chunk:", error);
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
  const overallScore = Math.max(0, Math.min(100, 100 - (errorRate * 500)));

  let correctedText = text;
  const sortedMistakes = [...allMistakes].sort((a, b) => b.startIndex - a.startIndex);
  for (const mistake of sortedMistakes) {
    correctedText = 
      correctedText.substring(0, mistake.startIndex) + 
      mistake.suggestion + 
      correctedText.substring(mistake.endIndex);
  }

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
