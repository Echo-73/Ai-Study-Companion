# AI Study Companion

An AI-powered learning platform designed to provide students with a personalized and intelligent study experience. The application combines AI tutoring, learning-material processing, adaptive quizzes, mastery tracking, analytics, and personalized recommendations in a single platform.

## ✨ Features

### 🤖 AI Tutor
- AI-powered conversational tutor for project-specific learning.
- Answers questions using uploaded learning materials.
- Grounded responses with citations from relevant material chunks.
- Maintains conversation history for contextual interactions.
- Powered by Google Gemini.

### 📚 Learning Materials
- Create Spaces and Projects to organize learning.
- Upload PDF learning materials.
- Background processing of uploaded documents.
- Extracts text and divides documents into searchable chunks.
- Stores processed chunks and embeddings in PostgreSQL.
- Supports semantic retrieval for AI-powered learning.

### 📝 Adaptive Quizzes
- Generate quizzes from project learning materials.
- AI-generated questions based on available study content.
- Submit answers and receive scores.
- Quiz results contribute to concept-level mastery tracking.

### 📈 Mastery & Growth
- Tracks learning progress across concepts.
- Calculates concept-level mastery based on quiz performance.
- Identifies areas that require additional attention.
- Provides learning recommendations based on performance.

### 📊 Analytics
- Visualizes learning progress and quiz performance.
- Tracks assessment results and learning activity.
- Provides insights into strengths and areas for improvement.
- Uses real application data rather than static dashboard values.

### 🎯 Personalized Recommendations
- Identifies concepts that need additional practice.
- Provides recommendations based on learning performance and mastery.
- Connects quiz performance with future learning activities.

### 👨‍💼 Admin Dashboard
- Secure administrator-only dashboard.
- User management and role management.
- Project and learning-material statistics.
- Quiz and AI Tutor usage statistics.
- Activity monitoring.
- System health information.
- Protected by backend role-based authorization.

### 🔐 Security & Production Hardening
- JWT-based authentication.
- Role-based admin authorization.
- Password hashing.
- Strict CORS configuration.
- Production error masking.
- API rate limiting.
- PDF upload validation.
- 100-page PDF processing limit.
- Protection against file path traversal.
- Environment-variable based secret management.
- Atomic background-job claiming to prevent duplicate processing.

---

## 🏗️ System Architecture

```text
                         ┌─────────────────────┐
                         │      User Browser   │
                         │    React + Vite     │
                         └──────────┬──────────┘
                                    │
                              HTTPS / REST
                                    │
                         ┌──────────▼──────────┐
                         │   Node.js + Express │
                         │       Backend       │
                         └──────────┬──────────┘
                                    │
             ┌──────────────────────┼──────────────────────┐
             │                      │                      │
             ▼                      ▼                      ▼
      ┌─────────────┐       ┌──────────────┐       ┌─────────────┐
      │ PostgreSQL  │       │ Gemini API   │       │ File Storage│
      │   Prisma    │       │     AI       │       │   /uploads  │
      └─────────────┘       └──────────────┘       └─────────────┘
             │
             ▼
      ┌───────────────┐
      │ Background Job│
      │    Worker     │
      └───────────────┘
