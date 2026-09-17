import { prisma } from './src/config/prisma';

async function main() {
  const concepts = await prisma.concept.findMany({
    include: {
      questions: {
        select: { id: true, prompt: true, quizId: true }
      },
      masteryRecords: true,
    }
  });
  console.log('--- ALL CONCEPTS IN DB ---');
  for (const c of concepts) {
    console.log({
      id: c.id,
      name: c.name,
      projectId: c.projectId,
      questionsCount: c.questions.length,
      questions: c.questions.map(q => q.prompt.slice(0, 60))
    });
  }

  const quizzes = await prisma.quiz.findMany({
    include: {
      questions: {
        include: {
          concept: true,
          responses: true,
        }
      }
    }
  });

  console.log('\n--- ALL QUIZZES IN DB ---');
  for (const q of quizzes) {
    console.log(`Quiz: "${q.title}" (Score: ${q.score}, Completed: ${q.completedAt})`);
    for (const qn of q.questions) {
      console.log(`  Question: "${qn.prompt.slice(0, 60)}..." -> Concept: "${qn.concept?.name || 'NONE'}" (Responses: ${qn.responses.length})`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
