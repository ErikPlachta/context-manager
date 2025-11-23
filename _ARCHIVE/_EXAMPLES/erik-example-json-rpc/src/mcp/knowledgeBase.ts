/**
 * @packageDocumentation knowledgeBase implementation for mcp module.
 * Provides in-memory indexing and simple keyword-based querying utilities
 * for developer-focused internal documentation snippets.
 */
/**
 * KnowledgeDocument interface.
 */
export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  tags?: string[];
}

/**
 * KnowledgeHit interface.
 *
 */
export interface KnowledgeHit {
  id: string;
  title: string;
  summary: string;
  score: number;
}

/**
 *
 */
export class KnowledgeBase {
  private readonly documents = new Map<string, KnowledgeDocument>();

  /**
   * indexDocument function.
   *
   * @param {KnowledgeDocument} document - document parameter.
   */
  indexDocument(document: KnowledgeDocument): void {
    this.documents.set(document.id, document);
  }

  /**
   * indexDocuments function.
   *
   * @param {KnowledgeDocument[]} documents - documents parameter.
   */
  indexDocuments(documents: KnowledgeDocument[]): void {
    documents.forEach((document) => this.indexDocument(document));
  }

  /**
   * Performs a keyword-based query over indexed knowledge documents.
   * Extracts simple word tokens (>=3 chars, alphanumeric or hyphen) from the
   * search term, scores each document by keyword presence, builds a summary
   * snippet, then returns the highest scoring hits.
   *
   * @param {string} term - Raw search term entered by the user.
   * @param {number} [limit=3] - Maximum number of results to return after sorting by descending score.
   * @returns {KnowledgeHit[]} - Ranked list of matching documents including id, title, summary snippet and score.
   */
  query(term: string, limit = 3): KnowledgeHit[] {
    const keywords = new Set(
      (term.toLowerCase().match(/\b[\w-]{3,}\b/g) ?? []).map((token) => token)
    );
    const hits: KnowledgeHit[] = [];
    this.documents.forEach((document) => {
      const text = `${document.title} ${document.content}`.toLowerCase();
      let score = 0;
      keywords.forEach((keyword) => {
        if (text.includes(keyword)) {
          score += 1;
        }
      });
      if (score > 0) {
        hits.push({
          id: document.id,
          title: document.title,
          summary: summarize(document.content),
          score,
        });
      }
    });
    return hits.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}

/**
 * Generates a concise summary snippet for a knowledge document.
 * Collapses internal whitespace, truncates to the requested length without
 * cutting mid-word, and appends an ellipsis when truncated.
 *
 * @param {string} content - Full document content to summarize.
 * @param {number} [maxLength=160] - Target maximum character length for the summary.
 * @returns {string} - Trimmed or truncated summary snippet suitable for preview displays.
 */
function summarize(content: string, maxLength = 160): string {
  const trimmed = content.replace(/\s+/g, " ").trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  const snippet = trimmed.slice(0, maxLength);
  const lastSpace = snippet.lastIndexOf(" ");
  return `${snippet.slice(0, lastSpace > 0 ? lastSpace : maxLength)}…`;
}
