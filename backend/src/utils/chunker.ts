export interface PageText {
  pageNumber: number;
  text: string;
}

export interface ChunkResult {
  chunkIndex: number;
  content: string;
  pageNumber: number;
  tokenCount: number;
}

/**
 * Chunks array of page texts into bounded overlapping chunks.
 * Target chunk size: ~500 characters, overlap: ~100 characters.
 */
export const chunkPageTexts = (
  pages: PageText[],
  chunkSize: number = 500,
  overlap: number = 100
): ChunkResult[] => {
  const chunks: ChunkResult[] = [];
  let overallIndex = 0;

  for (const page of pages) {
    const text = page.text.trim();
    if (!text) continue;

    if (text.length <= chunkSize) {
      if (text.replace(/[^a-zA-Z0-9]/g, '').length >= 15) {
        chunks.push({
          chunkIndex: overallIndex++,
          content: text,
          pageNumber: page.pageNumber,
          tokenCount: Math.ceil(text.length / 4),
        });
      }
      continue;
    }

    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      let chunkContent = text.slice(start, end).trim();

      if (chunkContent.replace(/[^a-zA-Z0-9]/g, '').length >= 15) {
        chunks.push({
          chunkIndex: overallIndex++,
          content: chunkContent,
          pageNumber: page.pageNumber,
          tokenCount: Math.ceil(chunkContent.length / 4),
        });
      }

      if (end >= text.length) break;
      start += chunkSize - overlap;
    }
  }

  return chunks;
};
