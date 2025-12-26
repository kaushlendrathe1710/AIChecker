import OpenAI from "openai";
import { splitIntoSentences } from "./textExtractor";
import type { PlagiarismHighlightedSection } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface PlagiarismMatch {
  sourceUrl: string | null;
  sourceTitle: string | null;
  matchedText: string;
  originalText: string;
  similarityScore: number;
  startIndex: number;
  endIndex: number;
}

export interface PlagiarismScanResult {
  plagiarismScore: number;
  verdict: "original" | "low" | "moderate" | "high";
  summary: string;
  highlightedSections: PlagiarismHighlightedSection[];
  matches: PlagiarismMatch[];
}

function getVerdict(score: number): "original" | "low" | "moderate" | "high" {
  if (score < 15) return "original";
  if (score < 30) return "low";
  if (score < 50) return "moderate";
  return "high";
}

export async function scanForPlagiarism(text: string): Promise<PlagiarismScanResult> {
  const sentences = splitIntoSentences(text);
  const sampleSentences = sentences.slice(0, 20);
  const matches: PlagiarismMatch[] = [];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert plagiarism detection assistant with extensive knowledge of common academic and online content. Analyze each sentence for potential plagiarism.

DETECTION CRITERIA:
1. EXACT MATCHES: Sentences that are verbatim copies from known sources
2. PARAPHRASED CONTENT: Text that closely mirrors known content with minor word changes
3. COMMON KNOWLEDGE: Widely known facts that don't require citation
4. UNIQUE CONTENT: Original writing with personal voice

ANALYSIS APPROACH:
- Check if the sentence structure/phrasing matches known patterns from textbooks, Wikipedia, academic papers
- Identify distinctive phrases that commonly appear in online sources
- Consider if the content is too polished or formulaic for student writing
- Look for technical definitions that are commonly copied verbatim

SCORING GUIDELINES:
- 0-30: Original content or common knowledge (no citation needed)
- 31-50: Possibly inspired by sources but adequately paraphrased
- 51-70: Likely paraphrased from sources without proper citation
- 71-90: Strongly resembles known content, probable plagiarism
- 91-100: Near-verbatim match to known sources

For each sentence, respond with a JSON object:
{
  "sentences": [
    {
      "original": "the exact sentence analyzed",
      "likelyCopied": boolean,
      "confidence": number (0-100),
      "potentialSource": "specific source type (e.g., 'Wikipedia article on X', 'Common textbook definition', 'Academic paper pattern') or null",
      "reason": "specific explanation of why this appears copied or original"
    }
  ],
  "overallSummary": "Brief summary of the plagiarism analysis findings"
}

Be thorough but accurate. Avoid false positives for common phrases that naturally occur in writing.`
        },
        {
          role: "user",
          content: `Analyze these sentences for potential plagiarism:\n\n${sampleSentences.map((s, i) => `${i + 1}. "${s}"`).join("\n")}`
        }
      ],
      max_completion_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || '{"sentences": [], "overallSummary": "Analysis failed"}';
    const cleanedContent = content.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleanedContent);
    
    for (const item of parsed.sentences || []) {
      if (item.likelyCopied && item.confidence > 45) {
        const startIndex = text.indexOf(item.original);
        if (startIndex >= 0) {
          matches.push({
            sourceUrl: null,
            sourceTitle: item.potentialSource || "Potential external source",
            matchedText: item.original,
            originalText: item.original,
            similarityScore: item.confidence,
            startIndex,
            endIndex: startIndex + item.original.length,
          });
        }
      }
    }

    const avgScore = matches.length > 0
      ? matches.reduce((sum, m) => sum + m.similarityScore, 0) / matches.length
      : 0;

    const plagiarismScore = Math.min(100, avgScore * (matches.length / Math.max(1, sampleSentences.length)) * 2);
    const verdict = getVerdict(plagiarismScore);

    const highlightedSections: PlagiarismHighlightedSection[] = matches.map(m => ({
      text: m.originalText,
      startIndex: m.startIndex,
      endIndex: m.endIndex,
      similarityScore: m.similarityScore,
      sourceUrl: m.sourceUrl || undefined,
      sourceTitle: m.sourceTitle || undefined,
    }));

    let summary = parsed.overallSummary || "";
    if (!summary) {
      if (matches.length === 0) {
        summary = "No significant plagiarism detected. The content appears to be original.";
      } else if (matches.length <= 2) {
        summary = `Found ${matches.length} potential match(es) that may need citation. Review the highlighted sections.`;
      } else {
        summary = `Found ${matches.length} potential matches. Several sections may require proper citation or rewriting.`;
      }
    }

    return {
      plagiarismScore,
      verdict,
      summary,
      highlightedSections,
      matches,
    };
  } catch (error) {
    console.error("Plagiarism check error:", error);
    return {
      plagiarismScore: 0,
      verdict: "original",
      summary: "Error during plagiarism analysis. Please try again.",
      highlightedSections: [],
      matches: [],
    };
  }
}
