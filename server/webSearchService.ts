export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  matchedText?: string;
  similarity?: number;
}

export interface WebSearchResponse {
  enabled: boolean;
  results: WebSearchResult[];
  error?: string;
}

const GOOGLE_API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_CUSTOM_SEARCH_CX;

export function isWebSearchEnabled(): boolean {
  return !!(GOOGLE_API_KEY && GOOGLE_CX);
}

export async function searchWeb(query: string): Promise<WebSearchResponse> {
  if (!isWebSearchEnabled()) {
    return {
      enabled: false,
      results: [],
      error: "Web search is not configured. Add GOOGLE_CUSTOM_SEARCH_API_KEY and GOOGLE_CUSTOM_SEARCH_CX to enable."
    };
  }

  try {
    const searchQuery = query.substring(0, 200);
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(searchQuery)}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[WEB SEARCH] API error:", errorText);
      return {
        enabled: true,
        results: [],
        error: `Search API error: ${response.status}`
      };
    }

    const data = await response.json();
    
    const results: WebSearchResult[] = (data.items || []).slice(0, 5).map((item: any) => ({
      title: item.title || "",
      url: item.link || "",
      snippet: item.snippet || "",
    }));

    console.log(`[WEB SEARCH] Found ${results.length} results for query`);
    
    return {
      enabled: true,
      results,
    };
  } catch (error) {
    console.error("[WEB SEARCH] Error:", error);
    return {
      enabled: true,
      results: [],
      error: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

export async function searchForPlagiarism(sentences: string[]): Promise<WebSearchResult[]> {
  if (!isWebSearchEnabled()) {
    console.log("[WEB SEARCH] Not enabled - skipping web search for plagiarism");
    return [];
  }

  const allResults: WebSearchResult[] = [];
  const sampleSentences = sentences
    .filter(s => s.length > 50)
    .slice(0, 5);

  for (const sentence of sampleSentences) {
    const cleanSentence = sentence.substring(0, 150);
    const response = await searchWeb(`"${cleanSentence}"`);
    
    if (response.results.length > 0) {
      for (const result of response.results) {
        result.matchedText = sentence;
        result.similarity = calculateSimilarity(sentence, result.snippet);
        allResults.push(result);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return allResults
    .filter(r => (r.similarity || 0) > 30)
    .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
    .slice(0, 10);
}

function calculateSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2Set = new Set(text2.toLowerCase().split(/\s+/));
  const words1Set = new Set(words1);
  
  let intersection = 0;
  words1.forEach(word => {
    if (words2Set.has(word)) intersection++;
  });
  
  const union = words1Set.size + words2Set.size - intersection;
  return Math.round((intersection / Math.max(union, 1)) * 100);
}
