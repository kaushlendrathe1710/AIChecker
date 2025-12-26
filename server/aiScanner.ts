import OpenAI from "openai";
import { splitIntoChunks } from "./textExtractor";
import type { AiHighlightedSection } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface AiScanResult {
  aiScore: number;
  verdict: "human" | "likely_human" | "mixed" | "likely_ai" | "ai";
  analysis: string;
  highlightedSections: AiHighlightedSection[];
}

function getVerdict(score: number): "human" | "likely_human" | "mixed" | "likely_ai" | "ai" {
  if (score < 20) return "human";
  if (score < 40) return "likely_human";
  if (score < 60) return "mixed";
  if (score < 80) return "likely_ai";
  return "ai";
}

export async function scanForAI(text: string): Promise<AiScanResult> {
  const chunks = splitIntoChunks(text, 500);
  const results: { text: string; score: number; reason: string; startIndex: number; endIndex: number }[] = [];
  let totalScore = 0;
  let currentIndex = 0;
  const analysisPoints: string[] = [];

  for (const chunk of chunks.slice(0, 8)) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an AGGRESSIVE AI content detector. Your job is to catch AI-generated content, especially in academic assignments. BE STRICT.

STRONG AI INDICATORS (score 80-100):
1. COMPLEX/ABSTRACT SENTENCES - Long sentences with multiple clauses, abstract concepts, sophisticated phrasing
2. PASSIVE VOICE - "It is observed that", "was determined", "has been established", "can be seen"
3. SOPHISTICATED VOCABULARY - Uncommon academic words, technical jargon, formal terminology
4. PERFECT STRUCTURE - Flawless grammar, consistent formatting, no natural errors
5. FORMULAIC TRANSITIONS - "Furthermore", "Moreover", "In conclusion", "Additionally", "Consequently"
6. ENCYCLOPEDIC TONE - Sounds like a textbook or Wikipedia article
7. BALANCED ARGUMENTS - No personal opinions, presents "both sides" without commitment
8. HEDGING LANGUAGE - "It is important to note", "One might argue", "It should be mentioned"

MODERATE AI INDICATORS (score 60-80):
- Overly polished academic writing without personality
- Definitions and explanations that sound "textbook-like"
- Sequential logical arguments without unique insights
- Generic examples without specific details

LIKELY HUMAN (score 0-40):
- Personal anecdotes and unique experiences
- Casual/informal language, colloquialisms, slang
- Typos, grammatical quirks, natural imperfections
- Strong personal opinions and controversial takes
- Specific examples from personal life

CRITICAL RULE: Academic assignments with complex sentences, passive voice, and sophisticated vocabulary are ALMOST ALWAYS AI-generated or heavily AI-assisted. Score them 70-95.

If text reads like it could be from ChatGPT, Claude, or any AI - score it HIGH (70+).

Respond with ONLY valid JSON: {"score": number, "reason": "specific explanation"}`
          },
          {
            role: "user",
            content: chunk
          }
        ],
        max_completion_tokens: 300,
      });

      const content = response.choices[0]?.message?.content || '{"score": 0, "reason": "Analysis failed"}';
      const cleanedContent = content.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleanedContent);
      const score = Math.min(100, Math.max(0, parsed.score || 0));
      const reason = parsed.reason || "No specific patterns detected";

      const startIndex = text.indexOf(chunk);
      results.push({
        text: chunk,
        score,
        reason,
        startIndex: startIndex >= 0 ? startIndex : currentIndex,
        endIndex: (startIndex >= 0 ? startIndex : currentIndex) + chunk.length,
      });
      totalScore += score;
      
      if (score > 35) {
        analysisPoints.push(reason);
      }
    } catch (error) {
      console.error("AI detection error for chunk:", error);
    }
    currentIndex += chunk.length + 1;
  }

  const avgScore = results.length > 0 ? totalScore / results.length : 0;
  const verdict = getVerdict(avgScore);

  const highlightedSections: AiHighlightedSection[] = results
    .filter(r => r.score > 35)
    .map(r => ({
      text: r.text,
      startIndex: r.startIndex,
      endIndex: r.endIndex,
      aiProbability: r.score,
      reason: r.reason,
    }));

  let analysis = "";
  if (avgScore < 20) {
    analysis = "This content appears to be written by a human. The writing shows natural patterns, personal voice, and authentic expression.";
  } else if (avgScore < 40) {
    analysis = "This content is likely human-written but may have minor AI-like patterns. It could be well-edited or follow formal writing conventions.";
  } else if (avgScore < 60) {
    analysis = "This content shows mixed signals. It could be AI-assisted writing or heavily edited AI-generated content. Key observations: " + analysisPoints.slice(0, 3).join("; ");
  } else if (avgScore < 80) {
    analysis = "This content is likely AI-generated. Multiple AI patterns were detected including: " + analysisPoints.slice(0, 3).join("; ");
  } else {
    analysis = "This content strongly appears to be AI-generated. Strong indicators include: " + analysisPoints.slice(0, 3).join("; ");
  }

  return {
    aiScore: avgScore,
    verdict,
    analysis,
    highlightedSections,
  };
}
