# 🚀 EduPath AI - Special Needs Education Plan Generator

🚀 **Live Website:**  
👉 https://edupath-ai-iota.vercel.app/

EduPath AI is an intelligent learning platform designed for children with special needs. It uses AI to create personalized learning plans, track progress, and support both parents and educators.

---

## 🌟 Features

### 👨‍👩‍👧 Parent & Child System
- Register parent and child
- Store child details (age, disability type)
- View learning progress and reports

### 👩‍🏫 Educator System
- Educator registration with specialization
- Smart matching based on disability type
- No default assignment

> ⚠️ If no educator is available:
> "Please wait while we find a suitable educator for your child."

---

### 🤖 AI-Based Initial Assessment
- Generates adaptive questions using Claude AI
- Based on:
  - Age
  - Disability type
- Evaluates performance:
  - LOW
  - MEDIUM
  - HIGH

---

### 📅 Weekly Learning Plan
- AI-generated personalized plans
- Includes:
  - Daily activities
  - Learning goals
  - Expected outcomes

---

### 🎯 Milestones Tracking
- 2–5 milestones per week
- Status:
  - PENDING
  - COMPLETED

---

### 🧪 Weekly AI Test
- Generated from weekly plan
- Evaluates child performance

---

### 🔁 Smart Decision Engine
- If performance is LOW:
  - Modify same week plan
- If performance is GOOD:
  - Move to next week

---

### 📊 Progress Graph
- Visual representation of performance
- Week vs Score
- Built using Chart.js / Recharts

---

### 🌍 Learning Summary (English + Tamil)
- Weekly AI-generated summary
- Includes:
  - Feedback
  - Suggestions
- Supports regional language (Tamil)

---

### 🔄 Continuous Learning Loop

Assessment → Plan → Milestones → Test → Evaluate → Improve / Next


---

## 🛠️ Tech Stack

### Frontend
- React.js
- Hooks (useState, useEffect)
- Chart.js / Recharts

### Backend
- Node.js
- Express.js

### Database
- MongoDB (Mongoose)

### AI Integration
- Claude API

---

## 🗄️ Database Schemas

- Child
- Educator
- Assessment
- Plan
- Milestone
- Test
- Progress
- Summary

---

## 🔗 API Endpoints

### Authentication & Registration
- `POST /api/parent/register`
- `POST /api/child/register`
- `POST /api/educator/register`

### AI Features
- `POST /api/assessment/start`
- `POST /api/plan/generate`
- `POST /api/test/generate`
- `POST /api/test/submit`

### Data Retrieval
- `GET /api/progress/:childId`
- `GET /api/summary/:childId`

---

## 🤖 Claude AI Usage

Claude API is used for:
- Question generation
- Learning plan generation
- Test generation
- Performance evaluation
- Weekly summary
- Tamil translation

---

## ⚙️ Setup Instructions

### 1️⃣ Clone Repository
bash
git clone https://github.com/your-repo/edupath-ai.git
cd edupath-ai


### 2️⃣ Backend Setup
cd backend
npm install

Create .env file:

PORT=5000
MONGO_URI=your_mongodb_uri
CLAUDE_API_KEY=your_claude_api_key

Run backend:

npm run dev
### 3️⃣ Frontend Setup
cd frontend
npm install
npm start

---

📊 Dashboard Overview

👨‍👩‍👧 Parent Dashboard
 - Assessment score
 - Weekly plan
 - Milestones
 - Progress graph
 - Weekly summary (EN + Tamil)

👩‍🏫 Educator Dashboard
 - Assigned children
 - Performance tracking
 - Weekly reports

🔒 Important Notes
 - Educator is NOT assigned by default
 - Matching is strictly based on specialization
 - AI drives the entire learning lifecycle
 - Modular and scalable architecture

🚀 Future Enhancements
 - Multi-language support
 - Mobile app version
 - Real-time notifications
 - Advanced analytics dashboard

💡 Inspiration
 - EduPath AI aims to bridge the gap between personalized education and accessibility using AI.

<h2 align="center">🧭 System Workflow & Architecture</h2>

<p align="center">
  <img src="https://raw.githubusercontent.com/Xavierdivya/TR-076-The-Noble-Four/refs/heads/main/src/assets/workflow.png" width="900"/>
</p>
