import { cosineSimilarity } from '../../src/utils/vectorMath';

describe('vectorMath Unit Tests', () => {
  it('should return 1.0 for identical vectors', () => {
    const vecA = [0.5, 0.5, 0.5, 0.5];
    const score = cosineSimilarity(vecA, vecA);
    expect(score).toBeCloseTo(1.0);
  });

  it('should return 0.0 for orthogonal vectors', () => {
    const vecA = [1, 0, 0];
    const vecB = [0, 1, 0];
    const score = cosineSimilarity(vecA, vecB);
    expect(score).toBeCloseTo(0.0);
  });

  it('should return 0.0 for empty or invalid vectors', () => {
    expect(cosineSimilarity([], [1, 2])).toBe(0);
    expect(cosineSimilarity([1, 2], [])).toBe(0);
  });
});
