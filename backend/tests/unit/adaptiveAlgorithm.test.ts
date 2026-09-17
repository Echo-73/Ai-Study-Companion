import { calculateAdaptiveSelectionScores, ConceptSelectionData } from '../../src/utils/adaptiveAlgorithm';

describe('Adaptive Selection Algorithm Unit Tests', () => {
  it('should rank low mastery and high mistake concepts higher', () => {
    const concepts: ConceptSelectionData[] = [
      { conceptId: 'c1', conceptName: 'Concept A (Mastered)', currentMastery: 0.9, previousMistakes: 0, lastAttemptedDaysAgo: 1 },
      { conceptId: 'c2', conceptName: 'Concept B (Weak)', currentMastery: 0.2, previousMistakes: 3, lastAttemptedDaysAgo: 0 },
    ];

    const ranked = calculateAdaptiveSelectionScores(concepts);

    expect(ranked[0].conceptId).toBe('c2'); // Concept B should have highest priority
    expect(ranked[0].selectionScore).toBeGreaterThan(ranked[1].selectionScore);
  });
});
