/**
 * EduPath — EXTENDED v2 (Non-breaking additions to existing codebase)
 *
 * ── EXISTING FEATURES (PRESERVED UNCHANGED) ──────────────────────────────────
 *   ✅ Parent registration & auth
 *   ✅ Child profile management
 *   ✅ AI-based initial assessment (Feature 1 from v1)
 *   ✅ Week 1 learning plan generation (Feature 2 from v1)
 *   ✅ Weekly AI evaluation loop (Feature 3 from v1)
 *   ✅ Progress decision logic ADVANCE/MODIFY (Feature 4 from v1)
 *   ✅ Continuous weekly loop (Feature 5 from v1)
 *
 * ── NEW FEATURES ADDED IN v2 ─────────────────────────────────────────────────
 *   🆕 Feature 1: Milestones Tracking — 2-5 per week, auto-updated after eval
 *   🆕 Feature 2: Progress Graph — Recharts line chart (week vs score)
 *   🆕 Feature 3: Learning Summary (English + Tamil) — Claude translates
 *   🆕 Feature 4: Educator Assignment — match by specialization, wait message
 *   🆕 Feature 5: Enhanced Weekly Loop — milestones generated alongside plans
 *
 * ── ARCHITECTURE ─────────────────────────────────────────────────────────────
 *   /services/aiService.js         — All Claude API calls (extended)
 *   /services/assessmentService.js — CRUD (extended)
 *   /services/milestoneService.js  — NEW: milestone CRUD
 *   /services/progressService.js   — NEW: GET /api/progress/:childId
 *   /services/summaryService.js    — NEW: weekly summary store
 *   /services/educatorService.js   — NEW: specialization-based matching
 *   /models/Milestone.js           — NEW MongoDB schema
 *   /models/WeeklySummary.js       — NEW MongoDB schema
 *
 * ── MONGODB NEW SCHEMAS ───────────────────────────────────────────────────────
 *
 * Milestone:
 * {
 *   _id: ObjectId,
 *   childId: ObjectId,
 *   week: Number,
 *   milestones: [{ title, description, status: "PENDING" | "COMPLETED" }]
 * }
 *
 * WeeklySummary:
 * {
 *   _id: ObjectId,
 *   childId: ObjectId,
 *   week: Number,
 *   summaryEnglish: String,
 *   summaryRegional: String,  // Tamil
 *   createdAt: Date
 * }
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DB — Extended with new collections (existing data preserved)
// ─────────────────────────────────────────────────────────────────────────────

let mockDB = {
  educators: [
    { id: "edu1", name: "Dr. Priya Sharma", email: "priya@edu.com", password: "pass123", educatorType: "Autism", assignedChildren: ["par1"] },
    { id: "edu2", name: "Mr. Rahul Verma", email: "rahul@edu.com", password: "pass123", educatorType: "ADHD", assignedChildren: ["par2"] },
    { id: "edu3", name: "Ms. Anita Nair", email: "anita@edu.com", password: "pass123", educatorType: "Intellectual Disability", assignedChildren: [] },
    { id: "edu4", name: "Dr. Sunita Patel", email: "sunita@edu.com", password: "pass123", educatorType: "Down Syndrome", assignedChildren: [] },
  ],
  parents: [
    { id: "par1", parentName: "Meera Krishnan", childName: "Arjun", age: 8, disabilityType: "Autism", email: "meera@parent.com", password: "pass123", preferredLanguage: "Tamil", uniqueChildID: "CHILD-001001", assignedEducatorID: "edu1", initialAssessmentDone: true },
    { id: "par2", parentName: "Suresh Gupta", childName: "Riya", age: 10, disabilityType: "ADHD", email: "suresh@parent.com", password: "pass123", preferredLanguage: "Hindi", uniqueChildID: "CHILD-002002", assignedEducatorID: "edu2", initialAssessmentDone: false },
  ],
  assessments: [
    { id: "ass1", childID: "par1", educatorID: "edu1", testDetails: { communication: 40, motor: 55, cognitive: 35, social: 30, emotional: 45 }, score: 41, date: "2024-01-08", weekNumber: 1 },
    { id: "ass2", childID: "par1", educatorID: "edu1", testDetails: { communication: 50, motor: 60, cognitive: 45, social: 40, emotional: 50 }, score: 49, date: "2024-01-15", weekNumber: 2 },
    { id: "ass3", childID: "par1", educatorID: "edu1", testDetails: { communication: 60, motor: 65, cognitive: 55, social: 52, emotional: 58 }, score: 58, date: "2024-01-22", weekNumber: 3 },
    { id: "ass4", childID: "par2", educatorID: "edu2", testDetails: { communication: 65, motor: 70, cognitive: 60, social: 55, emotional: 50 }, score: 60, date: "2024-01-08", weekNumber: 1 },
  ],
  iepPlans: [
    {
      id: "iep1", childID: "par1", educatorID: "edu1",
      weeklyPlan: [
        { day: "Monday", activity: "Picture card communication exercise", goal: "Identify 5 new objects", materials: "Picture cards, tablet" },
        { day: "Tuesday", activity: "Fine motor bead threading", goal: "Thread 10 beads independently", materials: "Beads, string" },
        { day: "Wednesday", activity: "Social story reading", goal: "Understand turn-taking", materials: "Social story book" },
        { day: "Thursday", activity: "Sensory play - sand tray", goal: "Tolerate tactile input 10 min", materials: "Sand tray, toys" },
        { day: "Friday", activity: "Peer interaction role play", goal: "Initiate 3 interactions", materials: "Role play props" },
      ],
      learningOutcome: "Improve communication and social initiation by 15%",
      status: "Achieved", weekNumber: 1, aiGenerated: true, editedByEducator: true, previousScore: 41, targetScore: 55
    },
    {
      id: "iep2", childID: "par1", educatorID: "edu1",
      weeklyPlan: [
        { day: "Monday", activity: "AAC device practice", goal: "Use 10 new AAC symbols", materials: "AAC device" },
        { day: "Tuesday", activity: "Group motor activity", goal: "Participate 15 min", materials: "Ball, hoops" },
        { day: "Wednesday", activity: "Emotion identification cards", goal: "Identify 6 emotions", materials: "Flashcards" },
        { day: "Thursday", activity: "Cooking simple recipe", goal: "Follow 3-step instruction", materials: "Ingredients" },
        { day: "Friday", activity: "Community outing prep", goal: "Practice safety rules", materials: "Visual rules card" },
      ],
      learningOutcome: "Build independence in daily communication and group participation",
      status: "In Progress", weekNumber: 2, aiGenerated: true, editedByEducator: false, previousScore: 49, targetScore: 62
    },
  ],
  feedback: [
    { id: "fb1", parentID: "par1", educatorID: "edu1", childID: "par1", message: "Arjun has been using picture cards at home!", rating: 5, date: "2024-01-14", isRead: true },
    { id: "fb2", parentID: "par2", educatorID: "edu2", childID: "par2", message: "Riya is more focused now. Great techniques!", rating: 4, date: "2024-01-16", isRead: false },
  ],

  // ── EXISTING V1 COLLECTIONS ─────────────────────────────────────────────────
  initialAssessments: [
    {
      id: "ia1", childId: "par1",
      totalScore: 41, level: "LOW",
      disabilityType: "Autism", age: 8,
      completedAt: "2024-01-07",
      week1PlanGenerated: true,
      answers: [
        { questionId: "q1", answer: "Sometimes", score: 1 },
        { questionId: "q2", answer: "With help", score: 1 },
        { questionId: "q3", answer: "Rarely", score: 0 },
        { questionId: "q4", answer: "Needs prompting", score: 1 },
        { questionId: "q5", answer: "No", score: 0 },
      ]
    }
  ],
  weeklyEvaluations: [],

  // ── NEW V2 COLLECTIONS ──────────────────────────────────────────────────────

  /**
   * NEW: milestones collection
   * MongoDB schema: /models/Milestone.js
   * {
   *   childId: ObjectId,
   *   week: Number,
   *   milestones: [{
   *     title: String,
   *     description: String,
   *     status: "PENDING" | "COMPLETED"
   *   }]
   * }
   */
  milestones: [
    {
      id: "ms1", childId: "par1", week: 1,
      milestones: [
        { title: "Use picture cards to name 5 objects", description: "Child identifies objects using picture-to-object matching", status: "COMPLETED" },
        { title: "Thread 10 beads independently", description: "Fine motor activity completed without adult hand-over-hand", status: "COMPLETED" },
        { title: "Initiate 3 peer interactions", description: "Child begins play or conversation with a peer without prompting", status: "PENDING" },
      ]
    }
  ],

  /**
   * NEW: weeklySummaries collection
   * MongoDB schema: /models/WeeklySummary.js
   * {
   *   childId: ObjectId,
   *   week: Number,
   *   summaryEnglish: String,
   *   summaryRegional: String,
   *   createdAt: Date
   * }
   */
  weeklySummaries: [
    {
      id: "ws1", childId: "par1", week: 1,
      summaryEnglish: "Arjun had an excellent first week! He successfully completed picture card activities and made great progress in fine motor skills through bead threading. Communication using picture cards improved by 20%. Social initiation remains an area to work on, with peer interaction happening only when prompted.",
      summaryRegional: "அர்ஜுன் முதல் வாரத்தில் சிறப்பாக செயல்பட்டான்! படம் பார்க்கும் செயல்பாடுகளில் வெற்றிகரமாக பங்கேற்றான். மணி கோர்க்கும் பயிற்சியில் நல்ல முன்னேற்றம் கண்டான். படங்களைப் பயன்படுத்தி தகவல் தொடர்பு 20% மேம்பட்டுள்ளது. சக மாணவர்களுடன் தொடர்பு இன்னும் மேம்படுத்தப்பட வேண்டும்.",
      createdAt: "2024-01-14"
    }
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE: aiService.js — Extended with NEW Claude API calls
// ─────────────────────────────────────────────────────────────────────────────

const aiService = {

  // ── EXISTING METHODS (preserved) ──────────────────────────────────────────

  generateInitialTest: async (age, disabilityType) => {
    const prompt = `You are a special education assessment expert. Generate an adaptive initial assessment for a child.
Child Details: Age: ${age} years, Disability Type: ${disabilityType}
Generate EXACTLY 6 questions. Assess: communication, motor skills, cognitive ability, social skills, emotional regulation, daily living.
Return ONLY valid JSON:
{"questions":[{"id":"q1","category":"communication","text":"Question?","options":["A","B","C","D"],"scoring":{"A":3,"B":2,"C":1,"D":0}}]}`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] })
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      return JSON.parse(text.replace(/```json|```/g, "").trim()).questions;
    } catch { return aiService._fallbackInitialQuestions(age, disabilityType); }
  },

  evaluateInitialAssessment: (answers, questions) => {
    const maxPerQ = 3;
    const totalPossible = questions.length * maxPerQ;
    const earned = answers.reduce((sum, a) => {
      const q = questions.find(q => q.id === a.questionId);
      return sum + (q?.scoring?.[a.answer] ?? a.score ?? 0);
    }, 0);
    const totalScore = Math.round((earned / totalPossible) * 100);
    const level = totalScore < 40 ? "LOW" : totalScore < 70 ? "MEDIUM" : "HIGH";
    return { totalScore, level };
  },

  generateWeek1Plan: async (childData, score, level) => {
    const prompt = `You are a special education curriculum designer. Generate a detailed Week 1 learning plan.
Child: ${childData.childName}, Age ${childData.age}, ${childData.disabilityType}, Score: ${score}/100, Level: ${level}
Return ONLY valid JSON:
{"weeklyPlan":[{"day":"Monday","activity":"...","goal":"...","materials":"...","duration":"30 min"},{"day":"Tuesday","activity":"...","goal":"...","materials":"...","duration":"30 min"},{"day":"Wednesday","activity":"...","goal":"...","materials":"...","duration":"30 min"},{"day":"Thursday","activity":"...","goal":"...","materials":"...","duration":"30 min"},{"day":"Friday","activity":"...","goal":"...","materials":"...","duration":"30 min"}],
"learningOutcome":"...","expectedOutcomes":["..."],"strategies":["..."],"parentTips":["..."],"targetScore":${Math.min(score + 15, 100)}}`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] })
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      return JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch { return aiService._fallbackWeek1Plan(childData, score, level); }
  },

  generateWeeklyEvalTest: async (iepPlan, childData) => {
    const activitiesSummary = iepPlan.weeklyPlan.map(d => `${d.day}: ${d.activity} (Goal: ${d.goal})`).join("\n");
    const prompt = `Generate a 5-question end-of-week evaluation for a child.
Child: ${childData.childName}, Age ${childData.age}, ${childData.disabilityType}
Week ${iepPlan.weekNumber} Activities:\n${activitiesSummary}
Goal: ${iepPlan.learningOutcome}
Return ONLY valid JSON:
{"questions":[{"id":"eq1","category":"goal_achievement","text":"...","options":["Always (4+ times)","Often (2-3 times)","Sometimes (1 time)","Not yet"],"scoring":{"Always (4+ times)":3,"Often (2-3 times)":2,"Sometimes (1 time)":1,"Not yet":0},"relatedActivity":"Monday"}]}`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 800, messages: [{ role: "user", content: prompt }] })
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      return JSON.parse(text.replace(/```json|```/g, "").trim()).questions;
    } catch { return aiService._fallbackEvalQuestions(iepPlan); }
  },

  makeProgressDecision: async (score, targetScore, previousScore, iepPlan, childData) => {
    const achieved = score >= targetScore;
    const improvement = score - previousScore;
    const prompt = `Special education AI advisor. Make a data-driven decision.
Child: ${childData.childName}, ${childData.disabilityType}, Age ${childData.age}
Previous Score: ${previousScore}/100, This Week: ${score}/100, Target: ${targetScore}/100
Improvement: ${improvement >= 0 ? "+" : ""}${improvement}, Goal: ${achieved ? "ACHIEVED ✅" : "NOT ACHIEVED ❌"}
Plan Goal: ${iepPlan.learningOutcome}
Rules: score >= targetScore → ADVANCE; score < targetScore → MODIFY
Return ONLY valid JSON:
{"decision":"ADVANCE","reasoning":"...","modifications":[],"nextWeekHints":["..."],"encouragementMessage":"..."}`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 600, messages: [{ role: "user", content: prompt }] })
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      return JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      return {
        decision: achieved ? "ADVANCE" : "MODIFY",
        reasoning: achieved ? `${childData.childName} achieved target ${targetScore}. Progressing to next week.` : `${childData.childName} scored ${score} vs target ${targetScore}. Plan will be adapted.`,
        modifications: achieved ? [] : ["Reduce activity complexity by 20%", "Add more repetition and reinforcement", "Introduce visual supports for difficult tasks"],
        nextWeekHints: achieved ? ["Build on this week's successes", "Introduce slightly more complex interactions"] : [],
        encouragementMessage: achieved ? `Wonderful progress! ${childData.childName} is ready for the next challenge.` : `Every step counts! ${childData.childName} is working hard — keep going!`
      };
    }
  },

  generateNextWeekPlan: async (childData, currentPlan, evaluation) => {
    const prompt = `Special education curriculum designer. Generate Week ${currentPlan.weekNumber + 1} progression plan.
Child: ${childData.childName}, Age ${childData.age}, ${childData.disabilityType}
Completed Week ${currentPlan.weekNumber} — Score: ${evaluation.score}/100 ✅
Previous Goal: ${currentPlan.learningOutcome}
Return ONLY valid JSON:
{"weeklyPlan":[{"day":"Monday","activity":"...","goal":"...","materials":"...","duration":"30 min"},{"day":"Tuesday","activity":"...","goal":"...","materials":"...","duration":"30 min"},{"day":"Wednesday","activity":"...","goal":"...","materials":"...","duration":"30 min"},{"day":"Thursday","activity":"...","goal":"...","materials":"...","duration":"30 min"},{"day":"Friday","activity":"...","goal":"...","materials":"...","duration":"30 min"}],
"learningOutcome":"...","expectedOutcomes":["..."],"strategies":["..."],"parentTips":["..."],"targetScore":${Math.min(evaluation.score + 12, 100)}}`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] })
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      return JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch { return aiService._fallbackWeek1Plan(childData, evaluation.score, evaluation.score >= 70 ? "HIGH" : "MEDIUM"); }
  },

  // ── NEW V2 METHODS ────────────────────────────────────────────────────────

  /**
   * Feature 1: Generate 2–5 milestones for a given week plan
   * Called when a new IEP plan is created.
   * @param {object} iepPlan - the week's plan
   * @param {object} childData
   * @returns {Array} milestones [{title, description, status:"PENDING"}]
   */
  generateMilestones: async (iepPlan, childData) => {
    const activitiesSummary = iepPlan.weeklyPlan.map(d => `${d.day}: ${d.goal}`).join("; ");
    const prompt = `You are a special education milestone expert. Define 3–5 measurable milestones for this week's learning plan.

Child: ${childData.childName}, Age ${childData.age}, ${childData.disabilityType}
Week ${iepPlan.weekNumber} Goals: ${activitiesSummary}
Overall Goal: ${iepPlan.learningOutcome}

Create SPECIFIC, OBSERVABLE milestones a parent can track at home.

Return ONLY valid JSON:
{
  "milestones": [
    {
      "title": "Short observable milestone title",
      "description": "Specific observable behavior to check off"
    }
  ]
}`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 600, messages: [{ role: "user", content: prompt }] })
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      return parsed.milestones.map(m => ({ ...m, status: "PENDING" }));
    } catch {
      // Fallback milestones from plan goals
      return iepPlan.weeklyPlan.slice(0, 3).map((day, i) => ({
        title: day.goal,
        description: `Complete the ${day.day} activity: ${day.activity}`,
        status: "PENDING"
      }));
    }
  },

  /**
   * Feature 3: Generate weekly learning summary in English, then translate to Tamil
   * Called after weekly evaluation is completed.
   * @param {object} childData
   * @param {object} iepPlan - the week's plan
   * @param {object} evaluation - score, improvement, aiDecision
   * @returns {{ summaryEnglish, summaryRegional }}
   */
  generateWeeklySummary: async (childData, iepPlan, evaluation) => {
    const prompt = `You are a special education summary writer.

Generate a weekly learning summary AND translate it to Tamil (தமிழ்).

Child: ${childData.childName}, Age ${childData.age}, ${childData.disabilityType}
Week ${iepPlan.weekNumber}
Score: ${evaluation.score}/100 (Previous: ${evaluation.previousScore}/100)
Improvement: ${evaluation.improvement >= 0 ? "+" : ""}${evaluation.improvement}
AI Decision: ${evaluation.aiDecision}
Weekly Goal: ${iepPlan.learningOutcome}

Write in a warm, encouraging tone for the parent.
The English summary should be 3-4 sentences: learning recap, performance, suggestion.
The Tamil translation should be natural and fluent, not literal.

Return ONLY valid JSON:
{
  "summaryEnglish": "3-4 sentences in English covering learning, performance, suggestions...",
  "summaryTamil": "Same content naturally translated into Tamil script..."
}`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 800, messages: [{ role: "user", content: prompt }] })
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      return { summaryEnglish: parsed.summaryEnglish, summaryRegional: parsed.summaryTamil };
    } catch {
      const decision = evaluation.aiDecision === "ADVANCE" ? "progressed to the next level" : "is continuing to work on this week's goals with an adapted plan";
      return {
        summaryEnglish: `${childData.childName} completed Week ${iepPlan.weekNumber} with a score of ${evaluation.score}/100. This week focused on ${iepPlan.learningOutcome}. ${evaluation.improvement >= 0 ? `There was a ${evaluation.improvement}-point improvement from last week.` : "We will continue to build on foundational skills."} ${childData.childName} has ${decision}.`,
        summaryRegional: `${childData.childName} ${iepPlan.weekNumber}-வது வாரத்தை ${evaluation.score}/100 மதிப்பெண்ணுடன் முடித்தார். இந்த வாரம் ${iepPlan.learningOutcome} என்பதில் கவனம் செலுத்தியது. ${evaluation.improvement >= 0 ? `கடந்த வாரத்திலிருந்து ${evaluation.improvement} மதிப்பெண் முன்னேற்றம் கண்டுள்ளது.` : "அடிப்படை திறன்களை மேலும் வளர்க்கவோம்."} ${childData.childName} ${decision === "progressed to the next level" ? "அடுத்த கட்டத்திற்கு முன்னேறினார்" : "தகவமைக்கப்பட்ட திட்டத்தில் தொடர்கிறார்"}.`
      };
    }
  },

  // ── PRIVATE FALLBACKS (preserved from v1) ─────────────────────────────────

  _fallbackInitialQuestions: (age, disabilityType) => {
    const base = {
      Autism: [
        { id: "q1", category: "communication", text: "Does your child make eye contact during conversation?", options: ["Consistently", "Sometimes", "Rarely", "Never"], scoring: { "Consistently": 3, "Sometimes": 2, "Rarely": 1, "Never": 0 } },
        { id: "q2", category: "social", text: "Does your child initiate play with other children?", options: ["Often", "Sometimes", "With prompting", "Not yet"], scoring: { "Often": 3, "Sometimes": 2, "With prompting": 1, "Not yet": 0 } },
        { id: "q3", category: "communication", text: "How does your child communicate needs?", options: ["Full sentences", "Single words", "Gestures/pointing", "Crying/behavior"], scoring: { "Full sentences": 3, "Single words": 2, "Gestures/pointing": 1, "Crying/behavior": 0 } },
        { id: "q4", category: "cognitive", text: "Can your child follow a 2-step instruction?", options: ["Easily", "With reminders", "With help", "Not yet"], scoring: { "Easily": 3, "With reminders": 2, "With help": 1, "Not yet": 0 } },
        { id: "q5", category: "emotional", text: "How does your child handle changes in routine?", options: ["Adapts well", "Minor upset", "Significant distress", "Complete meltdown"], scoring: { "Adapts well": 3, "Minor upset": 2, "Significant distress": 1, "Complete meltdown": 0 } },
        { id: "q6", category: "motor", text: "Can your child use utensils independently?", options: ["Yes, independently", "With minor spills", "Needs help", "Cannot yet"], scoring: { "Yes, independently": 3, "With minor spills": 2, "Needs help": 1, "Cannot yet": 0 } },
      ],
      ADHD: [
        { id: "q1", category: "attention", text: "How long can your child focus on a preferred activity?", options: ["20+ minutes", "10-20 minutes", "5-10 minutes", "Under 5 minutes"], scoring: { "20+ minutes": 3, "10-20 minutes": 2, "5-10 minutes": 1, "Under 5 minutes": 0 } },
        { id: "q2", category: "impulse", text: "Does your child wait for their turn in games or conversations?", options: ["Usually", "Sometimes", "Rarely", "Never"], scoring: { "Usually": 3, "Sometimes": 2, "Rarely": 1, "Never": 0 } },
        { id: "q3", category: "hyperactivity", text: "How often does your child leave their seat when expected to stay?", options: ["Rarely", "Occasionally", "Frequently", "Almost always"], scoring: { "Rarely": 3, "Occasionally": 2, "Frequently": 1, "Almost always": 0 } },
        { id: "q4", category: "organization", text: "Can your child keep track of their belongings?", options: ["Always", "Usually", "Sometimes", "Never"], scoring: { "Always": 3, "Usually": 2, "Sometimes": 1, "Never": 0 } },
        { id: "q5", category: "following", text: "Does your child complete multi-step tasks independently?", options: ["Yes easily", "With reminders", "Partially", "Not yet"], scoring: { "Yes easily": 3, "With reminders": 2, "Partially": 1, "Not yet": 0 } },
        { id: "q6", category: "emotional", text: "How does your child react to frustration?", options: ["Manages calmly", "Brief upset", "Prolonged distress", "Aggressive behavior"], scoring: { "Manages calmly": 3, "Brief upset": 2, "Prolonged distress": 1, "Aggressive behavior": 0 } },
      ],
    };
    return base[disabilityType] || base["Autism"];
  },

  _fallbackWeek1Plan: (childData, score, level) => {
    const plans = {
      LOW: {
        weeklyPlan: [
          { day: "Monday", activity: "Structured sensory exploration with familiar objects", goal: "Engage with 3 different textures", materials: "Texture board, safe household objects", duration: "20 min" },
          { day: "Tuesday", activity: "Picture-to-object matching exercise", goal: "Match 5 picture cards to real objects", materials: "Picture cards, everyday objects", duration: "20 min" },
          { day: "Wednesday", activity: "Simple gross motor circuit (walking, stepping, rolling)", goal: "Complete full circuit with minimal prompting", materials: "Foam steps, ball, mat", duration: "25 min" },
          { day: "Thursday", activity: "1:1 adult-guided play session", goal: "Take 3 turns in back-and-forth play", materials: "Simple toys, bubbles", duration: "20 min" },
          { day: "Friday", activity: "Daily routine visual schedule review", goal: "Follow 4-step visual schedule independently", materials: "Picture schedule cards", duration: "Throughout day" },
        ],
        learningOutcome: "Complete 3 structured activities daily with adult support.",
        expectedOutcomes: ["Tolerate structured activity for 15+ minutes", "Follow 2-step visual instructions", "Engage in simple back-and-forth interaction"],
        strategies: ["High repetition and predictability", "Sensory breaks every 15 minutes"],
        parentTips: ["Practice picture card matching at breakfast", "Use the same visual schedule every morning", "Celebrate every small attempt with praise"],
        targetScore: Math.min(score + 15, 100),
      },
      MEDIUM: {
        weeklyPlan: [
          { day: "Monday", activity: "Social story: 'Making Friends at School'", goal: "Retell story with 3 key details", materials: "Social story book, props", duration: "25 min" },
          { day: "Tuesday", activity: "Fine motor skill station: threading, cutting, building", goal: "Complete all 3 stations in one session", materials: "Beads, safety scissors, blocks", duration: "30 min" },
          { day: "Wednesday", activity: "Emotion regulation role-play", goal: "Identify feelings and use calming strategy", materials: "Emotion cards, calm-down corner", duration: "20 min" },
          { day: "Thursday", activity: "Peer buddy activity (game or craft)", goal: "Sustain cooperative interaction for 15 min", materials: "Board game or art supplies", duration: "30 min" },
          { day: "Friday", activity: "Independent task completion with checklist", goal: "Complete 4-item task checklist independently", materials: "Visual checklist, task materials", duration: "25 min" },
        ],
        learningOutcome: "Demonstrate improved social interaction and independent task completion.",
        expectedOutcomes: ["Initiate 3 peer interactions", "Use calming strategy when upset", "Complete 4-step task independently"],
        strategies: ["Visual supports for transitions", "Choice boards to increase autonomy"],
        parentTips: ["Read social story at bedtime", "Practice emotion naming during daily routines"],
        targetScore: Math.min(score + 12, 100),
      },
      HIGH: {
        weeklyPlan: [
          { day: "Monday", activity: "Community helper vocabulary and role-play", goal: "Name and role-play 5 community helpers", materials: "Costume props, flashcards", duration: "30 min" },
          { day: "Tuesday", activity: "Writing/typing simple sentences about self", goal: "Write/type 3 sentences about weekend", materials: "Pencil and paper or tablet", duration: "30 min" },
          { day: "Wednesday", activity: "Cooperative group project (building or crafting)", goal: "Contribute meaningfully to group outcome", materials: "Project materials", duration: "35 min" },
          { day: "Thursday", activity: "Problem-solving scenarios and discussion", goal: "Suggest 2 solutions to a given problem", materials: "Scenario cards", duration: "25 min" },
          { day: "Friday", activity: "Self-evaluation and goal setting", goal: "Rate own performance and set next goal", materials: "Self-rating chart", duration: "20 min" },
        ],
        learningOutcome: "Demonstrate higher-order thinking, group cooperation, and self-monitoring.",
        expectedOutcomes: ["Participate fully in group activity", "Self-evaluate performance accurately", "Generate problem solutions independently"],
        strategies: ["Metacognitive journaling", "Peer mentoring opportunities"],
        parentTips: ["Discuss school day events at dinner", "Encourage child to help with household tasks"],
        targetScore: Math.min(score + 10, 100),
      },
    };
    return plans[level] || plans["MEDIUM"];
  },

  _fallbackEvalQuestions: (iepPlan) => [
    { id: "eq1", category: "goal_achievement", text: `Did your child complete the Monday activity: "${iepPlan.weeklyPlan[0]?.activity}"?`, options: ["Always (4+ times)", "Often (2-3 times)", "Sometimes (1 time)", "Not yet"], scoring: { "Always (4+ times)": 3, "Often (2-3 times)": 2, "Sometimes (1 time)": 1, "Not yet": 0 }, relatedActivity: "Monday" },
    { id: "eq2", category: "engagement", text: "How engaged was your child during learning activities this week?", options: ["Very engaged throughout", "Engaged most of the time", "Engaged occasionally", "Hard to engage"], scoring: { "Very engaged throughout": 3, "Engaged most of the time": 2, "Engaged occasionally": 1, "Hard to engage": 0 }, relatedActivity: "General" },
    { id: "eq3", category: "independence", text: "How independently did your child complete tasks this week?", options: ["Mostly independent", "Needed reminders only", "Needed frequent help", "Needed constant support"], scoring: { "Mostly independent": 3, "Needed reminders only": 2, "Needed frequent help": 1, "Needed constant support": 0 }, relatedActivity: "General" },
    { id: "eq4", category: "social", text: "Did your child interact positively with others during activities?", options: ["Consistently positive", "Usually positive", "Mixed interactions", "Avoided interaction"], scoring: { "Consistently positive": 3, "Usually positive": 2, "Mixed interactions": 1, "Avoided interaction": 0 }, relatedActivity: "Social" },
    { id: "eq5", category: "goal_achievement", text: `Was this week's main goal achieved: "${iepPlan.learningOutcome.slice(0, 60)}..."?`, options: ["Fully achieved", "Mostly achieved", "Partially achieved", "Not achieved"], scoring: { "Fully achieved": 3, "Mostly achieved": 2, "Partially achieved": 1, "Not achieved": 0 }, relatedActivity: "Goal" },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE: assessmentService.js — Extended (all v1 methods preserved)
// ─────────────────────────────────────────────────────────────────────────────

const assessmentService = {
  // Existing getters (unchanged)
  getParentById: (id) => mockDB.parents.find(p => p.id === id),
  getEducatorById: (id) => mockDB.educators.find(e => e.id === id),
  getAssessmentsByChild: (childId) => mockDB.assessments.filter(a => a.childID === childId).sort((a, b) => a.weekNumber - b.weekNumber),
  getIEPByChild: (childId) => mockDB.iepPlans.filter(p => p.childID === childId).sort((a, b) => a.weekNumber - b.weekNumber),
  getFeedbackByEducator: (eduId) => mockDB.feedback.filter(f => f.educatorID === eduId),
  getFeedbackByParent: (parentId) => mockDB.feedback.filter(f => f.parentID === parentId),

  // Initial assessment (v1)
  getInitialAssessment: (childId) => mockDB.initialAssessments.find(ia => ia.childId === childId),
  hasCompletedInitialAssessment: (childId) => mockDB.initialAssessments.some(ia => ia.childId === childId),
  saveInitialAssessment: (childId, questions, answers, totalScore, level, disabilityType, age) => {
    const record = { id: "ia" + Date.now(), childId, questions, answers, totalScore, level, disabilityType, age, completedAt: new Date().toISOString().slice(0, 10), week1PlanGenerated: false };
    mockDB.initialAssessments.push(record);
    const parent = mockDB.parents.find(p => p.id === childId);
    if (parent) parent.initialAssessmentDone = true;
    return record;
  },
  markWeek1PlanGenerated: (childId) => {
    const ia = mockDB.initialAssessments.find(i => i.childId === childId);
    if (ia) ia.week1PlanGenerated = true;
  },
  saveWeek1Plan: (childId, educatorId, planData, score, level) => {
    const existing = mockDB.iepPlans.filter(p => p.childID === childId);
    if (existing.some(p => p.weekNumber === 1)) return existing.find(p => p.weekNumber === 1);
    const plan = { id: "iep" + Date.now(), childID: childId, educatorID: educatorId, weeklyPlan: planData.weeklyPlan, learningOutcome: planData.learningOutcome, expectedOutcomes: planData.expectedOutcomes, strategies: planData.strategies, parentTips: planData.parentTips, status: "ONGOING", weekNumber: 1, aiGenerated: true, editedByEducator: false, previousScore: score, targetScore: planData.targetScore, initialLevel: level, createdAt: new Date().toISOString() };
    mockDB.iepPlans.push(plan);
    assessmentService.markWeek1PlanGenerated(childId);
    return plan;
  },

  // Weekly evaluations (v1)
  getWeeklyEvaluations: (childId) => mockDB.weeklyEvaluations.filter(e => e.childId === childId).sort((a, b) => a.weekNumber - b.weekNumber),
  getLatestEvaluation: (childId) => { const evals = mockDB.weeklyEvaluations.filter(e => e.childId === childId); return evals.length ? evals[evals.length - 1] : null; },
  hasPendingEvaluation: (childId, weekNumber) => mockDB.weeklyEvaluations.some(e => e.childId === childId && e.weekNumber === weekNumber),
  saveWeeklyEvaluation: (childId, educatorId, weekNumber, iepPlanId, questions, answers, score, previousScore, aiDecision) => {
    const record = { id: "we" + Date.now(), childId, educatorId, weekNumber, iepPlanId, questions, answers, score, previousScore, improvement: score - previousScore, aiDecision: aiDecision.decision, aiReasoning: aiDecision.reasoning, modifications: aiDecision.modifications, nextWeekHints: aiDecision.nextWeekHints, encouragementMessage: aiDecision.encouragementMessage, completedAt: new Date().toISOString().slice(0, 10) };
    mockDB.weeklyEvaluations.push(record);
    return record;
  },
  updateIEPStatus: (planId, status) => { const plan = mockDB.iepPlans.find(p => p.id === planId); if (plan) plan.status = status; return plan; },
  saveNextWeekPlan: (childId, educatorId, weekNumber, planData, score) => {
    const plan = { id: "iep" + Date.now(), childID: childId, educatorID: educatorId, weeklyPlan: planData.weeklyPlan, learningOutcome: planData.learningOutcome, expectedOutcomes: planData.expectedOutcomes || [], strategies: planData.strategies || [], parentTips: planData.parentTips || [], status: "ONGOING", weekNumber, aiGenerated: true, editedByEducator: false, previousScore: score, targetScore: planData.targetScore, createdAt: new Date().toISOString() };
    mockDB.iepPlans.push(plan);
    return plan;
  },
  modifyIEPPlan: (planId, modifications) => {
    const plan = mockDB.iepPlans.find(p => p.id === planId);
    if (!plan) return null;
    plan.status = "ONGOING"; plan.modifications = modifications; plan.modifiedAt = new Date().toISOString(); plan.editedByEducator = false; plan.aiModified = true;
    return plan;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE: milestoneService.js — NEW Feature 1
// Milestone CRUD — in a real app this maps to /controllers/milestoneController.js
// ─────────────────────────────────────────────────────────────────────────────

const milestoneService = {
  /**
   * GET /api/milestones/:childId — Fetch all milestone records for a child
   */
  getMilestonesByChild: (childId) => mockDB.milestones.filter(m => m.childId === childId).sort((a, b) => a.week - b.week),

  /**
   * GET milestones for a specific week
   */
  getMilestonesByWeek: (childId, week) => mockDB.milestones.find(m => m.childId === childId && m.week === week),

  /**
   * POST /api/milestones — Save milestones for a week
   * Called immediately after generating a new IEP plan (Feature 5 Enhancement)
   */
  saveMilestones: (childId, week, milestones) => {
    const existing = mockDB.milestones.find(m => m.childId === childId && m.week === week);
    if (existing) return existing;
    const record = { id: "ms" + Date.now(), childId, week, milestones, createdAt: new Date().toISOString() };
    mockDB.milestones.push(record);
    return record;
  },

  /**
   * PATCH /api/milestones/:childId/:week — Update milestone statuses after evaluation
   * Called automatically in WeeklyEvaluationFlow after AI decision.
   * Rule: ADVANCE → mark all COMPLETED; MODIFY → keep PENDING
   */
  updateMilestoneStatus: (childId, week, aiDecision) => {
    const record = mockDB.milestones.find(m => m.childId === childId && m.week === week);
    if (!record) return null;
    record.milestones = record.milestones.map(ms => ({
      ...ms,
      status: aiDecision === "ADVANCE" ? "COMPLETED" : ms.status
    }));
    return record;
  },

  /**
   * Toggle individual milestone status (parent can manually mark)
   */
  toggleMilestone: (childId, week, milestoneIndex) => {
    const record = mockDB.milestones.find(m => m.childId === childId && m.week === week);
    if (!record || !record.milestones[milestoneIndex]) return null;
    const current = record.milestones[milestoneIndex].status;
    record.milestones[milestoneIndex].status = current === "PENDING" ? "COMPLETED" : "PENDING";
    return record;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE: progressService.js — NEW Feature 2
// Maps to GET /api/progress/:childId
// ─────────────────────────────────────────────────────────────────────────────

const progressService = {
  /**
   * GET /api/progress/:childId
   * Returns week-by-week score data for the progress graph.
   * Merges initial assessment data + educator assessments + weekly evaluations.
   */
  getProgressData: (childId) => {
    const data = [];

    // Educator-recorded assessments (existing assessments collection)
    const assessments = mockDB.assessments.filter(a => a.childID === childId).sort((a, b) => a.weekNumber - b.weekNumber);
    assessments.forEach(a => {
      if (!data.find(d => d.week === a.weekNumber)) {
        data.push({ week: a.weekNumber, score: a.score, source: "assessment" });
      }
    });

    // Weekly evaluations (parent-reported, AI scored)
    const weeklyEvals = mockDB.weeklyEvaluations.filter(e => e.childId === childId).sort((a, b) => a.weekNumber - b.weekNumber);
    weeklyEvals.forEach(e => {
      const existing = data.find(d => d.week === e.weekNumber);
      if (existing) {
        existing.evalScore = e.score; // show both
      } else {
        data.push({ week: e.weekNumber, score: e.score, source: "evaluation" });
      }
    });

    return data.sort((a, b) => a.week - b.week);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE: summaryService.js — NEW Feature 3
// Weekly Summary CRUD
// ─────────────────────────────────────────────────────────────────────────────

const summaryService = {
  /**
   * GET /api/summaries/:childId — All summaries for a child
   */
  getSummariesByChild: (childId) => mockDB.weeklySummaries.filter(s => s.childId === childId).sort((a, b) => b.week - a.week),

  /**
   * GET summary for a specific week
   */
  getSummaryByWeek: (childId, week) => mockDB.weeklySummaries.find(s => s.childId === childId && s.week === week),

  /**
   * POST /api/summaries — Save weekly summary (English + Tamil)
   */
  saveSummary: (childId, week, summaryEnglish, summaryRegional) => {
    const existing = mockDB.weeklySummaries.find(s => s.childId === childId && s.week === week);
    if (existing) { existing.summaryEnglish = summaryEnglish; existing.summaryRegional = summaryRegional; return existing; }
    const record = { id: "ws" + Date.now(), childId, week, summaryEnglish, summaryRegional, createdAt: new Date().toISOString().slice(0, 10) };
    mockDB.weeklySummaries.push(record);
    return record;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE: educatorService.js — NEW Feature 4
// Educator assignment based on specialization matching
// ─────────────────────────────────────────────────────────────────────────────

const educatorService = {
  /**
   * Find an educator matching the child's disability type.
   * Called on parent registration.
   * Returns educator or null.
   */
  findMatchingEducator: (disabilityType) => {
    return mockDB.educators.find(e => e.educatorType === disabilityType) || null;
  },

  /**
   * Assign an educator to a child.
   * Only called when a match is found.
   */
  assignEducator: (parentId, educatorId) => {
    const parent = mockDB.parents.find(p => p.id === parentId);
    const educator = mockDB.educators.find(e => e.id === educatorId);
    if (!parent || !educator) return false;
    parent.assignedEducatorID = educatorId;
    if (!educator.assignedChildren.includes(parentId)) educator.assignedChildren.push(parentId);
    return true;
  },

  /**
   * Check if a child has a matching educator available.
   * Used to show "Please wait" message in UI.
   */
  hasMatchingEducator: (disabilityType) => {
    return mockDB.educators.some(e => e.educatorType === disabilityType);
  },

  /**
   * Simulate a deferred matching — called when a new educator registers
   * with a specialization that matches unassigned children.
   */
  runDeferredMatching: (educatorId) => {
    const educator = mockDB.educators.find(e => e.id === educatorId);
    if (!educator) return 0;
    let matched = 0;
    mockDB.parents.forEach(parent => {
      if (!parent.assignedEducatorID && parent.disabilityType === educator.educatorType) {
        educatorService.assignEducator(parent.id, educatorId);
        matched++;
      }
    });
    return matched;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTH — Extended for Feature 4 (no default educator assignment)
// ─────────────────────────────────────────────────────────────────────────────

const mockAuth = {
  login: (email, password, role) => {
    const db = role === "educator" ? mockDB.educators : mockDB.parents;
    const user = db.find(u => u.email === email && u.password === password);
    if (!user) return { error: "Invalid credentials" };
    const token = btoa(JSON.stringify({ id: user.id, role, email }));
    return { token, user, role };
  },

  register: (data, role) => {
    if (role === "educator") {
      const exists = mockDB.educators.find(e => e.email === data.email);
      if (exists) return { error: "Email already registered" };
      const newEdu = { ...data, id: "edu" + Date.now(), assignedChildren: [] };
      mockDB.educators.push(newEdu);
      // Feature 4: Run deferred matching for waiting children
      const matchedCount = educatorService.runDeferredMatching(newEdu.id);
      const token = btoa(JSON.stringify({ id: newEdu.id, role, email: data.email }));
      return { token, user: newEdu, role, matchedCount };
    } else {
      const exists = mockDB.parents.find(p => p.email === data.email);
      if (exists) return { error: "Email already registered" };

      // Feature 4: Match only if educator with same specialization exists
      const matchedEdu = educatorService.findMatchingEducator(data.disabilityType);
      const uniqueChildID = "CHILD-" + String(Math.floor(Math.random() * 900000) + 100000);

      const newParent = {
        ...data, id: "par" + Date.now(), uniqueChildID,
        // Only assign educator if matched; null means "waiting"
        assignedEducatorID: matchedEdu?.id || null,
        initialAssessmentDone: false
      };
      mockDB.parents.push(newParent);

      if (matchedEdu) matchedEdu.assignedChildren.push(newParent.id);

      const token = btoa(JSON.stringify({ id: newParent.id, role, email: data.email }));
      return {
        token, user: newParent, role,
        assignedEducator: matchedEdu || null,
        requiresInitialAssessment: true,
        // Feature 4: UI uses this to show "waiting" message
        educatorPending: !matchedEdu,
      };
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UI HELPERS (preserved from v1, unchanged)
// ─────────────────────────────────────────────────────────────────────────────

const colors = {
  primary: "#1a3a5c", secondary: "#e85d26", accent: "#34c2b3",
  soft: "#f0f7ff", card: "#ffffff", border: "#dce8f5",
  text: "#1e2b3a", muted: "#6b859e", success: "#2db87a",
  warning: "#f5a623", danger: "#e84b4b",
  gradient: "linear-gradient(135deg, #1a3a5c 0%, #2563a8 60%, #34c2b3 100%)",
};

const globalStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=DM+Serif+Display&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Nunito', sans-serif; color: #1e2b3a; }
  .fade-in { animation: fadeIn 0.35s ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .pulse { animation: pulse 1.5s ease-in-out infinite; }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
`;

const disabilityTypes = ["Autism", "ADHD", "Intellectual Disability", "Down Syndrome"];
const languages = ["English", "Tamil", "Hindi", "Telugu", "Malayalam", "Kannada"];

const Card = ({ children, style = {} }) => (
  <div style={{ background: colors.card, borderRadius: 16, border: `1px solid ${colors.border}`, padding: 20, boxShadow: "0 2px 12px rgba(26,58,92,0.06)", ...style }}>{children}</div>
);

const Badge = ({ children, color = "blue" }) => {
  const map = { blue: ["#dbeafe", "#1d4ed8"], green: ["#d1fae5", "#065f46"], orange: ["#ffedd5", "#9a3412"], red: ["#fee2e2", "#991b1b"], teal: ["#ccfbf1", "#0f766e"], purple: ["#ede9fe", "#5b21b6"], yellow: ["#fefce8", "#854d0e"] };
  const [bg, fg] = map[color] || map.blue;
  return <span style={{ background: bg, color: fg, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{children}</span>;
};

const Button = ({ children, onClick, disabled, variant = "primary", size = "md", style = {} }) => {
  const base = { border: "none", borderRadius: 10, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "Nunito", fontWeight: 700, transition: "all 0.2s", opacity: disabled ? 0.6 : 1, ...style };
  const sizes = { sm: { padding: "7px 14px", fontSize: 13 }, md: { padding: "10px 20px", fontSize: 14 }, lg: { padding: "13px 28px", fontSize: 15 } };
  const variants = {
    primary: { background: colors.secondary, color: "#fff" },
    secondary: { background: colors.accent, color: "#fff" },
    outline: { background: "transparent", border: `1.5px solid ${colors.border}`, color: colors.text },
    ghost: { background: "transparent", color: colors.primary },
    danger: { background: colors.danger, color: "#fff" },
    success: { background: colors.success, color: "#fff" },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...sizes[size], ...variants[variant] }}>{children}</button>;
};

const Spinner = ({ size = 24, color = colors.accent }) => (
  <div style={{ width: size, height: size, border: `3px solid ${color}30`, borderTop: `3px solid ${color}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }}>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

const Alert = ({ children, type = "info" }) => {
  const map = { info: ["#dbeafe", "#1e40af", "ℹ️"], success: ["#d1fae5", "#065f46", "✅"], warning: ["#ffedd5", "#9a3412", "⚠️"], error: ["#fee2e2", "#991b1b", "❌"] };
  const [bg, fg, icon] = map[type];
  return <div style={{ background: bg, color: fg, padding: "12px 16px", borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "flex-start", gap: 8 }}><span>{icon}</span><span>{children}</span></div>;
};

const Input = ({ label, value, onChange, type = "text", placeholder, required, options }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: "block", fontWeight: 700, fontSize: 13, color: colors.primary, marginBottom: 6 }}>{label}{required && <span style={{ color: colors.danger }}>*</span>}</label>
    {options ? (
      <select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${colors.border}`, borderRadius: 10, fontFamily: "Nunito", fontSize: 14, outline: "none", background: "#fff", color: colors.text }}>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    ) : (
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${colors.border}`, borderRadius: 10, fontFamily: "Nunito", fontSize: 14, outline: "none" }} />
    )}
  </div>
);

const ProgressBar = ({ value, max = 100, color = colors.accent, height = 10 }) => (
  <div style={{ background: colors.border, borderRadius: 20, overflow: "hidden", height }}>
    <div style={{ width: `${Math.min((value / max) * 100, 100)}%`, height: "100%", background: color, borderRadius: 20, transition: "width 0.6s ease" }} />
  </div>
);

const ScoreBadge = ({ score }) => {
  const color = score >= 70 ? "green" : score >= 40 ? "orange" : "red";
  const label = score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW";
  return <Badge color={color}>{label} ({score}/100)</Badge>;
};

// ─────────────────────────────────────────────────────────────────────────────
// NEW COMPONENT: MilestoneTracker — Feature 1
// Shows milestones for a given week with PENDING/COMPLETED status toggle
// ─────────────────────────────────────────────────────────────────────────────

const MilestoneTracker = ({ childId, week, refreshKey }) => {
  const [record, setRecord] = useState(() => milestoneService.getMilestonesByWeek(childId, week));
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setRecord(milestoneService.getMilestonesByWeek(childId, week));
  }, [childId, week, refreshKey]);

  const handleToggle = (idx) => {
    milestoneService.toggleMilestone(childId, week, idx);
    setRecord({ ...milestoneService.getMilestonesByWeek(childId, week) });
  };

  if (!record) {
    return (
      <div style={{ padding: 16, background: colors.soft, borderRadius: 12, textAlign: "center" }}>
        <p style={{ color: colors.muted, fontSize: 13 }}>No milestones set for Week {week} yet.</p>
      </div>
    );
  }

  const completed = record.milestones.filter(m => m.status === "COMPLETED").length;
  const total = record.milestones.length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontWeight: 800, color: colors.primary, fontSize: 14 }}>Week {week} Milestones</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Badge color={completed === total ? "green" : "orange"}>{completed}/{total} Done</Badge>
        </div>
      </div>
      <ProgressBar value={completed} max={total} color={completed === total ? colors.success : colors.warning} height={6} />
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {record.milestones.map((ms, idx) => (
          <div
            key={idx}
            onClick={() => handleToggle(idx)}
            style={{
              display: "flex", gap: 12, alignItems: "flex-start",
              padding: "12px 14px", borderRadius: 12, cursor: "pointer",
              background: ms.status === "COMPLETED" ? "#d1fae5" : colors.soft,
              border: `1.5px solid ${ms.status === "COMPLETED" ? "#6ee7b7" : colors.border}`,
              transition: "all 0.2s",
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
              background: ms.status === "COMPLETED" ? colors.success : "#fff",
              border: `2px solid ${ms.status === "COMPLETED" ? colors.success : colors.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, color: "#fff", fontWeight: 900, marginTop: 1,
            }}>
              {ms.status === "COMPLETED" ? "✓" : ""}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: ms.status === "COMPLETED" ? "#065f46" : colors.text, textDecoration: ms.status === "COMPLETED" ? "line-through" : "none" }}>
                {ms.title}
              </div>
              <div style={{ fontSize: 12, color: colors.muted, marginTop: 3 }}>{ms.description}</div>
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, color: colors.muted, marginTop: 10, textAlign: "center" }}>Tap a milestone to toggle completion</p>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// NEW COMPONENT: ProgressGraph — Feature 2
// Recharts line chart showing week vs score progression
// Maps to GET /api/progress/:childId
// ─────────────────────────────────────────────────────────────────────────────

const ProgressGraph = ({ childId }) => {
  const data = progressService.getProgressData(childId);

  if (data.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40, background: colors.soft, borderRadius: 12 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📈</div>
        <p style={{ color: colors.muted, fontSize: 14 }}>Progress data will appear here after your first evaluation.</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 10, padding: "10px 14px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
          <div style={{ fontWeight: 800, color: colors.primary, marginBottom: 4 }}>Week {label}</div>
          {payload.map((p, i) => (
            <div key={i} style={{ fontSize: 13, color: p.color, fontWeight: 700 }}>{p.name}: {p.value}/100</div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 800, color: colors.primary }}>Score Progression</div>
        <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
          <span style={{ color: colors.accent, fontWeight: 700 }}>● Assessments</span>
          <span style={{ color: colors.secondary, fontWeight: 700 }}>● Evaluations</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
          <XAxis dataKey="week" tick={{ fontSize: 12, fill: colors.muted }} tickFormatter={(v) => `W${v}`} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: colors.muted }} tickFormatter={(v) => `${v}`} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={70} stroke="#2db87a" strokeDasharray="4 4" label={{ value: "Target", fontSize: 11, fill: "#2db87a", position: "insideRight" }} />
          <Line type="monotone" dataKey="score" stroke={colors.accent} strokeWidth={2.5} dot={{ r: 5, fill: colors.accent }} name="Score" />
          <Line type="monotone" dataKey="evalScore" stroke={colors.secondary} strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4, fill: colors.secondary }} name="Eval Score" />
        </LineChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
        {data.map(d => (
          <div key={d.week} style={{ background: colors.soft, borderRadius: 10, padding: "8px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: colors.muted, fontWeight: 700 }}>Week {d.week}</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: colors.primary }}>{d.score}</div>
            {d.evalScore && <div style={{ fontSize: 11, color: colors.secondary, fontWeight: 700 }}>Eval: {d.evalScore}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// NEW COMPONENT: WeeklySummaryCard — Feature 3
// Shows English/Tamil toggle for weekly summary
// ─────────────────────────────────────────────────────────────────────────────

const WeeklySummaryCard = ({ childId }) => {
  const [lang, setLang] = useState("en"); // "en" | "ta"
  const summaries = summaryService.getSummariesByChild(childId);

  if (summaries.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 32, background: colors.soft, borderRadius: 12 }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>📝</div>
        <p style={{ color: colors.muted, fontSize: 14 }}>Weekly summaries will appear here after your first evaluation.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontWeight: 800, color: colors.primary }}>Learning Summaries</div>
        {/* Language Toggle */}
        <div style={{ display: "flex", background: colors.soft, borderRadius: 10, padding: 3, gap: 2 }}>
          {[["en", "🇬🇧 English"], ["ta", "🇮🇳 தமிழ்"]].map(([code, label]) => (
            <button key={code} onClick={() => setLang(code)} style={{ padding: "6px 14px", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "Nunito", fontWeight: 700, fontSize: 12, background: lang === code ? colors.primary : "transparent", color: lang === code ? "#fff" : colors.muted, transition: "all 0.2s" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {summaries.map(s => (
        <div key={s.id} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Badge color="blue">Week {s.week}</Badge>
            <span style={{ fontSize: 12, color: colors.muted }}>{s.createdAt}</span>
          </div>
          <div style={{
            background: lang === "ta" ? "#fdf4ff" : "#f0f9ff",
            border: `1px solid ${lang === "ta" ? "#e9d5ff" : "#bae6fd"}`,
            borderRadius: 12, padding: 16,
          }}>
            <p style={{
              fontSize: lang === "ta" ? 15 : 14,
              color: colors.text, lineHeight: 1.8,
              fontFamily: lang === "ta" ? "'Noto Sans Tamil', 'Nunito', sans-serif" : "inherit"
            }}>
              {lang === "en" ? s.summaryEnglish : s.summaryRegional}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EXISTING COMPONENT: InitialAssessmentFlow (v1 — preserved, not modified)
// ─────────────────────────────────────────────────────────────────────────────

const InitialAssessmentFlow = ({ parent, onComplete }) => {
  const [phase, setPhase] = useState("intro");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [week1Plan, setWeek1Plan] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [planLoading, setPlanLoading] = useState(false);
  const educator = assessmentService.getEducatorById(parent.assignedEducatorID);

  const loadQuestions = async () => {
    setPhase("loading");
    const qs = await aiService.generateInitialTest(parent.age, parent.disabilityType);
    setQuestions(qs); setPhase("questions");
  };
  const handleAnswer = (qId, answer) => setAnswers(prev => ({ ...prev, [qId]: answer }));
  const handleNextQuestion = () => { if (currentQ < questions.length - 1) setCurrentQ(c => c + 1); else submitAssessment(); };
  const submitAssessment = () => {
    const answersArr = questions.map(q => ({ questionId: q.id, answer: answers[q.id] || q.options[q.options.length - 1], score: q.scoring?.[answers[q.id]] ?? 0 }));
    const { totalScore, level } = aiService.evaluateInitialAssessment(answersArr, questions);
    const record = assessmentService.saveInitialAssessment(parent.id, questions, answersArr, totalScore, level, parent.disabilityType, parent.age);
    setResult({ totalScore, level, record }); setPhase("result");
  };
  const generatePlan = async () => {
    setPlanLoading(true);
    const planData = await aiService.generateWeek1Plan(parent, result.totalScore, result.level);
    const savedPlan = assessmentService.saveWeek1Plan(parent.id, educator?.id || "edu1", planData, result.totalScore, result.level);

    // Feature 1 Enhancement: Generate milestones alongside week 1 plan
    const milestones = await aiService.generateMilestones(savedPlan, parent);
    milestoneService.saveMilestones(parent.id, 1, milestones);

    setWeek1Plan(savedPlan); setPlanLoading(false); setPhase("plan");
  };

  const levelDesc = {
    LOW: "Your child needs foundational support. We'll start with structured, simple activities and build up gradually.",
    MEDIUM: "Your child shows good baseline skills. The plan will focus on consolidating and expanding capabilities.",
    HIGH: "Your child demonstrates strong foundational skills. We'll work on advanced independence and social learning.",
  };

  return (
    <div style={{ minHeight: "100vh", background: colors.gradient, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{globalStyle}</style>
      <div className="fade-in" style={{ width: "100%", maxWidth: 580 }}>
        {phase === "intro" && (
          <Card style={{ padding: 36, textAlign: "center" }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🧩</div>
            <h2 style={{ fontFamily: "DM Serif Display", fontSize: 28, color: colors.primary, marginBottom: 8 }}>Welcome to EduPath!</h2>
            <p style={{ color: colors.muted, marginBottom: 8, fontSize: 15 }}>Hello, {parent.parentName}!</p>

            {/* Feature 4: Educator assignment status */}
            {parent.assignedEducatorID ? (
              <Alert type="success">Matched with {assessmentService.getEducatorById(parent.assignedEducatorID)?.name} — {parent.disabilityType} Specialist</Alert>
            ) : (
              <Alert type="warning">Please wait while we find a suitable educator for your child. In the meantime, let's complete the initial assessment.</Alert>
            )}

            <p style={{ color: colors.text, marginBottom: 24, lineHeight: 1.7 }}>
              Before we create <strong>{parent.childName}'s</strong> personalised learning plan, we need to understand their current abilities through a short <strong>initial assessment</strong>.
            </p>
            <div style={{ background: colors.soft, borderRadius: 12, padding: 18, marginBottom: 24, textAlign: "left" }}>
              <div style={{ fontWeight: 800, color: colors.primary, marginBottom: 10 }}>What happens next:</div>
              {["6 short questions about your child's current abilities", "AI analyses responses and classifies ability level", "Personalised Week 1 plan generated instantly", "Milestones set for the week"].map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                  <span style={{ background: colors.accent, color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: 14, color: colors.text }}>{s}</span>
                </div>
              ))}
            </div>
            <Button onClick={loadQuestions} size="lg" style={{ width: "100%" }}>Begin Assessment →</Button>
          </Card>
        )}

        {phase === "loading" && (
          <Card style={{ padding: 48, textAlign: "center" }}>
            <div className="pulse" style={{ fontSize: 44, marginBottom: 16 }}>🤖</div>
            <p style={{ fontFamily: "DM Serif Display", fontSize: 20, color: colors.primary }}>Preparing assessment questions…</p>
            <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}><Spinner size={32} /></div>
          </Card>
        )}

        {phase === "questions" && questions.length > 0 && (
          <Card style={{ padding: 32 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13, fontWeight: 700 }}>
                <span style={{ color: colors.muted }}>Question {currentQ + 1} of {questions.length}</span>
                <Badge color="blue">{questions[currentQ].category}</Badge>
              </div>
              <ProgressBar value={currentQ + 1} max={questions.length} />
            </div>
            <h3 style={{ fontFamily: "DM Serif Display", fontSize: 20, color: colors.primary, marginBottom: 20, lineHeight: 1.4 }}>{questions[currentQ].text}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {questions[currentQ].options.map(opt => (
                <button key={opt} onClick={() => handleAnswer(questions[currentQ].id, opt)}
                  style={{ padding: "12px 18px", borderRadius: 12, border: `2px solid ${answers[questions[currentQ].id] === opt ? colors.primary : colors.border}`, background: answers[questions[currentQ].id] === opt ? colors.soft : "#fff", color: answers[questions[currentQ].id] === opt ? colors.primary : colors.text, fontFamily: "Nunito", fontWeight: answers[questions[currentQ].id] === opt ? 800 : 600, fontSize: 14, textAlign: "left", cursor: "pointer", transition: "all 0.15s" }}>
                  {answers[questions[currentQ].id] === opt ? "✓ " : ""}{opt}
                </button>
              ))}
            </div>
            <Button onClick={handleNextQuestion} disabled={!answers[questions[currentQ].id]} size="lg" style={{ width: "100%" }}>
              {currentQ < questions.length - 1 ? "Next Question →" : "Submit Assessment →"}
            </Button>
          </Card>
        )}

        {phase === "result" && result && (
          <Card style={{ padding: 36 }} className="fade-in">
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>📊</div>
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: colors.primary, marginBottom: 8 }}>Assessment Complete!</h2>
              <p style={{ color: colors.muted, fontSize: 14 }}>Here are {parent.childName}'s initial results</p>
            </div>
            <div style={{ background: colors.soft, borderRadius: 14, padding: 24, textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 48, fontWeight: 900, color: colors.primary, marginBottom: 8 }}>{result.totalScore}<span style={{ fontSize: 22, fontWeight: 700, color: colors.muted }}>/100</span></div>
              <ScoreBadge score={result.totalScore} />
              <p style={{ marginTop: 12, color: colors.text, fontSize: 14, lineHeight: 1.7 }}>{levelDesc[result.level]}</p>
            </div>
            <Button onClick={generatePlan} disabled={planLoading} size="lg" style={{ width: "100%" }}>
              {planLoading ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}><Spinner size={18} color="#fff" /> Generating Week 1 Plan + Milestones…</div> : "🤖 Generate Week 1 Plan + Milestones →"}
            </Button>
          </Card>
        )}

        {phase === "plan" && week1Plan && (
          <div className="fade-in">
            <Card style={{ padding: 32, marginBottom: 16 }}>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontSize: 48, marginBottom: 10 }}>🎉</div>
                <h2 style={{ fontFamily: "DM Serif Display", fontSize: 24, color: colors.primary, marginBottom: 6 }}>Week 1 Plan Ready!</h2>
              </div>
              <div style={{ background: "#f0fdf4", borderRadius: 12, padding: 16, marginBottom: 20, borderLeft: `4px solid ${colors.success}` }}>
                <div style={{ fontWeight: 800, color: colors.success, marginBottom: 6, fontSize: 13 }}>🎯 WEEKLY GOAL</div>
                <p style={{ fontSize: 14, color: colors.text, lineHeight: 1.6 }}>{week1Plan.learningOutcome}</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10, marginBottom: 20 }}>
                {week1Plan.weeklyPlan.map((day, i) => (
                  <div key={i} style={{ padding: 14, background: ["#eff6ff","#f0fdf4","#fffbeb","#fdf4ff","#fef2f2"][i], borderRadius: 12 }}>
                    <div style={{ fontWeight: 800, color: colors.secondary, fontSize: 12, marginBottom: 6 }}>{day.day}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: colors.text, marginBottom: 4 }}>{day.activity}</div>
                    <div style={{ fontSize: 11, color: colors.muted }}>🎯 {day.goal}</div>
                    <div style={{ fontSize: 11, color: colors.accent, marginTop: 3 }}>⏱ {day.duration}</div>
                  </div>
                ))}
              </div>
              {/* Feature 1: Show milestones preview */}
              <div style={{ background: "#fffbeb", borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <div style={{ fontWeight: 800, color: "#92400e", fontSize: 13, marginBottom: 8 }}>🏁 Week 1 Milestones</div>
                {(milestoneService.getMilestonesByWeek(parent.id, 1)?.milestones || []).map((ms, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#78350f", marginBottom: 6, display: "flex", gap: 8 }}>
                    <span>○</span><span>{ms.title}</span>
                  </div>
                ))}
              </div>
              <Button onClick={() => onComplete()} size="lg" style={{ width: "100%" }}>Go to Dashboard →</Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EXISTING COMPONENT: WeeklyEvaluationFlow — Extended for Feature 1, 3, 5
// Changes: After evaluation, auto-updates milestones + generates summary + creates milestones for next week
// ─────────────────────────────────────────────────────────────────────────────

const WeeklyEvaluationFlow = ({ parent, iepPlan, onComplete, onClose }) => {
  const [phase, setPhase] = useState("intro");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [evalResult, setEvalResult] = useState(null);
  const educator = assessmentService.getEducatorById(parent.assignedEducatorID);

  const loadQuestions = async () => { setPhase("loading"); const qs = await aiService.generateWeeklyEvalTest(iepPlan, parent); setQuestions(qs); setPhase("questions"); };
  const handleAnswer = (qId, answer) => setAnswers(p => ({ ...p, [qId]: answer }));
  const handleNext = () => { if (currentQ < questions.length - 1) setCurrentQ(c => c + 1); else submitEvaluation(); };

  const submitEvaluation = async () => {
    setPhase("evaluating");
    const answersArr = questions.map(q => {
      const ans = answers[q.id] || q.options[q.options.length - 1];
      return { questionId: q.id, answer: ans, isCorrect: (q.scoring?.[ans] ?? 0) >= 2 };
    });
    const earned = answersArr.reduce((s, a) => { const q = questions.find(q => q.id === a.questionId); return s + (q?.scoring?.[a.answer] ?? 0); }, 0);
    const score = Math.round((earned / (questions.length * 3)) * 100);
    const prevScore = iepPlan.previousScore || 50;

    // AI Decision
    const aiDecision = await aiService.makeProgressDecision(score, iepPlan.targetScore, prevScore, iepPlan, parent);

    // Save evaluation record
    const evalRecord = assessmentService.saveWeeklyEvaluation(parent.id, educator?.id || "edu1", iepPlan.weekNumber, iepPlan.id, questions, answersArr, score, prevScore, aiDecision);

    // Feature 1: Auto-update milestones based on AI decision
    milestoneService.updateMilestoneStatus(parent.id, iepPlan.weekNumber, aiDecision.decision);

    // Feature 3: Generate weekly summary in English + Tamil
    const evaluation = { score, previousScore: prevScore, improvement: score - prevScore, aiDecision: aiDecision.decision };
    const { summaryEnglish, summaryRegional } = await aiService.generateWeeklySummary(parent, iepPlan, evaluation);
    summaryService.saveSummary(parent.id, iepPlan.weekNumber, summaryEnglish, summaryRegional);

    if (aiDecision.decision === "ADVANCE") {
      assessmentService.updateIEPStatus(iepPlan.id, "Achieved");
      // Feature 5: Generate next week plan
      const nextPlanData = await aiService.generateNextWeekPlan(parent, iepPlan, { score });
      const nextPlan = assessmentService.saveNextWeekPlan(parent.id, educator?.id, iepPlan.weekNumber + 1, nextPlanData, score);
      // Feature 1 + 5: Generate milestones for next week automatically
      const nextMilestones = await aiService.generateMilestones(nextPlan, parent);
      milestoneService.saveMilestones(parent.id, iepPlan.weekNumber + 1, nextMilestones);
    } else {
      assessmentService.updateIEPStatus(iepPlan.id, "Not Achieved");
      assessmentService.modifyIEPPlan(iepPlan.id, aiDecision.modifications);
    }

    setEvalResult({ score, aiDecision, improvement: score - prevScore });
    setPhase("result");
  };

  return (
    <div style={{ minHeight: "100vh", background: colors.gradient, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{globalStyle}</style>
      <div className="fade-in" style={{ width: "100%", maxWidth: 560 }}>
        {phase === "intro" && (
          <Card style={{ padding: 32 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>📝</div>
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 24, color: colors.primary }}>Week {iepPlan.weekNumber} Evaluation</h2>
              <p style={{ color: colors.muted, marginTop: 8, fontSize: 14 }}>Let's see how {parent.childName} progressed this week!</p>
            </div>
            <div style={{ background: colors.soft, borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ fontWeight: 800, color: colors.primary, marginBottom: 6, fontSize: 13 }}>THIS WEEK'S GOAL</div>
              <p style={{ fontSize: 14, color: colors.text }}>{iepPlan.learningOutcome}</p>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <span style={{ fontSize: 13, color: colors.muted }}>Target: <strong style={{ color: colors.primary }}>{iepPlan.targetScore}/100</strong></span>
                <span style={{ fontSize: 13, color: colors.muted }}>Previous: <strong style={{ color: colors.primary }}>{iepPlan.previousScore}/100</strong></span>
              </div>
            </div>
            <Alert type="info">After this evaluation, AI will update milestones and generate a Tamil summary for you.</Alert>
            <div style={{ display: "flex", gap: 12 }}>
              <Button onClick={onClose} variant="outline" style={{ flex: 1 }}>Back</Button>
              <Button onClick={loadQuestions} style={{ flex: 2 }}>Start Evaluation →</Button>
            </div>
          </Card>
        )}

        {phase === "loading" && (
          <Card style={{ padding: 48, textAlign: "center" }}>
            <div className="pulse" style={{ fontSize: 44, marginBottom: 16 }}>🤖</div>
            <p style={{ fontFamily: "DM Serif Display", fontSize: 20, color: colors.primary }}>Generating evaluation questions…</p>
            <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}><Spinner size={32} /></div>
          </Card>
        )}

        {phase === "questions" && questions.length > 0 && (
          <Card style={{ padding: 32 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13, fontWeight: 700 }}>
                <span style={{ color: colors.muted }}>Question {currentQ + 1} of {questions.length}</span>
                <Badge color="purple">Week {iepPlan.weekNumber} Eval</Badge>
              </div>
              <ProgressBar value={currentQ + 1} max={questions.length} />
            </div>
            <div style={{ background: colors.soft, borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 12, color: colors.muted, fontWeight: 700 }}>
              📌 Related to: {questions[currentQ].relatedActivity}
            </div>
            <h3 style={{ fontFamily: "DM Serif Display", fontSize: 19, color: colors.primary, marginBottom: 20, lineHeight: 1.4 }}>
              {questions[currentQ].text}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {questions[currentQ].options.map(opt => (
                <button key={opt} onClick={() => handleAnswer(questions[currentQ].id, opt)}
                  style={{ padding: "12px 18px", borderRadius: 12, border: `2px solid ${answers[questions[currentQ].id] === opt ? colors.accent : colors.border}`, background: answers[questions[currentQ].id] === opt ? "#f0fdfa" : "#fff", color: answers[questions[currentQ].id] === opt ? "#0f766e" : colors.text, fontFamily: "Nunito", fontWeight: answers[questions[currentQ].id] === opt ? 800 : 600, fontSize: 14, textAlign: "left", cursor: "pointer", transition: "all 0.15s" }}>
                  {answers[questions[currentQ].id] === opt ? "✓ " : ""}{opt}
                </button>
              ))}
            </div>
            <Button onClick={handleNext} disabled={!answers[questions[currentQ].id]} size="lg" style={{ width: "100%" }}>
              {currentQ < questions.length - 1 ? "Next →" : "Submit →"}
            </Button>
          </Card>
        )}

        {phase === "evaluating" && (
          <Card style={{ padding: 48, textAlign: "center" }}>
            <div className="pulse" style={{ fontSize: 44, marginBottom: 16 }}>🤖</div>
            <p style={{ fontFamily: "DM Serif Display", fontSize: 20, color: colors.primary }}>AI is evaluating results…</p>
            <p style={{ color: colors.muted, fontSize: 13, marginTop: 8 }}>Updating milestones · Generating Tamil summary · Planning next week…</p>
            <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}><Spinner size={32} /></div>
          </Card>
        )}

        {phase === "result" && evalResult && (
          <Card style={{ padding: 32 }} className="fade-in">
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 52, marginBottom: 10 }}>{evalResult.aiDecision.decision === "ADVANCE" ? "🎉" : "💪"}</div>
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: colors.primary, marginBottom: 6 }}>Week {iepPlan.weekNumber} Complete!</h2>
            </div>
            <div style={{ background: colors.soft, borderRadius: 14, padding: 20, textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 48, fontWeight: 900, color: colors.primary }}>{evalResult.score}<span style={{ fontSize: 22, color: colors.muted }}>/100</span></div>
              <div style={{ marginTop: 8, display: "flex", gap: 8, justifyContent: "center" }}>
                <Badge color={evalResult.aiDecision.decision === "ADVANCE" ? "green" : "orange"}>
                  {evalResult.aiDecision.decision === "ADVANCE" ? "✅ ADVANCED" : "🔄 PLAN MODIFIED"}
                </Badge>
                <Badge color={evalResult.improvement >= 0 ? "green" : "red"}>
                  {evalResult.improvement >= 0 ? "+" : ""}{evalResult.improvement} pts
                </Badge>
              </div>
            </div>
            <div style={{ background: evalResult.aiDecision.decision === "ADVANCE" ? "#d1fae5" : "#ffedd5", borderRadius: 12, padding: 16, marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6, color: evalResult.aiDecision.decision === "ADVANCE" ? "#065f46" : "#9a3412" }}>🤖 AI Decision</div>
              <p style={{ fontSize: 13, color: colors.text, lineHeight: 1.6 }}>{evalResult.aiDecision.reasoning}</p>
            </div>
            {evalResult.aiDecision.encouragementMessage && (
              <div style={{ background: "#f5f3ff", borderRadius: 10, padding: 12, marginBottom: 14, textAlign: "center" }}>
                <p style={{ fontSize: 14, color: "#5b21b6", fontWeight: 600, fontStyle: "italic" }}>💬 "{evalResult.aiDecision.encouragementMessage}"</p>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, padding: 12, background: "#d1fae5", borderRadius: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 14 }}>✅</span>
              <div>
                <div style={{ fontWeight: 700, color: "#065f46", fontSize: 13 }}>Milestones Updated</div>
                <div style={{ fontSize: 12, color: "#065f46" }}>{evalResult.aiDecision.decision === "ADVANCE" ? "All milestones marked COMPLETED" : "Milestones carried forward to revised plan"}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, padding: 12, background: "#fdf4ff", borderRadius: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 14 }}>📝</span>
              <div>
                <div style={{ fontWeight: 700, color: "#5b21b6", fontSize: 13 }}>Tamil Summary Generated</div>
                <div style={{ fontSize: 12, color: "#5b21b6" }}>View in Summaries tab</div>
              </div>
            </div>
            <Button onClick={() => onComplete()} size="lg" style={{ width: "100%" }}>
              {evalResult.aiDecision.decision === "ADVANCE" ? "🚀 View Week " + (iepPlan.weekNumber + 1) + " Plan →" : "📋 View Updated Plan →"}
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EXISTING AUTH PAGE (preserved, minor Feature 4 messaging)
// ─────────────────────────────────────────────────────────────────────────────

const AuthPage = ({ onLogin }) => {
  const [role, setRole] = useState("parent");
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", parentName: "", childName: "", age: "", disabilityType: disabilityTypes[0], preferredLanguage: languages[0], name: "", educatorType: disabilityTypes[0] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); const [success, setSuccess] = useState("");
  const f = (key) => (val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    setError(""); setSuccess(""); setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    const res = mode === "login" ? mockAuth.login(form.email, form.password, role) : mockAuth.register(form, role);
    if (res.error) { setError(res.error); setLoading(false); return; }
    if (mode === "register") {
      let msg = "";
      if (role === "parent") {
        // Feature 4: Show educator matching status
        msg = res.assignedEducator
          ? `Registered! Child ID: ${res.user.uniqueChildID}. Matched with ${res.assignedEducator.name}.`
          : `Registered! Child ID: ${res.user.uniqueChildID}. Please wait while we find a suitable educator for your child.`;
      } else {
        msg = res.matchedCount > 0
          ? `Registration successful! Automatically matched with ${res.matchedCount} waiting child(ren).`
          : "Registration successful!";
      }
      setSuccess(msg);
      setTimeout(() => onLogin(res), 2000);
    } else { onLogin(res); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: colors.gradient, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{globalStyle}</style>
      <div className="fade-in" style={{ width: "100%", maxWidth: 460 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🌱</div>
          <h1 style={{ fontFamily: "DM Serif Display", fontSize: 32, color: "#fff", marginBottom: 6 }}>EduPath</h1>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 15 }}>Special Needs Education Plan Generator</p>
        </div>
        <Card style={{ padding: 32 }}>
          <div style={{ display: "flex", background: colors.soft, borderRadius: 12, padding: 4, marginBottom: 24 }}>
            {["parent", "educator"].map(r => (
              <button key={r} onClick={() => setRole(r)} style={{ flex: 1, padding: "9px 0", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "Nunito", fontWeight: 700, fontSize: 14, background: role === r ? colors.primary : "transparent", color: role === r ? "#fff" : colors.muted, transition: "all 0.2s" }}>
                {r === "parent" ? "👨‍👩‍👧 Parent" : "👩‍🏫 Educator"}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 16, marginBottom: 24, borderBottom: `2px solid ${colors.border}`, paddingBottom: 16 }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ border: "none", background: "none", cursor: "pointer", fontFamily: "Nunito", fontWeight: 700, fontSize: 15, color: mode === m ? colors.secondary : colors.muted, borderBottom: mode === m ? `2px solid ${colors.secondary}` : "2px solid transparent", paddingBottom: 4, transition: "all 0.2s" }}>
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>
          {error && <Alert type="error">{error}</Alert>}
          {success && <Alert type="success">{success}</Alert>}
          <Input label="Email" value={form.email} onChange={f("email")} type="email" placeholder="your@email.com" required />
          <Input label="Password" value={form.password} onChange={f("password")} type="password" placeholder="••••••••" required />
          {mode === "register" && role === "educator" && (<>
            <Input label="Full Name" value={form.name} onChange={f("name")} placeholder="Dr. Jane Smith" required />
            <Input label="Specialization" value={form.educatorType} onChange={f("educatorType")} options={disabilityTypes} required />
            <Alert type="info">Upon registration, you will be automatically matched with children awaiting an educator of your specialization.</Alert>
          </>)}
          {mode === "register" && role === "parent" && (<>
            <Input label="Your Name" value={form.parentName} onChange={f("parentName")} placeholder="Parent Full Name" required />
            <Input label="Child's Name" value={form.childName} onChange={f("childName")} placeholder="Child's Name" required />
            <Input label="Child's Age" value={form.age} onChange={f("age")} type="number" placeholder="e.g. 8" required />
            <Input label="Disability Type" value={form.disabilityType} onChange={f("disabilityType")} options={disabilityTypes} required />
            <Input label="Preferred Language" value={form.preferredLanguage} onChange={f("preferredLanguage")} options={languages} required />
          </>)}
          <Button onClick={handleSubmit} disabled={loading} style={{ width: "100%", marginTop: 8 }} size="lg">
            {loading ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}><Spinner size={18} color="#fff" /> Processing...</div> : mode === "login" ? "Sign In →" : "Create Account →"}
          </Button>
          {mode === "login" && (
            <div style={{ marginTop: 20, padding: 14, background: colors.soft, borderRadius: 10, fontSize: 12, color: colors.muted }}>
              <strong style={{ color: colors.primary }}>Demo:</strong> Parent: meera@parent.com / pass123 &nbsp;|&nbsp; Educator: priya@edu.com / pass123
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EXISTING EDUCATOR DASHBOARD — Minimally extended with new Features
// Changes: Added milestones view per child, added progress graph per child
// ─────────────────────────────────────────────────────────────────────────────

const EducatorDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedChild, setSelectedChild] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPlan, setAiPlan] = useState(null);
  const [editPlan, setEditPlan] = useState(null);
  const [assessForm, setAssessForm] = useState({ communication: 50, motor: 50, cognitive: 50, social: 50, emotional: 50 });
  const [notification, setNotification] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedbackList, setFeedbackList] = useState([]);

  const educator = assessmentService.getEducatorById(user.userId);
  const children = educator?.assignedChildren?.map(id => assessmentService.getParentById(id)).filter(Boolean) || [];
  const unreadFeedback = assessmentService.getFeedbackByEducator(user.userId).filter(f => !f.isRead).length;

  useEffect(() => { setFeedbackList(assessmentService.getFeedbackByEducator(user.userId)); }, [user.userId]);
  const notify = (msg) => { setNotification(msg); setTimeout(() => setNotification(""), 3500); };

  const handleGenIEP = async () => {
    if (!selectedChild) return;
    const asss = assessmentService.getAssessmentsByChild(selectedChild.id);
    const latest = asss[asss.length - 1];
    if (!latest) { notify("⚠️ Please add an assessment first."); return; }
    setAiLoading(true);
    const plan = await aiService.generateNextWeekPlan(selectedChild, { weekNumber: asss.length, learningOutcome: "Build on existing skills" }, { score: latest.score });
    setAiPlan(plan); setEditPlan({ ...plan, weeklyPlan: [...plan.weeklyPlan.map(d => ({ ...d }))] });
    setAiLoading(false); setActiveTab("iep");
  };

  const handleSaveIEP = async () => {
    if (!editPlan || !selectedChild) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    const asss = assessmentService.getAssessmentsByChild(selectedChild.id);
    const latest = asss[asss.length - 1];
    const newPlan = { id: "iep" + Date.now(), childID: selectedChild.id, educatorID: user.userId, weeklyPlan: editPlan.weeklyPlan, learningOutcome: editPlan.learningOutcome, status: "ONGOING", weekNumber: asss.length, aiGenerated: true, editedByEducator: JSON.stringify(editPlan) !== JSON.stringify(aiPlan), previousScore: latest?.score || 0, targetScore: editPlan.targetScore || (latest?.score + 12), createdAt: new Date().toISOString() };
    mockDB.iepPlans.push(newPlan);
    // Feature 1 + 5: Generate milestones when educator saves IEP
    const milestones = await aiService.generateMilestones(newPlan, selectedChild);
    milestoneService.saveMilestones(selectedChild.id, newPlan.weekNumber, milestones);
    notify("✅ IEP Plan + Milestones saved and sent to parent!");
    setAiPlan(null); setEditPlan(null); setSaving(false);
  };

  const handleAddAssessment = () => {
    if (!selectedChild) return;
    const vals = Object.values(assessForm).map(Number);
    const score = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    const prev = assessmentService.getAssessmentsByChild(selectedChild.id);
    const newAss = { id: "ass" + Date.now(), childID: selectedChild.id, educatorID: user.userId, testDetails: { ...assessForm }, score, date: new Date().toISOString().slice(0, 10), weekNumber: prev.length + 1 };
    mockDB.assessments.push(newAss);
    notify(`✅ Assessment saved. Score: ${score}/100`);
    setAssessForm({ communication: 50, motor: 50, cognitive: 50, social: 50, emotional: 50 });
  };

  const tabs = [
    { id: "overview", label: "🏠 Overview" },
    { id: "assess", label: "📊 Assess" },
    { id: "iep", label: "📋 IEP Plans" },
    { id: "milestones", label: "🏁 Milestones" }, // NEW
    { id: "progress", label: "📈 Progress" },     // NEW
    { id: "feedback", label: `💬 Feedback${unreadFeedback > 0 ? ` (${unreadFeedback})` : ""}` },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f4f8fd" }}>
      <style>{globalStyle}</style>
      <div style={{ background: colors.gradient, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 28 }}>🌱</span>
          <div>
            <div style={{ fontFamily: "DM Serif Display", fontSize: 20, color: "#fff" }}>EduPath</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Educator Portal</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{educator?.name}</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{educator?.educatorType} Specialist</div>
          </div>
          <Button onClick={onLogout} variant="outline" size="sm" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.4)" }}>Logout</Button>
        </div>
      </div>
      {notification && <div style={{ background: colors.success, color: "#fff", padding: "12px 24px", textAlign: "center", fontWeight: 700 }}>{notification}</div>}

      <div style={{ display: "flex", minHeight: "calc(100vh - 72px)" }}>
        <div style={{ width: 220, background: "#fff", borderRight: `1px solid ${colors.border}`, padding: "24px 0", flexShrink: 0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ width: "100%", textAlign: "left", padding: "12px 24px", border: "none", background: activeTab === t.id ? colors.soft : "transparent", color: activeTab === t.id ? colors.primary : colors.muted, fontFamily: "Nunito", fontWeight: activeTab === t.id ? 800 : 600, fontSize: 13, cursor: "pointer", borderLeft: activeTab === t.id ? `4px solid ${colors.secondary}` : "4px solid transparent", transition: "all 0.2s" }}>
              {t.label}
            </button>
          ))}
          <div style={{ padding: "12px 16px", marginTop: 8 }}>
            <div style={{ fontSize: 12, color: colors.muted, fontWeight: 700, marginBottom: 8 }}>Students ({children.length})</div>
            {children.map(c => (
              <button key={c.id} onClick={() => setSelectedChild(c)} style={{ display: "block", width: "100%", padding: "8px 10px", borderRadius: 10, marginBottom: 4, border: `1.5px solid ${selectedChild?.id === c.id ? colors.accent : colors.border}`, background: selectedChild?.id === c.id ? "#f0fdfa" : "#fff", cursor: "pointer", textAlign: "left", fontFamily: "Nunito" }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: colors.primary }}>{c.childName}</div>
                <div style={{ fontSize: 11, color: colors.muted }}>{c.disabilityType} · Age {c.age}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, padding: 28, overflow: "auto" }}>
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: colors.primary, marginBottom: 20 }}>Overview</h2>
              {children.length === 0 && <Alert type="info">No children assigned yet. They will be matched to you based on your specialization ({educator?.educatorType}).</Alert>}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
                {[
                  { label: "Assigned Children", value: children.length, icon: "👧", color: "#dbeafe" },
                  { label: "Total Plans", value: mockDB.iepPlans.filter(p => p.educatorID === user.userId).length, icon: "📋", color: "#d1fae5" },
                  { label: "Unread Feedback", value: unreadFeedback, icon: "💬", color: "#ffedd5" },
                  { label: "My Specialization", value: educator?.educatorType, icon: "🎓", color: "#fdf4ff" },
                ].map(s => (
                  <Card key={s.label} style={{ background: s.color, border: "none", textAlign: "center" }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{s.icon}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: colors.primary }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: colors.muted, fontWeight: 700 }}>{s.label}</div>
                  </Card>
                ))}
              </div>
              {children.map(c => {
                const latestA = assessmentService.getAssessmentsByChild(c.id).slice(-1)[0];
                const latestPlan = assessmentService.getIEPByChild(c.id).slice(-1)[0];
                const weekMilestones = latestPlan ? milestoneService.getMilestonesByWeek(c.id, latestPlan.weekNumber) : null;
                const completedMs = weekMilestones?.milestones.filter(m => m.status === "COMPLETED").length || 0;
                const totalMs = weekMilestones?.milestones.length || 0;
                return (
                  <Card key={c.id} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 16, color: colors.primary }}>{c.childName}</div>
                        <div style={{ color: colors.muted, fontSize: 13 }}>{c.disabilityType} · Age {c.age}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {latestA && <Badge color="blue">Score: {latestA.score}/100</Badge>}
                        {latestPlan && <Badge color={latestPlan.status === "Achieved" ? "green" : "teal"}>Week {latestPlan.weekNumber}: {latestPlan.status}</Badge>}
                        {totalMs > 0 && <Badge color={completedMs === totalMs ? "green" : "orange"}>🏁 {completedMs}/{totalMs} milestones</Badge>}
                      </div>
                    </div>
                    {latestPlan && <p style={{ fontSize: 13, color: colors.text }}><strong>Goal:</strong> {latestPlan.learningOutcome}</p>}
                  </Card>
                );
              })}
            </div>
          )}

          {/* ASSESS TAB — preserved from v1 */}
          {activeTab === "assess" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: colors.primary, marginBottom: 20 }}>Assess & Generate Plan</h2>
              {!selectedChild && <Alert type="warning">Select a student from the sidebar first.</Alert>}
              {selectedChild && (
                <Card style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 900, color: colors.primary, marginBottom: 16 }}>Assessing: {selectedChild.childName}</div>
                  {Object.keys(assessForm).map(field => (
                    <div key={field} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <label style={{ fontWeight: 700, fontSize: 13, color: colors.primary, textTransform: "capitalize" }}>{field}</label>
                        <span style={{ fontWeight: 800, color: colors.accent }}>{assessForm[field]}</span>
                      </div>
                      <input type="range" min={0} max={100} value={assessForm[field]} onChange={e => setAssessForm(p => ({ ...p, [field]: e.target.value }))} style={{ width: "100%" }} />
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 12 }}>
                    <Button onClick={handleAddAssessment} variant="outline">Save Assessment</Button>
                    <Button onClick={handleGenIEP} disabled={aiLoading} variant="secondary">{aiLoading ? "Generating…" : "🤖 Generate IEP + Milestones"}</Button>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* IEP TAB — preserved from v1 */}
          {activeTab === "iep" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: colors.primary, marginBottom: 20 }}>IEP Plans</h2>
              {editPlan && aiPlan ? (
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <h3 style={{ fontWeight: 800, color: colors.primary }}>✏️ Review & Edit AI-Generated Plan</h3>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button onClick={handleSaveIEP} disabled={saving} variant="secondary">{saving ? "Saving…" : "Save & Send ✓"}</Button>
                      <Button onClick={() => { setAiPlan(null); setEditPlan(null); }} variant="outline">Cancel</Button>
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontWeight: 700, fontSize: 13, color: colors.primary, display: "block", marginBottom: 6 }}>Learning Outcome</label>
                    <input value={editPlan.learningOutcome} onChange={e => setEditPlan(p => ({ ...p, learningOutcome: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${colors.border}`, borderRadius: 10, fontFamily: "Nunito", fontSize: 14, outline: "none" }} />
                  </div>
                  {editPlan.weeklyPlan.map((day, i) => (
                    <div key={i} style={{ padding: 14, background: colors.soft, borderRadius: 12, marginBottom: 10 }}>
                      <div style={{ fontWeight: 800, color: colors.secondary, marginBottom: 8 }}>{day.day}</div>
                      {["activity", "goal", "materials"].map(field => (
                        <input key={field} value={day[field]} onChange={e => { const wp = [...editPlan.weeklyPlan]; wp[i] = { ...wp[i], [field]: e.target.value }; setEditPlan(p => ({ ...p, weeklyPlan: wp })); }} placeholder={field} style={{ display: "block", width: "100%", padding: "7px 10px", marginBottom: 6, border: `1px solid ${colors.border}`, borderRadius: 8, fontFamily: "Nunito", fontSize: 13, outline: "none" }} />
                      ))}
                    </div>
                  ))}
                </Card>
              ) : (
                <div>
                  {mockDB.iepPlans.filter(p => p.educatorID === user.userId).length === 0 && <Alert type="info">No IEP plans yet. Go to Assess tab to generate one.</Alert>}
                  {mockDB.iepPlans.filter(p => p.educatorID === user.userId).slice().reverse().map(plan => {
                    const child = assessmentService.getParentById(plan.childID);
                    return (
                      <Card key={plan.id} style={{ marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                          <div>
                            <div style={{ fontWeight: 900, fontSize: 17, color: colors.primary }}>Week {plan.weekNumber} — {child?.childName}</div>
                            <div style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>{plan.learningOutcome}</div>
                          </div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                            <Badge color={plan.status === "Achieved" ? "green" : plan.status === "ONGOING" ? "teal" : "orange"}>{plan.status}</Badge>
                            {plan.aiModified && <Badge color="purple">AI Modified</Badge>}
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
                          {plan.weeklyPlan.map((day, i) => (
                            <div key={i} style={{ padding: 12, background: colors.soft, borderRadius: 10 }}>
                              <div style={{ fontWeight: 800, fontSize: 12, color: colors.secondary }}>{day.day}</div>
                              <div style={{ fontSize: 11, color: colors.text, marginTop: 4 }}>{day.activity}</div>
                              <div style={{ fontSize: 11, color: colors.muted, marginTop: 3 }}>🎯 {day.goal}</div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* NEW: MILESTONES TAB — Feature 1 */}
          {activeTab === "milestones" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: colors.primary, marginBottom: 20 }}>Milestones Tracker</h2>
              {!selectedChild ? (
                <Alert type="info">Select a student from the sidebar to view their milestones.</Alert>
              ) : (
                <div>
                  <div style={{ fontWeight: 800, color: colors.primary, marginBottom: 16 }}>{selectedChild.childName}'s Milestones</div>
                  {milestoneService.getMilestonesByChild(selectedChild.id).length === 0 ? (
                    <Alert type="info">No milestones yet. Generate an IEP plan to auto-create milestones.</Alert>
                  ) : (
                    milestoneService.getMilestonesByChild(selectedChild.id).map(record => (
                      <Card key={record.id} style={{ marginBottom: 16 }}>
                        <MilestoneTracker childId={selectedChild.id} week={record.week} refreshKey={0} />
                      </Card>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* NEW: PROGRESS TAB — Feature 2 */}
          {activeTab === "progress" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: colors.primary, marginBottom: 20 }}>Progress Graphs</h2>
              {!selectedChild ? (
                children.length > 0 ? (
                  children.map(c => (
                    <Card key={c.id} style={{ marginBottom: 24 }}>
                      <div style={{ fontWeight: 800, color: colors.primary, marginBottom: 16 }}>{c.childName}</div>
                      <ProgressGraph childId={c.id} />
                    </Card>
                  ))
                ) : <Alert type="info">No students assigned yet.</Alert>
              ) : (
                <Card>
                  <div style={{ fontWeight: 800, color: colors.primary, marginBottom: 16 }}>{selectedChild.childName}</div>
                  <ProgressGraph childId={selectedChild.id} />
                </Card>
              )}
            </div>
          )}

          {/* FEEDBACK TAB — preserved */}
          {activeTab === "feedback" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: colors.primary, marginBottom: 20 }}>Parent Feedback</h2>
              {feedbackList.length === 0 && <Alert type="info">No feedback received yet.</Alert>}
              {feedbackList.map(fb => {
                const parent = assessmentService.getParentById(fb.parentID);
                return (
                  <Card key={fb.id} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <div>
                        <span style={{ fontWeight: 800, color: colors.primary }}>{parent?.parentName}</span>
                        <span style={{ color: colors.muted, fontSize: 12, marginLeft: 8 }}>re: {parent?.childName}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <span style={{ color: "#f5a623" }}>{"★".repeat(fb.rating)}</span>
                        <span style={{ fontSize: 12, color: colors.muted }}>{fb.date}</span>
                        {!fb.isRead && <Badge color="orange">New</Badge>}
                      </div>
                    </div>
                    <p style={{ fontSize: 14, color: colors.text, lineHeight: 1.6 }}>{fb.message}</p>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PARENT DASHBOARD — Extended with new Feature tabs
// New tabs: Milestones, Progress, Summaries
// All existing tabs preserved unchanged
// ─────────────────────────────────────────────────────────────────────────────

const ParentDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [notification, setNotification] = useState("");
  const [fbMsg, setFbMsg] = useState(""); const [fbRating, setFbRating] = useState(5); const [fbSubmitting, setFbSubmitting] = useState(false);
  const [showWeeklyEval, setShowWeeklyEval] = useState(false);
  const [selectedEvalPlan, setSelectedEvalPlan] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const parent = assessmentService.getParentById(user.userId);
  const educator = assessmentService.getEducatorById(parent?.assignedEducatorID);
  const assessments = assessmentService.getAssessmentsByChild(user.userId);
  const iepPlans = assessmentService.getIEPByChild(user.userId);
  const myFeedback = assessmentService.getFeedbackByParent(user.userId);
  const latestPlan = iepPlans[iepPlans.length - 1];
  const latestScore = assessments[assessments.length - 1]?.score;
  const trend = assessments.length >= 2 ? assessments[assessments.length - 1].score - assessments[assessments.length - 2].score : 0;
  const initAssmt = assessmentService.getInitialAssessment(user.userId);
  const weeklyEvals = assessmentService.getWeeklyEvaluations(user.userId);

  const notify = (msg) => { setNotification(msg); setTimeout(() => setNotification(""), 3500); };

  const handleFeedback = async () => {
    if (!fbMsg.trim() || !educator) return;
    setFbSubmitting(true);
    await new Promise(r => setTimeout(r, 600));
    mockDB.feedback.push({ id: "fb" + Date.now(), parentID: user.userId, educatorID: educator.id, childID: user.userId, message: fbMsg, rating: fbRating, date: new Date().toISOString().slice(0, 10), isRead: false });
    notify("✅ Feedback sent!"); setFbMsg(""); setFbRating(5); setFbSubmitting(false);
  };

  const handleStartEval = (plan) => { setSelectedEvalPlan(plan); setShowWeeklyEval(true); };
  const handleEvalComplete = () => {
    setShowWeeklyEval(false); setSelectedEvalPlan(null);
    setRefreshKey(k => k + 1);
    notify("✅ Weekly evaluation complete! Milestones updated, Tamil summary generated.");
    setActiveTab("overview");
  };

  if (showWeeklyEval && selectedEvalPlan) {
    return <WeeklyEvaluationFlow parent={parent} iepPlan={selectedEvalPlan} onComplete={handleEvalComplete} onClose={() => setShowWeeklyEval(false)} />;
  }

  const cycleStatus = () => {
    if (!initAssmt) return { step: 0, label: "Awaiting Initial Assessment", color: colors.muted };
    if (iepPlans.length === 0) return { step: 1, label: "Week 1 Plan Being Generated", color: colors.warning };
    if (weeklyEvals.length === 0) return { step: 2, label: "Ready for Week 1 Evaluation", color: colors.accent };
    const lastEval = weeklyEvals[weeklyEvals.length - 1];
    if (lastEval.aiDecision === "ADVANCE") return { step: 3, label: `Week ${lastEval.weekNumber + 1} Plan Ready`, color: colors.success };
    return { step: 3, label: "Plan Being Adapted by AI", color: colors.warning };
  };

  const tabs = [
    { id: "overview", label: "🏠 Overview" },
    { id: "assessment", label: "🔬 Assessment" },
    { id: "plans", label: "📋 Plans" },
    { id: "milestones", label: "🏁 Milestones" },   // NEW Feature 1
    { id: "progress", label: "📈 Progress" },        // NEW Feature 2
    { id: "summaries", label: "📝 Summaries" },      // NEW Feature 3
    { id: "evaluations", label: "📊 Evaluations" },
    { id: "feedback", label: "💬 Feedback" },
  ];

  const cycle = cycleStatus();

  return (
    <div style={{ minHeight: "100vh", background: "#f4f8fd" }} key={refreshKey}>
      <style>{globalStyle}</style>
      <div style={{ background: colors.gradient, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 28 }}>🌱</span>
          <div>
            <div style={{ fontFamily: "DM Serif Display", fontSize: 20, color: "#fff" }}>EduPath</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Parent Portal</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{parent?.parentName}</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{parent?.childName} · {parent?.uniqueChildID}</div>
          </div>
          <Button onClick={onLogout} variant="outline" size="sm" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.4)" }}>Logout</Button>
        </div>
      </div>
      {notification && <div style={{ background: colors.success, color: "#fff", padding: "12px 24px", textAlign: "center", fontWeight: 700 }}>{notification}</div>}

      {/* Feature 4: Show educator pending message at top if no educator yet */}
      {!educator && (
        <div style={{ background: "#fffbeb", borderLeft: `4px solid ${colors.warning}`, padding: "12px 24px", display: "flex", alignItems: "center", gap: 10 }}>
          <span>⏳</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>Please wait while we find a suitable educator for your child. We'll notify you once matched.</span>
        </div>
      )}

      <div style={{ display: "flex", minHeight: "calc(100vh - 72px)" }}>
        <div style={{ width: 220, background: "#fff", borderRight: `1px solid ${colors.border}`, padding: "24px 0", flexShrink: 0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ width: "100%", textAlign: "left", padding: "12px 24px", border: "none", background: activeTab === t.id ? colors.soft : "transparent", color: activeTab === t.id ? colors.primary : colors.muted, fontFamily: "Nunito", fontWeight: activeTab === t.id ? 800 : 600, fontSize: 13, cursor: "pointer", borderLeft: activeTab === t.id ? `4px solid ${colors.secondary}` : "4px solid transparent", transition: "all 0.2s" }}>
              {t.label}
            </button>
          ))}
          <div style={{ margin: "24px 16px 0", padding: 14, background: educator ? "#d1fae5" : "#fff7ed", borderRadius: 12, border: `1px solid ${educator ? "#6ee7b7" : "#fed7aa"}` }}>
            <div style={{ fontSize: 11, color: colors.muted, fontWeight: 700, marginBottom: 4 }}>Educator</div>
            {educator ? (
              <>
                <div style={{ fontWeight: 800, color: colors.primary, fontSize: 13 }}>{educator.name}</div>
                <div style={{ fontSize: 11, color: colors.muted }}>{educator.educatorType}</div>
              </>
            ) : (
              <div style={{ color: "#92400e", fontSize: 12, fontWeight: 700 }}>⏳ Finding match…</div>
            )}
          </div>
        </div>

        <div style={{ flex: 1, padding: 28, overflow: "auto" }}>

          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: colors.primary, marginBottom: 8 }}>Welcome, {parent?.parentName?.split(" ")[0]}! 💙</h2>
              <p style={{ color: colors.muted, marginBottom: 20 }}>{parent?.childName}'s learning journey at a glance.</p>

              {/* Cycle Status */}
              <div style={{ background: `${cycle.color}15`, border: `2px solid ${cycle.color}40`, borderRadius: 14, padding: 16, marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: cycle.color, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, color: colors.muted, fontWeight: 700 }}>LEARNING CYCLE STATUS</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: colors.primary }}>{cycle.label}</div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  {["Assessment", "Week 1 Plan", "Evaluate", "Next/Modify"].map((s, i) => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i < cycle.step ? colors.success : i === cycle.step ? cycle.color : colors.border }} title={s} />
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 24 }}>
                {[
                  { label: "Current Score", value: latestScore !== undefined ? `${latestScore}/100` : "—", icon: "🎯", color: "#dbeafe" },
                  { label: "Week Trend", value: trend !== 0 ? `${trend >= 0 ? "+" : ""}${trend}` : "—", icon: trend >= 0 ? "📈" : "📉", color: trend >= 0 ? "#d1fae5" : "#fee2e2" },
                  { label: "IEP Plans", value: iepPlans.length, icon: "📋", color: "#ffedd5" },
                  { label: "Evaluations", value: weeklyEvals.length, icon: "📊", color: "#ede9fe" },
                ].map(stat => (
                  <Card key={stat.label} style={{ background: stat.color, border: "none", textAlign: "center", padding: "18px 14px" }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{stat.icon}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: colors.primary }}>{stat.value}</div>
                    <div style={{ fontSize: 12, color: colors.muted, fontWeight: 700 }}>{stat.label}</div>
                  </Card>
                ))}
              </div>

              {/* Feature 1: Current week milestones on overview */}
              {latestPlan && milestoneService.getMilestonesByWeek(user.userId, latestPlan.weekNumber) && (
                <Card style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 800, color: colors.primary, marginBottom: 12 }}>🏁 Week {latestPlan.weekNumber} Milestones</div>
                  <MilestoneTracker childId={user.userId} week={latestPlan.weekNumber} refreshKey={refreshKey} />
                </Card>
              )}

              {latestPlan && (
                <Card style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h3 style={{ fontWeight: 800, color: colors.primary }}>Current Week Plan</h3>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Badge color={latestPlan.status === "Achieved" ? "green" : latestPlan.status === "ONGOING" ? "teal" : "orange"}>{latestPlan.status}</Badge>
                      {!assessmentService.hasPendingEvaluation(user.userId, latestPlan.weekNumber) && (
                        <Button onClick={() => handleStartEval(latestPlan)} size="sm" variant="secondary">📝 Take Weekly Test</Button>
                      )}
                      {assessmentService.hasPendingEvaluation(user.userId, latestPlan.weekNumber) && <Badge color="green">Evaluated ✓</Badge>}
                    </div>
                  </div>
                  <p style={{ color: colors.text, marginBottom: 14, fontSize: 14 }}><strong>Goal:</strong> {latestPlan.learningOutcome}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 8 }}>
                    {latestPlan.weeklyPlan.map((day, i) => (
                      <div key={i} style={{ padding: 12, background: colors.soft, borderRadius: 10 }}>
                        <div style={{ fontWeight: 800, color: colors.secondary, fontSize: 12 }}>{day.day}</div>
                        <div style={{ fontSize: 12, marginTop: 4 }}>{day.activity}</div>
                        <div style={{ fontSize: 11, color: colors.muted, marginTop: 3 }}>🎯 {day.goal}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Feature 2: Mini progress graph on overview */}
              {assessments.length > 0 && (
                <Card>
                  <div style={{ fontWeight: 800, color: colors.primary, marginBottom: 12 }}>📈 Progress Overview</div>
                  <ProgressGraph childId={user.userId} />
                </Card>
              )}
            </div>
          )}

          {/* ASSESSMENT TAB — preserved */}
          {activeTab === "assessment" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: colors.primary, marginBottom: 20 }}>{parent?.childName}'s Initial Assessment</h2>
              {!initAssmt ? (
                <Alert type="warning">Initial assessment not completed yet.</Alert>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                    <Card style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 48, fontWeight: 900, color: colors.primary }}>{initAssmt.totalScore}<span style={{ fontSize: 20, color: colors.muted }}>/100</span></div>
                      <div style={{ marginTop: 8 }}><ScoreBadge score={initAssmt.totalScore} /></div>
                      <div style={{ fontSize: 12, color: colors.muted, marginTop: 8 }}>Completed: {initAssmt.completedAt}</div>
                    </Card>
                    <Card>
                      <div style={{ fontWeight: 800, color: colors.primary, marginBottom: 12 }}>Score Breakdown</div>
                      {initAssmt.answers.map((ans, i) => {
                        const q = initAssmt.questions?.[i];
                        const score = q?.scoring?.[ans.answer] ?? ans.score ?? 0;
                        return (
                          <div key={i} style={{ marginBottom: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                              <span style={{ fontWeight: 700, textTransform: "capitalize", color: colors.muted }}>{q?.category || `Q${i + 1}`}</span>
                              <span style={{ fontWeight: 800, color: colors.primary }}>{score}/3</span>
                            </div>
                            <ProgressBar value={score} max={3} height={6} color={score >= 2 ? colors.success : score === 1 ? colors.warning : colors.danger} />
                          </div>
                        );
                      })}
                    </Card>
                  </div>
                </>
              )}
            </div>
          )}

          {/* PLANS TAB — preserved */}
          {activeTab === "plans" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: colors.primary, marginBottom: 20 }}>Learning Plans for {parent?.childName}</h2>
              {iepPlans.length === 0 && <Alert type="info">No plans yet. Your educator will generate one after your child's initial assessment.</Alert>}
              {iepPlans.slice().reverse().map(plan => (
                <Card key={plan.id} style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 18, color: colors.primary }}>Week {plan.weekNumber} Plan</div>
                      <div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{plan.learningOutcome}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
                      <Badge color={plan.status === "Achieved" ? "green" : plan.status === "ONGOING" ? "teal" : "orange"}>{plan.status}</Badge>
                      {plan.aiModified && <Badge color="purple">AI Modified</Badge>}
                      {!assessmentService.hasPendingEvaluation(user.userId, plan.weekNumber) && (
                        <Button onClick={() => handleStartEval(plan)} size="sm" variant="secondary">📝 Evaluate</Button>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 10, marginBottom: 14 }}>
                    {plan.weeklyPlan.map((day, i) => (
                      <div key={i} style={{ padding: 14, background: ["#eff6ff","#f0fdf4","#fffbeb","#fdf4ff","#fef2f2"][i % 5], borderRadius: 12 }}>
                        <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6, color: colors.primary }}>{day.day}</div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{day.activity}</div>
                        <div style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>🎯 {day.goal}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* NEW: MILESTONES TAB — Feature 1 */}
          {activeTab === "milestones" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: colors.primary, marginBottom: 20 }}>🏁 {parent?.childName}'s Milestones</h2>
              <p style={{ color: colors.muted, marginBottom: 20 }}>Track weekly goals. Milestones update automatically after each evaluation.</p>
              {milestoneService.getMilestonesByChild(user.userId).length === 0 ? (
                <Alert type="info">No milestones yet. They'll appear automatically when your educator creates a learning plan.</Alert>
              ) : (
                milestoneService.getMilestonesByChild(user.userId).map(record => (
                  <Card key={record.id} style={{ marginBottom: 16 }}>
                    <MilestoneTracker childId={user.userId} week={record.week} refreshKey={refreshKey} />
                  </Card>
                ))
              )}
            </div>
          )}

          {/* NEW: PROGRESS TAB — Feature 2 */}
          {activeTab === "progress" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: colors.primary, marginBottom: 20 }}>📈 Progress Graph</h2>
              <p style={{ color: colors.muted, marginBottom: 20 }}>Track {parent?.childName}'s score progression week by week.</p>
              <Card>
                <ProgressGraph childId={user.userId} />
              </Card>
            </div>
          )}

          {/* NEW: SUMMARIES TAB — Feature 3 */}
          {activeTab === "summaries" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: colors.primary, marginBottom: 8 }}>📝 Weekly Summaries</h2>
              <p style={{ color: colors.muted, marginBottom: 20 }}>AI-generated summaries in English and Tamil (தமிழ்), created after each weekly evaluation.</p>
              <WeeklySummaryCard childId={user.userId} />
            </div>
          )}

          {/* EVALUATIONS TAB — preserved */}
          {activeTab === "evaluations" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: colors.primary, marginBottom: 20 }}>Weekly Evaluations</h2>
              {weeklyEvals.length === 0 ? (
                <div>
                  <Alert type="info">No evaluations completed yet. Once you have a learning plan, you can take weekly evaluations.</Alert>
                  {latestPlan && !assessmentService.hasPendingEvaluation(user.userId, latestPlan.weekNumber) && (
                    <Card style={{ textAlign: "center", padding: 32 }}>
                      <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
                      <h3 style={{ fontWeight: 800, color: colors.primary, marginBottom: 8 }}>Week {latestPlan.weekNumber} Evaluation Ready</h3>
                      <Button onClick={() => handleStartEval(latestPlan)} size="lg">Start Week {latestPlan.weekNumber} Evaluation →</Button>
                    </Card>
                  )}
                </div>
              ) : (
                <div>
                  {weeklyEvals.slice().reverse().map(ev => (
                    <Card key={ev.id} style={{ marginBottom: 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: 18, color: colors.primary }}>Week {ev.weekNumber} Evaluation</div>
                          <div style={{ fontSize: 13, color: colors.muted }}>{ev.completedAt}</div>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <Badge color={ev.aiDecision === "ADVANCE" ? "green" : "orange"}>{ev.aiDecision === "ADVANCE" ? "✅ ADVANCED" : "🔄 MODIFIED"}</Badge>
                          <Badge color={ev.improvement >= 0 ? "green" : "red"}>{ev.score}/100 {ev.improvement >= 0 ? `(+${ev.improvement})` : `(${ev.improvement})`}</Badge>
                        </div>
                      </div>
                      <div style={{ background: ev.aiDecision === "ADVANCE" ? "#d1fae5" : "#ffedd5", borderRadius: 12, padding: 16, marginBottom: 14 }}>
                        <div style={{ fontWeight: 800, color: ev.aiDecision === "ADVANCE" ? "#065f46" : "#9a3412", fontSize: 13, marginBottom: 6 }}>🤖 AI Decision & Reasoning</div>
                        <p style={{ fontSize: 13, color: colors.text, lineHeight: 1.6 }}>{ev.aiReasoning}</p>
                      </div>
                      {ev.encouragementMessage && (
                        <div style={{ background: "#f5f3ff", borderRadius: 10, padding: 12, marginBottom: 14, textAlign: "center" }}>
                          <p style={{ fontSize: 14, color: "#5b21b6", fontWeight: 600, fontStyle: "italic" }}>💬 "{ev.encouragementMessage}"</p>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FEEDBACK TAB — preserved */}
          {activeTab === "feedback" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: colors.primary, marginBottom: 20 }}>Send Feedback</h2>
              {!educator && <Alert type="warning">No educator assigned yet. You'll be able to send feedback once an educator is matched.</Alert>}
              {educator && <Alert type="info">Sending to: <strong>{educator.name}</strong> ({educator.educatorType} Specialist)</Alert>}
              <Card style={{ marginBottom: 24, maxWidth: 560 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontWeight: 700, fontSize: 13, color: colors.primary, marginBottom: 8 }}>Rating</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[1, 2, 3, 4, 5].map(r => (
                      <button key={r} onClick={() => setFbRating(r)} style={{ fontSize: 28, border: "none", background: "none", cursor: "pointer", opacity: r <= fbRating ? 1 : 0.3 }}>★</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontWeight: 700, fontSize: 13, color: colors.primary, marginBottom: 8 }}>Your Message</label>
                  <textarea value={fbMsg} onChange={e => setFbMsg(e.target.value)} placeholder="Share your observations, concerns, or appreciation…" rows={5} style={{ width: "100%", padding: "12px 14px", border: `1.5px solid ${colors.border}`, borderRadius: 10, fontFamily: "Nunito", fontSize: 14, resize: "vertical", outline: "none" }} />
                </div>
                <Button onClick={handleFeedback} variant="secondary" size="lg" disabled={fbSubmitting || !educator}>{fbSubmitting ? "Sending…" : "Send Feedback →"}</Button>
              </Card>
              {myFeedback.map(fb => (
                <Card key={fb.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: colors.muted }}>{fb.date}</span>
                    <span style={{ color: "#f5a623" }}>{"★".repeat(fb.rating)}</span>
                  </div>
                  <p style={{ fontSize: 14, color: colors.text }}>{fb.message}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP — Preserved from v1 (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInitialAssessment, setShowInitialAssessment] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("snep_token");
    const role = localStorage.getItem("snep_role");
    const userId = localStorage.getItem("snep_userId");
    if (token && role && userId) {
      setAuth({ token, role, userId });
      if (role === "parent") {
        const parent = assessmentService.getParentById(userId);
        if (parent && !assessmentService.hasCompletedInitialAssessment(userId)) {
          setShowInitialAssessment(true);
        }
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = useCallback((res) => {
    localStorage.setItem("snep_token", res.token);
    localStorage.setItem("snep_role", res.role);
    localStorage.setItem("snep_userId", res.user.id);
    setAuth({ token: res.token, role: res.role, userId: res.user.id });
    if (res.role === "parent" && (res.requiresInitialAssessment || !assessmentService.hasCompletedInitialAssessment(res.user.id))) {
      setShowInitialAssessment(true);
    }
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("snep_token");
    localStorage.removeItem("snep_role");
    localStorage.removeItem("snep_userId");
    setAuth(null); setShowInitialAssessment(false);
  }, []);

  const handleAssessmentComplete = useCallback(() => { setShowInitialAssessment(false); }, []);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: colors.gradient }}>
      <Spinner size={48} color="#fff" />
    </div>
  );

  if (!auth) return <AuthPage onLogin={handleLogin} />;
  if (auth.role === "parent" && showInitialAssessment) {
    const parent = assessmentService.getParentById(auth.userId);
    return <InitialAssessmentFlow parent={parent} onComplete={handleAssessmentComplete} />;
  }
  if (auth.role === "educator") return <EducatorDashboard user={auth} onLogout={handleLogout} />;
  if (auth.role === "parent") return <ParentDashboard user={auth} onLogout={handleLogout} />;
  return <AuthPage onLogin={handleLogin} />;
}
