import OpenAI from "openai";
import { splitIntoSentences } from "./textExtractor";
import type { PlagiarismHighlightedSection } from "@shared/schema";
import { checkAgainstInternalDatabase, createDocumentFingerprint, type InternalMatch } from "./internalPlagiarismChecker";
import { searchForPlagiarism, isWebSearchEnabled, type WebSearchResult } from "./webSearchService";

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
  hasInternalMatches?: boolean;
  webSearchEnabled?: boolean;
}

function getVerdict(score: number): "original" | "low" | "moderate" | "high" {
  if (score < 15) return "original";
  if (score < 30) return "low";
  if (score < 50) return "moderate";
  return "high";
}

function sampleSentences(sentences: string[], maxSamples: number = 30): string[] {
  if (sentences.length <= maxSamples) {
    return sentences;
  }
  
  const result: string[] = [];
  const step = Math.floor(sentences.length / maxSamples);
  
  for (let i = 0; i < sentences.length && result.length < maxSamples; i += step) {
    result.push(sentences[i]);
  }
  
  return result;
}

function tryParseJSON(content: string): any | null {
  const cleaned = content
    .replace(/```json\n?/g, "")
    .replace(/\n?```/g, "")
    .trim();
  
  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function scanForPlagiarism(text: string): Promise<PlagiarismScanResult> {
  const sentences = splitIntoSentences(text);
  const sampledSentences = sampleSentences(sentences, 30);
  const matches: PlagiarismMatch[] = [];

  console.log(`[PLAGIARISM] Analyzing ${sampledSentences.length} sentences from ${sentences.length} total`);

  const analyzeWithRetry = async (attempt: number = 1): Promise<any> => {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a balanced plagiarism detector. Analyze text for signs of copied content, but be fair and accurate.

COMMON PLAGIARISM SOURCES:
- Wikipedia, encyclopedias, reference sites
- Academic papers, journals, published research
- Essay banks, Chegg, Course Hero
- Previously submitted student work

HIGH PLAGIARISM INDICATORS (score 70-90):
1. EXACT PHRASES commonly found in reference materials
2. VERBATIM DEFINITIONS that match known sources word-for-word
3. SPECIFIC STATISTICS or data without proper citation
4. UNIQUE PHRASING that is distinctly from a known source
5. COPY-PASTE indicators like formatting inconsistencies

MODERATE INDICATORS (score 40-60):
- Common explanations that could be from multiple sources
- Standard academic phrasing used widely
- Generic descriptions of well-known concepts

LIKELY ORIGINAL (score 0-40):
- Personal opinions and unique perspectives
- Original examples from personal experience  
- Informal or conversational writing style
- Unique analysis or interpretation
- Content with clear personal voice

IMPORTANT: Good academic writing is NOT automatically plagiarized. Students CAN write sophisticated, formal content themselves. Passive voice and complex sentences do NOT indicate plagiarism.

Only score high (70+) if the text contains phrases that are DISTINCTIVELY from external sources or match known patterns word-for-word.

Common knowledge and standard definitions should score lower (30-50) unless they are copy-pasted verbatim.

Respond with ONLY valid JSON:
{"sentences":[{"text":"sentence","score":number,"copied":boolean,"source":"likely source or null"}],"totalScore":number}`
          },
          {
            role: "user",
            content: `Analyze these sentences from a student assignment for plagiarism:\n\n${sampledSentences.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
          }
        ],
        max_completion_tokens: 3000,
      });

      const content = response.choices[0]?.message?.content || "";
      console.log(`[PLAGIARISM] Raw response length: ${content.length}`);
      
      const parsed = tryParseJSON(content);
      if (!parsed || !parsed.sentences) {
        console.error(`[PLAGIARISM] Failed to parse JSON on attempt ${attempt}:`, content.substring(0, 200));
        if (attempt < 2) {
          console.log(`[PLAGIARISM] Retrying...`);
          return analyzeWithRetry(attempt + 1);
        }
        return null;
      }
      
      return parsed;
    } catch (error) {
      console.error(`[PLAGIARISM] API error on attempt ${attempt}:`, error);
      if (attempt < 2) {
        return analyzeWithRetry(attempt + 1);
      }
      throw error;
    }
  };

  try {
    const parsed = await analyzeWithRetry();
    
    if (!parsed) {
      return {
        plagiarismScore: 0,
        verdict: "original",
        summary: "Unable to complete plagiarism analysis. Please try again.",
        highlightedSections: [],
        matches: [],
      };
    }
    
    let totalScore = 0;
    let scoredCount = 0;
    
    for (const item of parsed.sentences || []) {
      const score = typeof item.score === 'number' ? item.score : 0;
      const isCopied = item.copied === true || score > 50;
      
      totalScore += score;
      scoredCount++;
      
      if (isCopied && score > 40) {
        const sentenceText = item.text || item.original || "";
        const startIndex = text.indexOf(sentenceText);
        
        if (startIndex >= 0 || sentenceText.length > 20) {
          matches.push({
            sourceUrl: null,
            sourceTitle: item.source || "Educational/Online Source",
            matchedText: sentenceText,
            originalText: sentenceText,
            similarityScore: score,
            startIndex: startIndex >= 0 ? startIndex : 0,
            endIndex: startIndex >= 0 ? startIndex + sentenceText.length : sentenceText.length,
          });
        }
      }
    }

    const avgScore = scoredCount > 0 ? totalScore / scoredCount : 0;
    const matchRatio = matches.length / Math.max(1, sampledSentences.length);
    
    let rawScore: number;
    if (parsed.totalScore !== undefined && parsed.totalScore <= 100) {
      rawScore = parsed.totalScore;
    } else {
      rawScore = avgScore;
    }
    
    if (matchRatio > 0.6) {
      rawScore = Math.max(rawScore, 75 + matchRatio * 25);
    } else if (matchRatio > 0.4) {
      rawScore = Math.max(rawScore, 50 + matchRatio * 50);
    }
    
    const plagiarismScore = Math.min(100, Math.max(0, Math.round(rawScore)));
    
    const verdict = getVerdict(plagiarismScore);

    const highlightedSections: PlagiarismHighlightedSection[] = matches.map(m => ({
      text: m.originalText,
      startIndex: m.startIndex,
      endIndex: m.endIndex,
      similarityScore: m.similarityScore,
      sourceUrl: m.sourceUrl || undefined,
      sourceTitle: m.sourceTitle || undefined,
    }));

    let summary = "";
    if (matches.length === 0) {
      summary = "No significant plagiarism detected. The content appears to be original.";
    } else if (plagiarismScore < 30) {
      summary = `Found ${matches.length} section(s) that may benefit from citations. Overall originality is acceptable.`;
    } else if (plagiarismScore < 50) {
      summary = `Found ${matches.length} section(s) matching common sources. Consider adding citations or rewriting these sections.`;
    } else {
      summary = `High similarity detected in ${matches.length} section(s). This content appears to match educational sources and requires significant revision.`;
    }

    console.log(`[PLAGIARISM] Final score: ${plagiarismScore}%, verdict: ${verdict}, matches: ${matches.length}`);

    return {
      plagiarismScore,
      verdict,
      summary,
      highlightedSections,
      matches,
    };
  } catch (error) {
    console.error("[PLAGIARISM] Scan failed:", error);
    return {
      plagiarismScore: 0,
      verdict: "original",
      summary: "Error during plagiarism analysis. Please try again.",
      highlightedSections: [],
      matches: [],
    };
  }
}

