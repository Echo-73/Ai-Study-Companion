import { prisma } from '../config/prisma';
import { isValidConceptName, normalizeConceptName } from '../utils/conceptValidator';
import { masteryService } from '../services/masteryService';
import { recommendationService } from '../services/recommendationService';

async function cleanupInvalidConcepts() {
  console.log('====================================================');
  console.log('STARTING CONCEPT CLEANUP & DATABASE AUDIT');
  console.log('====================================================\n');

  // 1. Fetch all concepts in database
  const allConcepts = await prisma.concept.findMany({
    include: {
      questions: {
        select: { id: true, prompt: true, quizId: true },
      },
      masteryRecords: true,
    },
  });

  const invalidConcepts = allConcepts.filter((c) => !isValidConceptName(c.name));
  const validConcepts = allConcepts.filter((c) => isValidConceptName(c.name));

  console.log(`[BEFORE CLEANUP] Total concepts in DB: ${allConcepts.length}`);
  console.log(`  Valid concepts: ${validConcepts.length} (${validConcepts.map((c) => c.name).join(', ')})`);
  console.log(`  Invalid concepts to remove: ${invalidConcepts.length} (${invalidConcepts.map((c) => c.name).join(', ')})\n`);

  console.log('[BEFORE CLEANUP] Details of invalid concepts:');
  for (const inv of invalidConcepts) {
    console.log(`  - Concept: "${inv.name}" (ID: ${inv.id}, Project: ${inv.projectId})`);
    console.log(`    Linked questions: ${inv.questions.length}`);
    for (const q of inv.questions) {
      console.log(`      * Question: "${q.prompt.slice(0, 70)}..."`);
    }
  }

  // 2. Unlink questions from invalid concepts WITHOUT guessing
  // (Per user instruction: leave without a concept and exclude from concept-level mastery)
  let unlinkedQuestionsCount = 0;
  for (const inv of invalidConcepts) {
    if (inv.questions.length > 0) {
      const updateRes = await prisma.question.updateMany({
        where: { conceptId: inv.id },
        data: { conceptId: null },
      });
      unlinkedQuestionsCount += updateRes.count;
    }
  }
  console.log(`\n✔ Unlinked ${unlinkedQuestionsCount} questions from invalid concepts (conceptId set to null, preserving all quiz & response data).`);

  // 3. Delete associated recommendations for invalid concepts
  for (const inv of invalidConcepts) {
    await prisma.recommendation.deleteMany({
      where: {
        OR: [
          { targetId: inv.id },
          { title: { contains: inv.name, mode: 'insensitive' } },
        ],
      },
    });
  }
  console.log('✔ Removed stale recommendations for invalid concepts.');

  // 4. Delete the invalid concepts (Prisma cascades masteryRecords)
  const invalidIds = invalidConcepts.map((c) => c.id);
  if (invalidIds.length > 0) {
    const delRes = await prisma.concept.deleteMany({
      where: { id: { in: invalidIds } },
    });
    console.log(`✔ Deleted ${delRes.count} invalid concept records from prisma.concept.`);
  }

  // 5. Display after-state
  const remainingConcepts = await prisma.concept.findMany({
    include: {
      questions: { select: { id: true, prompt: true } },
    },
  });

  console.log('\n[AFTER CLEANUP] Remaining Concepts in DB:');
  for (const c of remainingConcepts) {
    console.log(`  - "${c.name}" (Normalized: "${normalizeConceptName(c.name)}", Questions linked: ${c.questions.length})`);
  }

  // 6. Refresh recommendations for all projects
  const projects = await prisma.project.findMany();
  for (const p of projects) {
    await recommendationService.generateRecommendationsFromMastery(p.id);
  }

  console.log('\n====================================================');
  console.log('CLEANUP COMPLETED SUCCESSFULLY');
  console.log('====================================================\n');
}

cleanupInvalidConcepts()
  .catch((err) => {
    console.error('Cleanup failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
