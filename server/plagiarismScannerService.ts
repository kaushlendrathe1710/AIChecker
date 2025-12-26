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
            content: `You are an AGGRESSIVE academic plagiarism detector. Your job is to catch copied content in student assignments. BE VERY STRICT.

STUDENTS COPY FROM:
- Textbooks, course materials, lecture notes
- Wikipedia, Britannica, encyclopedias
- Academic papers, journals, research articles
- Essay banks, Chegg, Course Hero, homework sites
- Other students' submitted assignments
- AI-generated content (ChatGPT, Claude, etc.)

CRITICAL PLAGIARISM INDICATORS (score 85-100):
1. COMPLEX/ABSTRACT SENTENCES - Long, sophisticated sentences with multiple clauses
2. PASSIVE VOICE - "It is defined as", "was established", "has been observed", "can be concluded"
3. SOPHISTICATED VOCABULARY - Academic jargon, technical terms, formal language
4. TEXTBOOK DEFINITIONS - Standard explanations of concepts, theories, formulas
5. ENCYCLOPEDIC TONE - Sounds like Wikipedia or a reference book
6. FORMAL STRUCTURE - Perfect academic formatting, no personality
7. SEQUENTIAL ARGUMENTS - Logical flow that matches educational templates
8. CITED PATTERNS - Even paraphrased citations indicate copied structure

HIGH PLAGIARISM INDICATORS (score 70-85):
- Formal academic language without personal voice
- Explanations that match common educational sources
- Technical terminology in standard academic usage
- Well-known topics explained in "textbook style"

MODERATE INDICATORS (score 50-70):
- Paraphrased versions of common explanations
- Examples commonly found in educational materials

ORIGINAL CONTENT (score 0-40):
- Personal opinions, unique perspectives, casual language
- Original examples from personal experience
- Informal writing style with personality

RULE: If it sounds like it could be from a textbook, Wikipedia, or any educational source - mark it as COPIED with score 80+.
Complex sentences + passive voice + sophisticated vocabulary = DEFINITELY COPIED (90+).

Respond with ONLY valid JSON:
{"sentences":[{"text":"sentence","score":number,"copied":boolean,"source":"likely source"}],"totalScore":number}`
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
