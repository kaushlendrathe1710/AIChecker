import OpenAI from "openai";
import { splitIntoChunks } from "./textExtractor";
import type { AiHighlightedSection } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface AiModelDetection {
  model: "chatgpt" | "claude" | "grok" | "gemini" | "other_ai" | "unknown";
  confidence: number;
  indicators: string[];
}

export interface AiScanResult {
  aiScore: number;
  verdict: "human" | "likely_human" | "mixed" | "likely_ai" | "ai";
  analysis: string;
  highlightedSections: AiHighlightedSection[];
  detectedModel?: AiModelDetection;
}

function getVerdict(score: number): "human" | "likely_human" | "mixed" | "likely_ai" | "ai" {
  if (score < 20) return "human";
  if (score < 40) return "likely_human";
  if (score < 60) return "mixed";
  if (score < 80) return "likely_ai";
  return "ai";
}

async function detectAiModel(text: string): Promise<AiModelDetection> {
  try {
    const sampleText = text.substring(0, 2000);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert at identifying which AI model generated a piece of text. Analyze the writing patterns.

AI MODEL SIGNATURES:

CHATGPT/GPT-4 patterns:
- Phrases: "I'd be happy to", "Let me", "Here's", "It's important to note", "In conclusion"
- Balanced viewpoints, hedging language, numbered lists
- Formal yet approachable tone, uses em-dashes frequently
- Often starts with "Certainly!", "Of course!", "Great question!"

CLAUDE patterns:
- Phrases: "I should note", "To be direct", "I want to be helpful"
- More cautious, acknowledges limitations, uses "I think" often
- Tends to be more philosophical and nuanced
- Often uses bullet points with detailed explanations

GROK (xAI) patterns:
- More casual/witty tone, may include humor or sarcasm
- Less formal than ChatGPT, more conversational
- May reference current events or pop culture
- Shorter, punchier sentences

GEMINI (Google) patterns:
- Very structured, often uses headers and subheaders
- Technical and precise language
- Frequently cites facts and statistics
- Clean, organized formatting

If AI-generated, identify the MOST LIKELY model based on style patterns.
If human-written or uncertain, return "unknown".

Respond with ONLY valid JSON:
{"model": "chatgpt" | "claude" | "grok" | "gemini" | "other_ai" | "unknown", "confidence": 0-100, "indicators": ["pattern1", "pattern2"]}`
        },
        {
          role: "user",
          content: sampleText
        }
      ],
      max_completion_tokens: 300,
    });

    const content = response.choices[0]?.message?.content || "";
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    
    return {
      model: parsed.model || "unknown",
      confidence: Math.min(100, Math.max(0, parsed.confidence || 0)),
      indicators: parsed.indicators || []
    };
  } catch (error) {
    console.error("AI model detection error:", error);
    return { model: "unknown", confidence: 0, indicators: [] };
  }
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
            content: `You are a balanced AI content detector. Analyze text for signs of AI generation, but be fair and accurate.

STRONG AI INDICATORS (score 70-90):
1. PERFECT STRUCTURE with no natural errors or variations
2. EXTREMELY FORMULAIC transitions used repeatedly ("Furthermore", "Moreover", "In conclusion")
3. GENERIC examples without any specific details or personal touch
4. HEDGING overload - excessive "It is important to note", "One might argue" in nearly every paragraph
5. NO PERSONALITY - completely neutral tone with zero personal voice
6. REPETITIVE sentence structures throughout the text

MODERATE AI INDICATORS (score 40-60):
- Overly polished writing without any personality
- Generic explanations that lack depth
- Balanced arguments without any strong opinions
- Some formulaic language mixed with natural writing

LIKELY HUMAN (score 0-40):
- Personal anecdotes, opinions, or unique perspectives
- Casual language, colloquialisms, or informal tone
- Minor typos, grammatical quirks, or natural imperfections
- Specific examples from experience
- Strong opinions or controversial takes
- Varied sentence structures and natural flow

IMPORTANT: Good academic writing is NOT automatically AI-generated. Humans can write polished, formal content. Only score high (70+) if multiple strong indicators are present AND the text lacks ANY human elements.

Passive voice and sophisticated vocabulary alone do NOT indicate AI. Look for the COMBINATION of perfect structure + no personality + generic content + repetitive patterns.

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

  let detectedModel: AiModelDetection | undefined;
  if (avgScore >= 50) {
    detectedModel = await detectAiModel(text);
    console.log(`[AI CHECK] Model detection: ${detectedModel.model} (${detectedModel.confidence}% confidence)`);
  }

  let analysis = "";
  if (avgScore < 20) {
    analysis = "This content appears to be written by a human. The writing shows natural patterns, personal voice, and authentic expression.";
  } else if (avgScore < 40) {
    analysis = "This content is likely human-written but may have minor AI-like patterns. It could be well-edited or follow formal writing conventions.";
  } else if (avgScore < 60) {
    analysis = "This content shows mixed signals. It could be AI-assisted writing or heavily edited AI-generated content. Key observations: " + analysisPoints.slice(0, 3).join("; ");
  } else if (avgScore < 80) {
    const modelInfo = detectedModel && detectedModel.model !== "unknown" 
      ? ` Likely generated by ${detectedModel.model.toUpperCase()} (${detectedModel.confidence}% confidence).`
      : "";
    analysis = "This content is likely AI-generated." + modelInfo + " Multiple AI patterns were detected including: " + analysisPoints.slice(0, 3).join("; ");
  } else {
    const modelInfo = detectedModel && detectedModel.model !== "unknown"
      ? ` Generated by ${detectedModel.model.toUpperCase()} (${detectedModel.confidence}% confidence).`
      : "";
    analysis = "This content strongly appears to be AI-generated." + modelInfo + " Strong indicators include: " + analysisPoints.slice(0, 3).join("; ");
  }

  return {
    aiScore: avgScore,
    verdict,
    analysis,
    highlightedSections,
    detectedModel,
  };
}
