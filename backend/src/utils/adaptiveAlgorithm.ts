export interface ConceptSelectionData {
  conceptId: string;
  conceptName: string;
  currentMastery: number; // 0.0 to 1.0
  previousMistakes: number;
  lastAttemptedDaysAgo: number;
}

export interface AdaptiveScoreResult extends ConceptSelectionData {
  selectionScore: number;
}

/**
 * Calculates adaptive selection priority score for concepts.
 * Higher selection score = higher priority to include in upcoming quiz.
 * Formula: (1 - Mastery) * 0.5 + (MistakesWeight * 0.3) + (RecencyWeight * 0.2)
 */
export const calculateAdaptiveSelectionScores = (
  conceptsData: ConceptSelectionData[]
): AdaptiveScoreResult[] => {
  return conceptsData.map((data) => {
    const masteryWeight = (1.0 - Math.min(Math.max(data.currentMastery, 0), 1)) * 0.5;
    const mistakeWeight = Math.min(data.previousMistakes / 5, 1.0) * 0.3;
    const recencyWeight = (1.0 / (data.lastAttemptedDaysAgo + 1)) * 0.2;

    const selectionScore = Math.round((masteryWeight + mistakeWeight + recencyWeight) * 1000) / 1000;

    return {
      ...data,
      selectionScore,
    };
  }).sort((a, b) => b.selectionScore - a.selectionScore);
};
