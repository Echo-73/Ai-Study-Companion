import { prisma } from './src/config/prisma';
import { quizGenerationService } from './src/services/quizGenerationService';

async function testQuizGen() {
  console.log('Testing quiz generation with Gemini...');
  const project = await prisma.project.findFirst();
  const user = await prisma.user.findFirst();
  if (!project || !user) {
    console.log('No project or user found');
    return;
  }

  const quiz = await quizGenerationService.generateAdaptiveQuiz({
    userId: user.id,
    projectId: project.id,
    questionCount: 3,
  });

  if (!quiz) {
    console.log('No quiz generated');
    return;
  }

  console.log('Generated Quiz ID:', quiz.id);
  console.log('Generated Quiz Title:', quiz.title);
  console.log('Questions count:', quiz.questions.length);
  quiz.questions.forEach((q, i) => {
    console.log(`Q${i+1}: [Concept: ${q.conceptId}] ${q.prompt}`);
  });
}

testQuizGen()
  .then(() => console.log('✔ Quiz generation verified successfully.'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
