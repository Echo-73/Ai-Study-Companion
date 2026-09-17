const INVALID_EXACT_WORDS = new Set([
  // Months & calendar
  'january', 'february', 'march', 'april', 'may', 'june', 
  'july', 'august', 'september', 'october', 'november', 'december',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  
  // Publishers & Journals
  'springer', 'nature', 'elsevier', 'wiley', 'routledge', 'ieee', 'acm', 
  'pearson', 'mcgraw', 'oxford', 'cambridge', 'arxiv', 'pubmed',

  // Publication & Document Metadata
  'volume', 'issue', 'page', 'pages', 'chapter', 'section', 'appendix', 
  'references', 'reference', 'bibliography', 'index', 'contents', 
  'author', 'authors', 'editor', 'editors', 'publisher', 'published',
  'university', 'department', 'institute', 'faculty', 'press',
  'issn', 'isbn', 'doi', 'url', 'http', 'https', 'www', 'com', 'org',
  'table', 'figure', 'fig', 'exhibit', 'chart', 'diagram',
  'abstract', 'preface', 'foreword', 'acknowledgements', 'acknowledgments',
  'copyright', 'rights', 'reserved', 'trademark',

  // Severed fragments when isolated without context
  'machine', 'learning', 'system', 'systems', 'concept', 'concepts',
  'study', 'studies', 'topic', 'topics', 'question', 'questions',
  'example', 'examples', 'overview', 'summary', 'introduction'
]);

const ACRONYMS = new Set(['ml', 'ai', 'dl', 'rl', 'nlp', 'cv', 'svm', 'pca', 'cnn', 'rnn', 'lstm', 'llm', 'bert', 'gpt', 'sgd', 'knn']);

/**
 * Normalizes concept name:
 * - Trims whitespace and collapses multiple spaces
 * - Converts to clean Title Case while preserving known acronyms
 * - Does NOT split multi-word concepts
 */
export function normalizeConceptName(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  if (cleaned.length === 0) return '';

  // Title-case while respecting acronyms
  return cleaned
    .split(' ')
    .map((word) => {
      const lower = word.toLowerCase();
      if (ACRONYMS.has(lower)) {
        return lower.toUpperCase();
      }
      // Preserve uppercase if already like "SVM" or "PCA"
      if (/^[A-Z0-9]{2,5}$/.test(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Validates whether a concept is a legitimate academic/technical concept:
 * - Rejects dates, months, publishers, document metadata, structural tokens
 * - Rejects severed isolated fragments like standalone "Machine" or "Learning"
 * - Accepts legitimate single-word concepts (Classification, Regression, Clustering, Optimization, etc.)
 * - Accepts multi-word concepts (Machine Learning, Supervised Learning, Neural Networks, etc.)
 */
export function isValidConceptName(conceptName: string | null | undefined): boolean {
  if (!conceptName || typeof conceptName !== 'string') return false;
  
  const trimmed = conceptName.trim().replace(/\s+/g, ' ');
  if (trimmed.length < 3 || trimmed.length > 80) return false;

  // Cannot be pure numbers or date patterns (e.g. "2024", "1998", "0.3.2")
  if (/^[\d\s\.\,\-\/\\]+$/.test(trimmed)) return false;

  // Cannot contain URLs or email patterns
  if (/https?:\/\/|www\.|\.com|\.org|\.pdf|@/i.test(trimmed)) return false;

  const lower = trimmed.toLowerCase();

  // If it's a single word, check against the invalid set
  if (!trimmed.includes(' ')) {
    if (INVALID_EXACT_WORDS.has(lower)) return false;
    // Single word must be mostly alphabetic
    if (!/^[a-zA-Z\-]+$/.test(trimmed)) return false;
  } else {
    // For multi-word phrases, check if it's purely metadata like "Volume 4" or "Chapter 2"
    const words = lower.split(' ');
    if (words.length === 2) {
      if (['volume', 'chapter', 'section', 'page', 'issue', 'table', 'figure'].includes(words[0])) {
        return false;
      }
      if (['springer nature', 'nature publishing'].includes(lower)) {
        return false;
      }
    }
  }

  return true;
}