export async function scanForPlagiarismEnhanced(
  text: string,
  documentId: string,
  userId: string,
  fileName: string
): Promise<PlagiarismScanResult> {
  const baseResult = await scanForPlagiarism(text);
  
  let internalMatches: InternalMatch[] = [];
  let webMatches: WebSearchResult[] = [];
  
  try {
    const internalCheck = await checkAgainstInternalDatabase(documentId, text);
    internalMatches = internalCheck.matches;
    
    if (internalCheck.highestMatch > 0) {
      console.log(`[PLAGIARISM] Internal database: ${internalCheck.matches.length} matches, highest ${internalCheck.highestMatch}%`);
      
      if (internalCheck.highestMatch > baseResult.plagiarismScore) {
        baseResult.plagiarismScore = Math.max(baseResult.plagiarismScore, internalCheck.highestMatch);
        baseResult.verdict = getVerdict(baseResult.plagiarismScore);
      }
      
      baseResult.summary += ` ALERT: This content matches previously submitted documents in our database.`;
    }
    
    await createDocumentFingerprint(documentId, userId, fileName, text);
  } catch (error) {
    console.error("[PLAGIARISM] Internal check error:", error);
  }
  
  if (isWebSearchEnabled()) {
    try {
      const sentences = splitIntoSentences(text);
      webMatches = await searchForPlagiarism(sentences);
      
      if (webMatches.length > 0) {
        console.log(`[PLAGIARISM] Web search: ${webMatches.length} matches found`);
        
        for (const match of webMatches) {
          if (match.matchedText) {
            const startIdx = text.indexOf(match.matchedText);
            baseResult.matches.push({
              sourceUrl: match.url,
              sourceTitle: match.title,
              matchedText: match.matchedText,
              originalText: match.matchedText,
              similarityScore: match.similarity || 50,
              startIndex: startIdx >= 0 ? startIdx : 0,
              endIndex: startIdx >= 0 ? startIdx + match.matchedText.length : match.matchedText.length,
            });
          }
        }
        
        if (webMatches.length > 2) {
          baseResult.plagiarismScore = Math.max(baseResult.plagiarismScore, 60 + webMatches.length * 5);
          baseResult.verdict = getVerdict(baseResult.plagiarismScore);
          baseResult.summary += ` Web search found ${webMatches.length} potential online source(s).`;
        }
      }
    } catch (error) {
      console.error("[PLAGIARISM] Web search error:", error);
    }
  } else {
    console.log("[PLAGIARISM] Web search not enabled - skipping");
  }
  
  return {
    ...baseResult,
    hasInternalMatches: internalMatches.length > 0,
    webSearchEnabled: isWebSearchEnabled(),
  };
}
