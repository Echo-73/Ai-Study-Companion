import { chunkPageTexts, PageText } from '../../src/utils/chunker';

describe('Chunker Unit Tests', () => {
  it('should preserve page numbers and compute token count', () => {
    const pages: PageText[] = [
      { pageNumber: 1, text: 'First page content introducing AI basics.' },
      { pageNumber: 2, text: 'Second page content explaining neural network weights.' },
    ];

    const chunks = chunkPageTexts(pages, 500, 100);

    expect(chunks.length).toBe(2);
    expect(chunks[0].pageNumber).toBe(1);
    expect(chunks[0].content).toContain('First page');
    expect(chunks[1].pageNumber).toBe(2);
    expect(chunks[1].content).toContain('Second page');
  });

  it('should split long text into overlapping chunks', () => {
    const longText = 'A'.repeat(1200);
    const pages: PageText[] = [{ pageNumber: 1, text: longText }];

    const chunks = chunkPageTexts(pages, 500, 100);

    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks[0].content.length).toBe(500);
    expect(chunks[0].pageNumber).toBe(1);
  });
});
