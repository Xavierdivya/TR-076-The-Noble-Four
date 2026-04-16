/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║  EduPath — v4  (Special Needs Education Plan Generator)                      ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  WHAT'S NEW IN v4                                                             ║
 * ║  ✅ Grade mapping EXTENDED: Age 5–17 → Grade 1–12                            ║
 * ║  ✅ Subjects defined for ALL 12 grades (Grade 1 through Grade 12)            ║
 * ║  ✅ LANGUAGE BUG FIXED: Only Tamil & English shown (others were broken)      ║
 * ║     Root cause: API returned garbled/English text for Hindi/Telugu/etc.      ║
 * ║     Fix: SUPPORTED_LANGUAGES trimmed to ["English","Tamil"] only.            ║
 * ║     Summary generation now asks only for en+ta, fallbacks are reliable.     ║
 * ║  ✅ Multi-Domain Assessment (IQ · Cognitive · Motor · Communication)         ║
 * ║  ✅ Dynamic IEP Generation (grade-aligned, ability-modified)                 ║
 * ║  ✅ MongoDB-ready schemas (User · Assessment · EducationPlan)                ║
 * ║  ✅ isNewUser flow: assessment gate before dashboard                         ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  PRESERVED FROM v3                                                            ║
 * ║  ✅ Milestones Tracking  ✅ Progress Graph (Recharts)                        ║
 * ║  ✅ Weekly Evaluation Loop (ADVANCE / MODIFY)                                ║
 * ║  ✅ Educator Assignment by Specialization                                    ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  BACKEND ARCHITECTURE (Express + MongoDB) — inline documentation             ║
 * ║  POST /api/assessment      — save multi-domain scores, compute overallLevel  ║
 * ║  GET  /api/education-plan/:userId — grade-aligned IEP for user               ║
 * ║  GET  /api/progress/:userId       — week-by-week score history               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 1 — CURRICULUM ENGINE  (/services/curriculumService.js)
// Age → Grade → Subjects. Extended to Grade 12 per request.
// Reference: NCEO (National Center on Educational Outcomes)
// ════════════════════════════════════════════════════════════════════════════════

const curriculumEngine = {
  /**
   * Age → Grade mapping (Indian school norms, extended to Grade 12).
   * Age 5–6 → 1 | 6–7 → 2 | 7–8 → 3 | 8–9 → 4 | 9–10 → 5 | 10–11 → 6
   * 11–12 → 7 | 12–13 → 8 | 13–14 → 9 | 14–15 → 10 | 15–16 → 11 | 16–17 → 12
   */
  getGradeFromAge: (age) => {
    const n = parseInt(age, 10);
    if (n <= 5)  return 1;
    if (n >= 17) return 12;
    // age maps to grade = age - 4 (age 6 → grade 2, age 7 → grade 3, …, age 16 → grade 12)
    const map = { 5: 1, 6: 2, 7: 3, 8: 4, 9: 5, 10: 6, 11: 7, 12: 8, 13: 9, 14: 10, 15: 11, 16: 12 };
    return map[n] ?? Math.max(1, Math.min(12, n - 4));
  },

  /** Age-range label for display. */
  getAgeRangeForGrade: (grade) => {
    const ranges = {
      1: "Age 5–6",  2: "Age 6–7",  3: "Age 7–8",  4: "Age 8–9",
      5: "Age 9–10", 6: "Age 10–11", 7: "Age 11–12", 8: "Age 12–13",
      9: "Age 13–14", 10: "Age 14–15", 11: "Age 15–16", 12: "Age 16–17",
    };
    return ranges[grade] ?? "Age unknown";
  },

  /**
   * Grade → Subjects with curriculum focus descriptor.
   * All 12 grades defined as required.
   */
  getSubjectsForGrade: (grade) => {
    const curriculum = {
      1: { label: "Grade 1", subjects: [
        { name: "Language Arts",         icon: "📖", focus: "Phonics, letter recognition, simple words" },
        { name: "Mathematics",           icon: "🔢", focus: "Counting 1–20, basic shapes, patterns" },
        { name: "Environmental Studies", icon: "🌿", focus: "My body, family, home, surroundings" },
        { name: "Art & Craft",           icon: "🎨", focus: "Drawing, colouring, basic motor skills" },
      ]},
      2: { label: "Grade 2", subjects: [
        { name: "Language Arts",         icon: "📖", focus: "Reading simple sentences, basic writing" },
        { name: "Mathematics",           icon: "🔢", focus: "Addition, subtraction up to 100" },
        { name: "Environmental Studies", icon: "🌿", focus: "Plants, animals, seasons, community" },
        { name: "Art & Craft",           icon: "🎨", focus: "Creative drawing, clay modelling" },
      ]},
      3: { label: "Grade 3", subjects: [
        { name: "English",       icon: "📖", focus: "Reading paragraphs, composition writing" },
        { name: "Mathematics",   icon: "🔢", focus: "Multiplication, division, fractions" },
        { name: "Science",       icon: "🔬", focus: "Living/non-living, food, water, air" },
        { name: "Social Studies",icon: "🌏", focus: "Maps, community helpers, festivals" },
      ]},
      4: { label: "Grade 4", subjects: [
        { name: "English",       icon: "📖", focus: "Essay writing, comprehension, grammar" },
        { name: "Mathematics",   icon: "🔢", focus: "Large numbers, geometry, measurement" },
        { name: "Science",       icon: "🔬", focus: "Plants, animals, matter, simple machines" },
        { name: "Social Science",icon: "🌏", focus: "History, civics, geography basics" },
      ]},
      5: { label: "Grade 5", subjects: [
        { name: "Mathematics",   icon: "🔢", focus: "Decimals, percentages, area, perimeter" },
        { name: "Science",       icon: "🔬", focus: "Human body, ecosystems, forces, light" },
        { name: "English",       icon: "📖", focus: "Literature, formal writing, vocabulary" },
        { name: "Social Science",icon: "🌏", focus: "Ancient civilisations, Indian geography" },
      ]},
      6: { label: "Grade 6", subjects: [
        { name: "Mathematics",    icon: "🔢", focus: "Integers, algebra basics, ratio, proportion" },
        { name: "Science",        icon: "🔬", focus: "Cells, tissues, electricity, materials" },
        { name: "English",        icon: "📖", focus: "Literature analysis, report writing, debate" },
        { name: "Social Science", icon: "🌏", focus: "Medieval history, economic geography" },
        { name: "Computer Basics",icon: "💻", focus: "Digital literacy, MS Office basics" },
      ]},
      7: { label: "Grade 7", subjects: [
        { name: "Mathematics",    icon: "🔢", focus: "Linear equations, triangles, data handling" },
        { name: "Science",        icon: "🔬", focus: "Nutrition, heat, acids/bases, weather" },
        { name: "English",        icon: "📖", focus: "Poetry analysis, letter writing, grammar" },
        { name: "Social Science", icon: "🌏", focus: "Medieval India, state governments, resources" },
        { name: "Computer Science",icon: "💻", focus: "Basics of programming, internet, spreadsheets" },
      ]},
      8: { label: "Grade 8", subjects: [
        { name: "Mathematics",    icon: "🔢", focus: "Rational numbers, factorisation, graphs" },
        { name: "Science",        icon: "🔬", focus: "Crop production, microbes, friction, sound" },
        { name: "English",        icon: "📖", focus: "Short stories, descriptive writing, speech" },
        { name: "Social Science", icon: "🌏", focus: "Modern India, industry, landforms" },
        { name: "Computer Science",icon: "💻", focus: "HTML basics, Python introduction" },
      ]},
      9: { label: "Grade 9", subjects: [
        { name: "Mathematics",    icon: "🔢", focus: "Polynomials, coordinate geometry, statistics" },
        { name: "Science",        icon: "🔬", focus: "Matter, atoms, motion, living organisms" },
        { name: "English",        icon: "📖", focus: "Novel study, formal essays, public speaking" },
        { name: "Social Science", icon: "🌏", focus: "French Revolution, democracy, economics" },
        { name: "Computer Science",icon: "💻", focus: "Python basics, algorithms, number systems" },
      ]},
      10: { label: "Grade 10", subjects: [
        { name: "Mathematics",    icon: "🔢", focus: "Real numbers, trigonometry, probability" },
        { name: "Science",        icon: "🔬", focus: "Chemical reactions, electricity, heredity" },
        { name: "English",        icon: "📖", focus: "Board-level writing, comprehension, grammar" },
        { name: "Social Science", icon: "🌏", focus: "Nationalism, democracy, development" },
        { name: "Computer Science",icon: "💻", focus: "SQL, Python OOP, cybersecurity basics" },
      ]},
      11: { label: "Grade 11", subjects: [
        { name: "Mathematics",    icon: "🔢", focus: "Sets, relations, trigonometry, limits" },
        { name: "Physics",        icon: "⚛️", focus: "Kinematics, laws of motion, thermodynamics" },
        { name: "Chemistry",      icon: "🧪", focus: "Atomic structure, periodic table, bonding" },
        { name: "English",        icon: "📖", focus: "Advanced comprehension, literary analysis" },
        { name: "Computer Science",icon: "💻", focus: "Python advanced, data structures, DBMS" },
      ]},
      12: { label: "Grade 12", subjects: [
        { name: "Mathematics",    icon: "🔢", focus: "Calculus, vectors, linear programming" },
        { name: "Physics",        icon: "⚛️", focus: "Electromagnetism, optics, modern physics" },
        { name: "Chemistry",      icon: "🧪", focus: "Electrochemistry, polymers, biomolecules" },
        { name: "English",        icon: "📖", focus: "Board essays, creative writing, debate" },
        { name: "Computer Science",icon: "💻", focus: "Python projects, networking, web dev basics" },
      ]},
    };
    return curriculum[grade] ?? curriculum[5];
  },

  /**
   * Returns IEP modification descriptor for a given ability level.
   * LOW = highly simplified; MEDIUM = modified; HIGH = near grade-level
   */
  getSubjectModifications: (level) => ({
    LOW:    { approach: "Highly simplified, concrete, multisensory",        accommodation: "Extended time, visual supports, 1:1 support",          goal_prefix: "With maximum support, the student will" },
    MEDIUM: { approach: "Simplified content with peer support",             accommodation: "Modified assignments, visual organizers, extra time",    goal_prefix: "With moderate support, the student will" },
    HIGH:   { approach: "Grade-level content with minor modifications",      accommodation: "Preferential seating, check-ins, assistive tech",       goal_prefix: "Independently, the student will" },
  }[level] ?? { approach: "Scaffolded instruction", accommodation: "Visual supports", goal_prefix: "With support, the student will" }),
};

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 2 — LANGUAGE ENGINE  (/services/translationService.js)
//
// ⚠️  LANGUAGE BUG FIX (v3 → v4)
// ─────────────────────────────────────────────────────────────────────────────
// Problem in v3: The UI showed 6 language options (EN, TA, HI, TE, ML, KN).
// The API prompt asked Claude to return JSON with all 6 keys.
// In practice, only "en" and "ta" keys returned correct content.
// The other 4 keys were either:
//   - Returned in English (model refused/fell back silently)
//   - Returned garbled Unicode that displayed as boxes
//   - Omitted entirely (JSON key missing), causing "undefined" in UI
//
// Fix applied in v4:
//   1. SUPPORTED_LANGUAGES now contains ONLY English and Tamil.
//   2. Registration form only offers these two choices.
//   3. The summary prompt asks for en + ta ONLY — this is reliable.
//   4. Fallback strings are correct and tested for both languages.
//   5. WeeklySummaryCard only renders EN/TA toggle buttons.
//
// If more languages are needed in future, add a dedicated translation
// pass using a separate API call per language, not a single JSON prompt.
// ────────────────────────────────────────────────────────────────────────────
const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧", nativeName: "English" },
  { code: "ta", label: "Tamil",   flag: "🇮🇳", nativeName: "தமிழ்"  },
];

const languageEngine = {
  /** Build prompt that asks for ONLY en + ta (reliable). */
  buildSummaryPrompt: (childData, iepPlan, evaluation) => `You are a special education summary writer fluent in English and Tamil (தமிழ்).

Generate a warm, encouraging weekly learning summary in BOTH English AND Tamil.

Child: ${childData.childName}, Age ${childData.age}, ${childData.disabilityType}
Week: ${iepPlan?.weekNumber ?? 1}
Score: ${evaluation.score}/100
Improvement: ${evaluation.improvement >= 0 ? "+" : ""}${evaluation.improvement}
Decision: ${evaluation.aiDecision}
Goal: ${iepPlan?.learningOutcome ?? "Learning and development"}

Write 2–3 warm, encouraging sentences per language. Parents should feel motivated.
Return ONLY valid JSON — no markdown fences, no extra keys:
{
  "en": "English summary here...",
  "ta": "தமிழ் சுருக்கம் இங்கே..."
}`,

  /** Reliable fallbacks for en + ta. */
  getFallbackSummaries: (childData, iepPlan, evaluation) => {
    const n = childData.childName, w = iepPlan?.weekNumber ?? 1, s = evaluation.score;
    const adv = evaluation.aiDecision === "ADVANCE";
    return {
      en: `${n} completed Week ${w} with a score of ${s}/100. ${adv ? "Wonderful progress — moving to next week's plan!" : "Keep practising — the plan has been thoughtfully adapted for continued growth."}`,
      ta: `${n} ${w}-வது வாரத்தை ${s}/100 மதிப்பெண்ணுடன் முடித்தார். ${adv ? "அருமையான முன்னேற்றம் — அடுத்த வார திட்டத்திற்கு நகர்கிறோம்!" : "தொடர்ந்து பயிற்சி செய்யுங்கள் — திட்டம் மாற்றி அமைக்கப்பட்டுள்ளது."}`,
    };
  },

  getLangCode: (label) => SUPPORTED_LANGUAGES.find(l => l.label === label)?.code ?? "en",
};

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 3 — MOCK DATABASE  (MongoDB-ready schemas)
// ════════════════════════════════════════════════════════════════════════════════

let mockDB = {
  /**
   * MongoDB: educators collection
   * { _id, name, email, password, educatorType, assignedChildren[] }
   */
  educators: [
    { id: "edu1", name: "Dr. Priya Sharma",  email: "priya@edu.com",  password: "pass123", educatorType: "Autism",                 assignedChildren: ["par1"] },
    { id: "edu2", name: "Mr. Rahul Verma",   email: "rahul@edu.com",  password: "pass123", educatorType: "ADHD",                   assignedChildren: ["par2"] },
    { id: "edu3", name: "Ms. Anita Nair",    email: "anita@edu.com",  password: "pass123", educatorType: "Intellectual Disability", assignedChildren: [] },
    { id: "edu4", name: "Dr. Sunita Patel",  email: "sunita@edu.com", password: "pass123", educatorType: "Down Syndrome",          assignedChildren: [] },
  ],

  /**
   * MongoDB: users collection  (User Schema)
   * {
   *   _id, parentName, childName, age, disabilityType,
   *   email, password,
   *   preferredLanguage: "English" | "Tamil",   ← v4: only 2 options
   *   uniqueChildID, assignedEducatorID,
   *   isNewUser: Boolean,
   *   initialAssessmentDone: Boolean,
   *   gradeLevel: Number,                        ← computed from age
   * }
   */
  parents: [
    { id: "par1", parentName: "Meera Krishnan", childName: "Arjun", age: 8,  disabilityType: "Autism",                 email: "meera@parent.com",   password: "pass123", preferredLanguage: "Tamil",   uniqueChildID: "CHILD-001001", assignedEducatorID: "edu1", isNewUser: false, initialAssessmentDone: true,  gradeLevel: 4 },
    { id: "par2", parentName: "Suresh Gupta",   childName: "Riya",  age: 10, disabilityType: "ADHD",                   email: "suresh@parent.com",  password: "pass123", preferredLanguage: "English", uniqueChildID: "CHILD-002002", assignedEducatorID: "edu2", isNewUser: false, initialAssessmentDone: false, gradeLevel: 6 },
    { id: "par3", parentName: "Lakshmi Iyer",   childName: "Kiran", age: 7,  disabilityType: "Down Syndrome",          email: "lakshmi@parent.com", password: "pass123", preferredLanguage: "Tamil",   uniqueChildID: "CHILD-003003", assignedEducatorID: null,   isNewUser: true,  initialAssessmentDone: false, gradeLevel: 3 },
    { id: "par4", parentName: "Anand Rajan",    childName: "Divya", age: 14, disabilityType: "Intellectual Disability", email: "anand@parent.com",   password: "pass123", preferredLanguage: "Tamil",   uniqueChildID: "CHILD-004004", assignedEducatorID: "edu3", isNewUser: false, initialAssessmentDone: true,  gradeLevel: 10 },
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
        { day: "Monday",    activity: "Picture card communication exercise", goal: "Identify 5 new objects",          materials: "Picture cards, tablet" },
        { day: "Tuesday",   activity: "Fine motor bead threading",           goal: "Thread 10 beads independently",   materials: "Beads, string" },
        { day: "Wednesday", activity: "Social story reading",                goal: "Understand turn-taking",          materials: "Social story book" },
        { day: "Thursday",  activity: "Sensory play – sand tray",           goal: "Tolerate tactile input 10 min",   materials: "Sand tray, toys" },
        { day: "Friday",    activity: "Peer interaction role play",          goal: "Initiate 3 interactions",         materials: "Role play props" },
      ],
      learningOutcome: "Improve communication and social initiation by 15%",
      status: "Achieved", weekNumber: 1, aiGenerated: true, editedByEducator: true, previousScore: 41, targetScore: 55,
    },
  ],

  feedback: [
    { id: "fb1", parentID: "par1", educatorID: "edu1", childID: "par1", message: "Arjun has been using picture cards at home!", rating: 5, date: "2024-01-14", isRead: true },
    { id: "fb2", parentID: "par2", educatorID: "edu2", childID: "par2", message: "Riya is more focused now. Great techniques!", rating: 4, date: "2024-01-16", isRead: false },
  ],

  initialAssessments: [
    {
      id: "ia1", childId: "par1", totalScore: 41, level: "LOW",
      disabilityType: "Autism", age: 8, completedAt: "2024-01-07", week1PlanGenerated: true,
      answers: [
        { questionId: "q1", answer: "Sometimes",       score: 1 },
        { questionId: "q2", answer: "With help",       score: 1 },
        { questionId: "q3", answer: "Rarely",          score: 0 },
        { questionId: "q4", answer: "Needs prompting", score: 1 },
        { questionId: "q5", answer: "No",              score: 0 },
      ],
    },
  ],

  weeklyEvaluations: [],

  milestones: [
    {
      id: "ms1", childId: "par1", week: 1,
      milestones: [
        { title: "Use picture cards to name 5 objects",  description: "Child identifies objects via picture-to-object matching", status: "COMPLETED" },
        { title: "Thread 10 beads independently",        description: "Fine motor activity without adult hand-over-hand",        status: "COMPLETED" },
        { title: "Initiate 3 peer interactions",         description: "Child begins play without prompting",                     status: "PENDING" },
      ],
    },
  ],

  /**
   * MongoDB: weeklySummaries collection
   * v4 FIX: only "en" and "ta" keys are stored and displayed.
   */
  weeklySummaries: [
    {
      id: "ws1", childId: "par1", week: 1,
      summaries: {
        en: "Arjun had an excellent first week! He successfully completed picture card activities and made great progress in fine motor skills. Communication improved by 20%.",
        ta: "அர்ஜுன் முதல் வாரத்தில் சிறப்பாக செயல்பட்டான்! படம் பார்க்கும் செயல்பாடுகளில் வெற்றிகரமாக பங்கேற்றான். தகவல் தொடர்பு 20% மேம்பட்டுள்ளது.",
      },
      createdAt: "2024-01-14",
    },
  ],

  /**
   * MongoDB: multiDomainAssessments collection  (Assessment Schema)
   * POST /api/assessment
   * {
   *   _id, userId,
   *   iqScore: Number (0–100),
   *   cognitiveScore: Number (0–100),
   *   motorScore: Number (0–100),
   *   communicationScore: Number (0–100),
   *   overallLevel: "LOW" | "MEDIUM" | "HIGH",
   *   completedAt: Date,
   * }
   */
  multiDomainAssessments: [
    {
      id: "mda1", userId: "par1",
      iqScore: 42, cognitiveScore: 38, motorScore: 55, communicationScore: 35,
      overallLevel: "LOW",
      breakdown: {
        iq:            { patternRecognition: 40, logicalReasoning: 45, memory: 40 },
        cognitive:     { attentionSpan: 35, problemSolving: 38, followInstructions: 42 },
        motor:         { fineMotor: 55, grossMotor: 55 },
        communication: { speechClarity: 30, vocabulary: 38, languageUnderstanding: 38 },
      },
      completedAt: "2024-01-07",
    },
    {
      id: "mda4", userId: "par4",
      iqScore: 35, cognitiveScore: 30, motorScore: 45, communicationScore: 28,
      overallLevel: "LOW",
      breakdown: {
        iq:            { patternRecognition: 30, logicalReasoning: 35, memory: 40 },
        cognitive:     { attentionSpan: 28, problemSolving: 30, followInstructions: 32 },
        motor:         { fineMotor: 45, grossMotor: 45 },
        communication: { speechClarity: 25, vocabulary: 30, languageUnderstanding: 28 },
      },
      completedAt: "2024-01-07",
    },
  ],

  /**
   * MongoDB: educationPlans collection  (EducationPlan Schema)
   * GET /api/education-plan/:userId
   * {
   *   _id, userId, gradeLevel, subjects[], goals{academic,functional},
   *   recommendations[], accommodations[], generatedAt,
   * }
   */
  educationPlans: [
    {
      id: "ep1", userId: "par1",
      gradeLevel: 4, gradeLabel: "Grade 4", overallLevel: "LOW",
      subjects: [
        { name: "English",        icon: "📖", gradeGoal: "Essay writing, comprehension",   modifiedGoal: "Identify 10 sight words, form 3-word sentences with picture support" },
        { name: "Mathematics",    icon: "🔢", gradeGoal: "Large numbers, geometry",        modifiedGoal: "Count objects up to 20, identify circles and squares with visual aids" },
        { name: "Science",        icon: "🔬", gradeGoal: "Plants, animals, matter",        modifiedGoal: "Name 5 common animals, identify living vs non-living with real objects" },
        { name: "Social Science", icon: "🌏", gradeGoal: "History, civics, geography",    modifiedGoal: "Identify family members, home, school on picture cards" },
      ],
      goals: {
        academic:   ["Recognise and read 20 sight words independently", "Count and write numbers 1–20 with minimal support", "Identify 5 animals and their habitats using visual aids"],
        functional: ["Follow 2-step verbal instructions in daily activities", "Communicate basic needs using picture cards or AAC", "Participate in 10-minute structured group activity"],
      },
      recommendations: ["Use visual schedules for all transitions", "Embed sensory breaks every 20 minutes", "Provide fidget tools during seated tasks", "Use positive reinforcement immediately after task completion"],
      accommodations:  ["Extended time (2×) for all assessments", "Preferential seating near the teacher", "Modified worksheets with reduced items and larger font", "AAC device access at all times"],
      generatedAt: "2024-01-08",
    },
    {
      id: "ep4", userId: "par4",
      gradeLevel: 10, gradeLabel: "Grade 10", overallLevel: "LOW",
      subjects: [
        { name: "Mathematics",    icon: "🔢", gradeGoal: "Real numbers, trigonometry",         modifiedGoal: "Count, add & subtract 2-digit numbers with number line support" },
        { name: "Science",        icon: "🔬", gradeGoal: "Chemical reactions, electricity",     modifiedGoal: "Identify safe/unsafe materials; basic cause-effect in nature" },
        { name: "English",        icon: "📖", gradeGoal: "Board-level writing, comprehension",  modifiedGoal: "Read simple passages, answer picture-based questions" },
        { name: "Social Science", icon: "🌏", gradeGoal: "Nationalism, democracy",             modifiedGoal: "Know own address, name of state/country, basic civic rules" },
      ],
      goals: {
        academic:   ["Recognise numbers 1–50 with visual supports", "Read and comprehend 2-sentence instructions", "Identify 5 everyday science concepts using concrete materials"],
        functional: ["Follow a 4-step visual daily schedule independently", "Express preferences using a communication board", "Participate in age-appropriate group activities for 15 minutes"],
      },
      recommendations: ["High-interest, real-world materials tied to Grade 10 themes", "Peer buddy support for classroom participation", "Break complex tasks into single-step visual instructions"],
      accommodations:  ["Oral assessment option for all subjects", "Extended time (3×) for all tasks", "Separate quiet room with minimal distractions", "Personal AAC/tablet with subject-specific vocabulary"],
      generatedAt: "2024-01-08",
    },
  ],
};

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 4 — AI SERVICE  (/services/aiService.js)
// All Claude API calls. Modular — each function maps to one API operation.
// ════════════════════════════════════════════════════════════════════════════════

const _callClaude = async (prompt, maxTokens = 1200) => {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  const text = (data.content ?? []).map(b => b.text ?? "").join("");
  return JSON.parse(text.replace(/```json|```/g, "").trim());
};

const aiService = {

  // ── Initial 6-question assessment (legacy quick-start flow) ──────────────

  generateInitialTest: async (age, disabilityType) => {
    const prompt = `Special education expert. Generate 6 parent-reported assessment questions for a ${age}-year-old child with ${disabilityType}. Categories: communication, motor, cognitive, social, emotional, daily living. Return ONLY valid JSON: {"questions":[{"id":"q1","category":"communication","text":"...","options":["A","B","C","D"],"scoring":{"A":3,"B":2,"C":1,"D":0}}]}`;
    try { return (await _callClaude(prompt)).questions; }
    catch { return aiService._fallbackInitialQuestions(age, disabilityType); }
  },

  evaluateInitialAssessment: (answers, questions) => {
    const totalPossible = questions.length * 3;
    const earned = answers.reduce((sum, a) => { const q = questions.find(q => q.id === a.questionId); return sum + (q?.scoring?.[a.answer] ?? a.score ?? 0); }, 0);
    const totalScore = Math.round((earned / totalPossible) * 100);
    return { totalScore, level: totalScore < 40 ? "LOW" : totalScore < 70 ? "MEDIUM" : "HIGH" };
  },

  // ── Week 1 plan generation ─────────────────────────────────────────────────

  generateWeek1Plan: async (childData, score, level) => {
    const grade = curriculumEngine.getGradeFromAge(childData.age);
    const gradeInfo = curriculumEngine.getSubjectsForGrade(grade);
    const prompt = `Special education curriculum designer. Generate Week 1 learning plan.
Child: ${childData.childName}, Age ${childData.age}, ${childData.disabilityType}, Score: ${score}/100, Level: ${level}, ${gradeInfo.label}
Grade subjects: ${gradeInfo.subjects.map(s => s.name).join(", ")}
Return ONLY valid JSON: {"weeklyPlan":[{"day":"Monday","activity":"...","goal":"...","materials":"...","duration":"30 min"},{"day":"Tuesday","activity":"...","goal":"...","materials":"...","duration":"30 min"},{"day":"Wednesday","activity":"...","goal":"...","materials":"...","duration":"30 min"},{"day":"Thursday","activity":"...","goal":"...","materials":"...","duration":"30 min"},{"day":"Friday","activity":"...","goal":"...","materials":"...","duration":"30 min"}],"learningOutcome":"...","expectedOutcomes":["..."],"strategies":["..."],"parentTips":["..."],"targetScore":${Math.min(score + 15, 100)}}`;
    try { return await _callClaude(prompt); }
    catch { return aiService._fallbackWeek1Plan(childData, score, level); }
  },

  // ── Weekly evaluation questions ────────────────────────────────────────────

  generateWeeklyEvalTest: async (iepPlan, childData) => {
    const acts = iepPlan.weeklyPlan.map(d => `${d.day}: ${d.activity} (Goal: ${d.goal})`).join("\n");
    const prompt = `Generate 5-question end-of-week evaluation. Child: ${childData.childName}, Age ${childData.age}, ${childData.disabilityType}. Week ${iepPlan.weekNumber} Activities:\n${acts}\nReturn ONLY valid JSON: {"questions":[{"id":"eq1","category":"goal_achievement","text":"...","options":["Always (4+ times)","Often (2-3 times)","Sometimes (1 time)","Not yet"],"scoring":{"Always (4+ times)":3,"Often (2-3 times)":2,"Sometimes (1 time)":1,"Not yet":0},"relatedActivity":"Monday"}]}`;
    try { return (await _callClaude(prompt, 800)).questions; }
    catch { return aiService._fallbackEvalQuestions(iepPlan); }
  },

  // ── ADVANCE / MODIFY decision ─────────────────────────────────────────────

  makeProgressDecision: async (score, targetScore, previousScore, iepPlan, childData) => {
    const achieved = score >= targetScore;
    const prompt = `Special education AI. Decision: Child ${childData.childName}, ${childData.disabilityType}, Age ${childData.age}. Score: ${score}/100, Target: ${targetScore}/100, Previous: ${previousScore}/100. Goal: ${iepPlan.learningOutcome}. ADVANCE if score>=target, MODIFY if below. Return ONLY JSON: {"decision":"ADVANCE","reasoning":"...","modifications":[],"nextWeekHints":["..."],"encouragementMessage":"..."}`;
    try { return await _callClaude(prompt, 600); }
    catch {
      return {
        decision: achieved ? "ADVANCE" : "MODIFY",
        reasoning: achieved ? `${childData.childName} achieved target ${targetScore}. Moving to next week.` : `${childData.childName} scored ${score} vs target ${targetScore}. Plan will be adapted.`,
        modifications: achieved ? [] : ["Reduce complexity by 20%", "Add more repetition", "Introduce visual supports"],
        nextWeekHints: achieved ? ["Build on successes", "Introduce slightly more complexity"] : [],
        encouragementMessage: achieved ? `Wonderful progress! ${childData.childName} is ready for the next challenge.` : `Every step counts! ${childData.childName} is working hard — keep going!`,
      };
    }
  },

  // ── Next-week plan generation ─────────────────────────────────────────────

  generateNextWeekPlan: async (childData, currentPlan, evaluation) => {
    const gradeInfo = curriculumEngine.getSubjectsForGrade(curriculumEngine.getGradeFromAge(childData.age));
    const prompt = `Special education curriculum. Week ${currentPlan.weekNumber + 1} plan for ${childData.childName}, Age ${childData.age}, ${childData.disabilityType}, ${gradeInfo.label}. Previous score: ${evaluation.score}/100. Return ONLY valid JSON: {"weeklyPlan":[{"day":"Monday","activity":"...","goal":"...","materials":"...","duration":"30 min"},{"day":"Tuesday","activity":"...","goal":"...","materials":"...","duration":"30 min"},{"day":"Wednesday","activity":"...","goal":"...","materials":"...","duration":"30 min"},{"day":"Thursday","activity":"...","goal":"...","materials":"...","duration":"30 min"},{"day":"Friday","activity":"...","goal":"...","materials":"...","duration":"30 min"}],"learningOutcome":"...","expectedOutcomes":["..."],"strategies":["..."],"parentTips":["..."],"targetScore":${Math.min(evaluation.score + 12, 100)}}`;
    try { return await _callClaude(prompt); }
    catch { return aiService._fallbackWeek1Plan(childData, evaluation.score, evaluation.score >= 70 ? "HIGH" : "MEDIUM"); }
  },

  // ── Milestone generation ──────────────────────────────────────────────────

  generateMilestones: async (iepPlan, childData) => {
    const prompt = `Special education milestones. Define 3–5 observable milestones for week ${iepPlan.weekNumber}. Child: ${childData.childName}, ${childData.disabilityType}. Goals: ${iepPlan.weeklyPlan.map(d => d.goal).join("; ")}. Return ONLY JSON: {"milestones":[{"title":"...","description":"..."}]}`;
    try {
      const parsed = await _callClaude(prompt, 600);
      return parsed.milestones.map(m => ({ ...m, status: "PENDING" }));
    } catch {
      return iepPlan.weeklyPlan.slice(0, 3).map(day => ({ title: day.goal, description: `Complete: ${day.activity}`, status: "PENDING" }));
    }
  },

  // ── v4: Weekly summary in EN + TA only (language bug fix) ────────────────

  generateSummary: async (childData, iepPlan, evaluation) => {
    const prompt = languageEngine.buildSummaryPrompt(childData, iepPlan, evaluation);
    try { return await _callClaude(prompt); }
    catch { return languageEngine.getFallbackSummaries(childData, iepPlan, evaluation); }
  },

  // ── v4: Multi-domain assessment question generation ───────────────────────
  /**
   * POST /api/assessment — generates the 4-domain question set for the
   * new-user assessment flow.
   * Domains: IQ (patternRecognition, logicalReasoning, memory)
   *          Cognitive (attentionSpan, problemSolving, followInstructions)
   *          Motor (fineMotor, grossMotor — slider type)
   *          Communication (speechClarity, vocabulary, languageUnderstanding)
   */
  generateMultiDomainTest: async (age, disabilityType) => {
    const prompt = `You are a special education assessment expert.
Generate a comprehensive multi-domain assessment for a ${age}-year-old child with ${disabilityType}.

Domains and sub-skills:
1. IQ: patternRecognition, logicalReasoning, memory  → MCQ (options map to 3/2/1/0)
2. Cognitive: attentionSpan, problemSolving, followInstructions  → MCQ
3. Motor: fineMotor, grossMotor  → slider (parent rates 0–100)
4. Communication: speechClarity, vocabulary, languageUnderstanding  → MCQ

Make questions parent-reportable (observable at home). Keep language simple.
Return ONLY valid JSON:
{
  "domains": {
    "iq":            { "label": "IQ & Reasoning",  "icon": "🧠", "questions": [{"id":"iq1","sub":"patternRecognition","type":"mcq","text":"...","options":["...","...","...","..."],"scoring":{"option_text":3,...}},...] },
    "cognitive":     { "label": "Cognitive Skills", "icon": "💡", "questions": [{"id":"cg1",...},...] },
    "motor":         { "label": "Motor Skills",     "icon": "✋", "questions": [{"id":"mt1","sub":"fineMotor","type":"slider","text":"Rate your child's fine motor ability (writing, drawing, using utensils)","min":0,"max":100},{"id":"mt2","sub":"grossMotor","type":"slider","text":"Rate your child's gross motor ability (running, jumping, coordination)","min":0,"max":100}] },
    "communication": { "label": "Communication",    "icon": "💬", "questions": [{"id":"cm1",...},...] }
  }
}`;
    try { return (await _callClaude(prompt, 2000)).domains; }
    catch { return aiService._fallbackMultiDomainTest(age, disabilityType); }
  },

  /**
   * Calculates domain scores and overall level from assessment answers.
   * Mirrors POST /api/assessment server-side logic.
   */
  evaluateMultiDomainAssessment: (answers, domains) => {
    const domainScores = {};
    let totalPoints = 0, totalMax = 0;
    Object.entries(domains).forEach(([key, domain]) => {
      let dp = 0, dm = 0;
      domain.questions.forEach(q => {
        if (q.type === "slider") { dp += (answers[q.id] ?? 50); dm += 100; }
        else { dp += (q.scoring?.[answers[q.id]] ?? 0); dm += 3; }
      });
      domainScores[key] = Math.round((dp / dm) * 100);
      totalPoints += dp; totalMax += dm;
    });
    const overallScore = Math.round((totalPoints / totalMax) * 100);
    return { domainScores, overallScore, overallLevel: overallScore < 40 ? "LOW" : overallScore < 70 ? "MEDIUM" : "HIGH" };
  },

  /**
   * Generates the full IEP from multi-domain results.
   * GET /api/education-plan/:userId server-side IEP generation logic.
   */
  generateIEP: async (childData, multiDomainResult) => {
    const grade = curriculumEngine.getGradeFromAge(childData.age);
    const gradeInfo = curriculumEngine.getSubjectsForGrade(grade);
    const { domainScores, overallScore, overallLevel } = multiDomainResult;

    const prompt = `You are an IEP (Individualized Education Plan) specialist.
Generate a comprehensive, grade-aligned IEP.

Child: ${childData.childName}, Age ${childData.age}, ${childData.disabilityType}
Grade: ${gradeInfo.label}
Assessment Results:
- IQ Score: ${domainScores.iq ?? 50}/100
- Cognitive Score: ${domainScores.cognitive ?? 50}/100
- Motor Score: ${domainScores.motor ?? 50}/100
- Communication Score: ${domainScores.communication ?? 50}/100
- Overall Level: ${overallLevel}

${gradeInfo.label} subjects: ${gradeInfo.subjects.map(s => `${s.name} (${s.focus})`).join("; ")}

Requirements:
1. Modified subject goals — grade-level content adapted to ${overallLevel} ability
2. 3 academic goals + 3 functional goals
3. 4 teaching recommendations
4. 4 classroom accommodations

Return ONLY valid JSON:
{
  "subjects": [{"name":"...","icon":"emoji","gradeGoal":"...","modifiedGoal":"..."}],
  "goals": {"academic":["...","...","..."],"functional":["...","...","..."]},
  "recommendations": ["...","...","...","..."],
  "accommodations":  ["...","...","...","..."]
}`;
    try {
      const parsed = await _callClaude(prompt, 1500);
      return { gradeLevel: grade, gradeLabel: gradeInfo.label, overallLevel, overallScore, ...parsed, generatedAt: new Date().toISOString() };
    } catch {
      return aiService._fallbackIEP(childData, grade, gradeInfo, overallLevel, domainScores);
    }
  },

  // ── Fallbacks ──────────────────────────────────────────────────────────────

  _fallbackMultiDomainTest: (age, disabilityType) => ({
    iq: {
      label: "IQ & Reasoning", icon: "🧠",
      questions: [
        { id: "iq1", sub: "patternRecognition", type: "mcq", text: "Can your child complete a simple 4-piece puzzle without help?", options: ["Yes, easily", "With some help", "With a lot of help", "Not yet"], scoring: { "Yes, easily": 3, "With some help": 2, "With a lot of help": 1, "Not yet": 0 } },
        { id: "iq2", sub: "logicalReasoning",   type: "mcq", text: "Can your child sort objects by colour or shape?",              options: ["Always independently", "Usually", "Sometimes", "Not yet"], scoring: { "Always independently": 3, "Usually": 2, "Sometimes": 1, "Not yet": 0 } },
        { id: "iq3", sub: "memory",             type: "mcq", text: "Can your child remember a simple 2-step instruction?",          options: ["Yes, reliably", "Usually", "With reminders", "No"], scoring: { "Yes, reliably": 3, "Usually": 2, "With reminders": 1, "No": 0 } },
      ],
    },
    cognitive: {
      label: "Cognitive Skills", icon: "💡",
      questions: [
        { id: "cg1", sub: "attentionSpan",       type: "mcq", text: "How long can your child focus on a preferred activity?",           options: ["15+ minutes", "10–15 minutes", "5–10 minutes", "Under 5 minutes"], scoring: { "15+ minutes": 3, "10–15 minutes": 2, "5–10 minutes": 1, "Under 5 minutes": 0 } },
        { id: "cg2", sub: "problemSolving",      type: "mcq", text: "When a toy stops working, what does your child do?",              options: ["Tries to fix it", "Asks for help", "Gets upset then asks", "Gives up immediately"], scoring: { "Tries to fix it": 3, "Asks for help": 2, "Gets upset then asks": 1, "Gives up immediately": 0 } },
        { id: "cg3", sub: "followInstructions",  type: "mcq", text: "How well does your child follow classroom/group instructions?",    options: ["Very well", "Mostly well", "With individual support", "Needs constant prompting"], scoring: { "Very well": 3, "Mostly well": 2, "With individual support": 1, "Needs constant prompting": 0 } },
      ],
    },
    motor: {
      label: "Motor Skills", icon: "✋",
      questions: [
        { id: "mt1", sub: "fineMotor",  type: "slider", text: "Rate your child's fine motor ability (writing, drawing, using cutlery, buttons)", min: 0, max: 100 },
        { id: "mt2", sub: "grossMotor", type: "slider", text: "Rate your child's gross motor ability (running, jumping, climbing, coordination)", min: 0, max: 100 },
      ],
    },
    communication: {
      label: "Communication", icon: "💬",
      questions: [
        { id: "cm1", sub: "speechClarity",         type: "mcq", text: "How clearly does your child speak?",                   options: ["Very clearly", "Mostly clear", "Sometimes unclear", "Difficult to understand"], scoring: { "Very clearly": 3, "Mostly clear": 2, "Sometimes unclear": 1, "Difficult to understand": 0 } },
        { id: "cm2", sub: "vocabulary",            type: "mcq", text: "How large is your child's working vocabulary?",        options: ["Age-appropriate", "Slightly limited", "Significantly limited", "Very few words"], scoring: { "Age-appropriate": 3, "Slightly limited": 2, "Significantly limited": 1, "Very few words": 0 } },
        { id: "cm3", sub: "languageUnderstanding", type: "mcq", text: "Does your child understand what is said to them?",      options: ["Fully", "Mostly", "Partially", "Rarely"], scoring: { "Fully": 3, "Mostly": 2, "Partially": 1, "Rarely": 0 } },
      ],
    },
  }),

  _fallbackIEP: (childData, grade, gradeInfo, overallLevel, domainScores) => ({
    gradeLevel: grade, gradeLabel: gradeInfo.label, overallLevel,
    subjects: gradeInfo.subjects.map(s => ({
      name: s.name, icon: s.icon, gradeGoal: s.focus,
      modifiedGoal: overallLevel === "LOW"
        ? `With picture support and 1:1 assistance, begin foundational ${s.name.toLowerCase()} concepts`
        : overallLevel === "MEDIUM"
        ? `With modified materials, work toward simplified ${s.name.toLowerCase()} activities`
        : `With minor support, engage with grade-level ${s.name.toLowerCase()} content`,
    })),
    goals: {
      academic:   [`Demonstrate foundational ${gradeInfo.subjects[0]?.name} skills with ${overallLevel === "LOW" ? "maximum" : "moderate"} support`, `Complete structured ${gradeInfo.subjects[1]?.name} activities for 10–15 minutes`, `Respond to ${overallLevel === "LOW" ? "1-step" : "2-step"} instructions in academic tasks`],
      functional: ["Follow classroom routine independently using visual schedule", "Communicate basic needs appropriately", "Participate in group activities for 10 minutes"],
    },
    recommendations: ["Use visual schedules and daily routines", "Embed multi-sensory learning activities", "Provide frequent positive reinforcement", "Collaborate with parents on home generalisation activities"],
    accommodations:  ["Extended time for all tasks and assessments", "Modified worksheets with reduced items", "Preferential seating near the educator", "Assistive technology access as needed"],
  }),

  _fallbackInitialQuestions: (age, disabilityType) => {
    const base = {
      Autism: [
        { id: "q1", category: "communication", text: "Does your child make eye contact during conversation?",            options: ["Consistently", "Sometimes", "Rarely", "Never"],         scoring: { "Consistently": 3, "Sometimes": 2, "Rarely": 1, "Never": 0 } },
        { id: "q2", category: "social",        text: "Does your child initiate play with other children?",              options: ["Often", "Sometimes", "With prompting", "Not yet"],      scoring: { "Often": 3, "Sometimes": 2, "With prompting": 1, "Not yet": 0 } },
        { id: "q3", category: "communication", text: "How does your child communicate needs?",                          options: ["Full sentences", "Single words", "Gestures/pointing", "Crying/behavior"], scoring: { "Full sentences": 3, "Single words": 2, "Gestures/pointing": 1, "Crying/behavior": 0 } },
        { id: "q4", category: "cognitive",     text: "Can your child follow a 2-step instruction?",                    options: ["Easily", "With reminders", "With help", "Not yet"],     scoring: { "Easily": 3, "With reminders": 2, "With help": 1, "Not yet": 0 } },
        { id: "q5", category: "emotional",     text: "How does your child handle changes in routine?",                 options: ["Adapts well", "Minor upset", "Significant distress", "Complete meltdown"], scoring: { "Adapts well": 3, "Minor upset": 2, "Significant distress": 1, "Complete meltdown": 0 } },
        { id: "q6", category: "motor",         text: "Can your child use utensils independently?",                     options: ["Yes, independently", "With minor spills", "Needs help", "Cannot yet"], scoring: { "Yes, independently": 3, "With minor spills": 2, "Needs help": 1, "Cannot yet": 0 } },
      ],
      ADHD: [
        { id: "q1", category: "attention",  text: "How long can your child focus on a preferred activity?",           options: ["20+ minutes", "10–20 minutes", "5–10 minutes", "Under 5 minutes"], scoring: { "20+ minutes": 3, "10–20 minutes": 2, "5–10 minutes": 1, "Under 5 minutes": 0 } },
        { id: "q2", category: "impulse",    text: "Does your child wait for their turn in games?",                    options: ["Usually", "Sometimes", "Rarely", "Never"],               scoring: { "Usually": 3, "Sometimes": 2, "Rarely": 1, "Never": 0 } },
        { id: "q3", category: "hyperact",   text: "How often does your child leave their seat unexpectedly?",         options: ["Rarely", "Occasionally", "Frequently", "Almost always"], scoring: { "Rarely": 3, "Occasionally": 2, "Frequently": 1, "Almost always": 0 } },
        { id: "q4", category: "organise",   text: "Can your child keep track of belongings?",                         options: ["Always", "Usually", "Sometimes", "Never"],               scoring: { "Always": 3, "Usually": 2, "Sometimes": 1, "Never": 0 } },
        { id: "q5", category: "following",  text: "Does your child complete multi-step tasks independently?",         options: ["Yes easily", "With reminders", "Partially", "Not yet"], scoring: { "Yes easily": 3, "With reminders": 2, "Partially": 1, "Not yet": 0 } },
        { id: "q6", category: "emotional",  text: "How does your child react to frustration?",                        options: ["Manages calmly", "Brief upset", "Prolonged distress", "Aggressive behavior"], scoring: { "Manages calmly": 3, "Brief upset": 2, "Prolonged distress": 1, "Aggressive behavior": 0 } },
      ],
    };
    return base[disabilityType] ?? base["Autism"];
  },

  _fallbackWeek1Plan: (childData, score, level) => {
    const plans = {
      LOW:    { weeklyPlan: [{ day: "Monday", activity: "Sensory exploration with familiar objects", goal: "Engage with 3 textures", materials: "Texture board", duration: "20 min" }, { day: "Tuesday", activity: "Picture-to-object matching", goal: "Match 5 picture cards", materials: "Picture cards", duration: "20 min" }, { day: "Wednesday", activity: "Simple gross motor circuit", goal: "Complete circuit with prompting", materials: "Foam steps, ball", duration: "25 min" }, { day: "Thursday", activity: "Adult-guided play", goal: "3 turns back-and-forth", materials: "Simple toys", duration: "20 min" }, { day: "Friday", activity: "Visual schedule review", goal: "Follow 4-step schedule", materials: "Schedule cards", duration: "Throughout day" }], learningOutcome: "Complete 3 daily structured activities with adult support", expectedOutcomes: ["Tolerate 15 min activity", "Follow 2-step visual instructions"], strategies: ["High repetition", "Sensory breaks every 15 min"], parentTips: ["Practice at breakfast", "Use same schedule daily"], targetScore: Math.min(score + 15, 100) },
      MEDIUM: { weeklyPlan: [{ day: "Monday", activity: "Social story reading", goal: "Retell 3 key details", materials: "Social story book", duration: "25 min" }, { day: "Tuesday", activity: "Fine motor skill stations", goal: "Complete all 3 stations", materials: "Beads, scissors, blocks", duration: "30 min" }, { day: "Wednesday", activity: "Emotion regulation role-play", goal: "Identify feelings and calm down", materials: "Emotion cards", duration: "20 min" }, { day: "Thursday", activity: "Peer buddy activity", goal: "Cooperate for 15 min", materials: "Board game", duration: "30 min" }, { day: "Friday", activity: "Independent task with checklist", goal: "Complete 4-item checklist", materials: "Visual checklist", duration: "25 min" }], learningOutcome: "Improved social interaction and independent task completion", expectedOutcomes: ["Initiate 3 peer interactions", "Use calming strategy"], strategies: ["Visual supports", "Choice boards"], parentTips: ["Read social story at bedtime"], targetScore: Math.min(score + 12, 100) },
      HIGH:   { weeklyPlan: [{ day: "Monday", activity: "Community helpers role-play", goal: "Name and act 5 helpers", materials: "Props, flashcards", duration: "30 min" }, { day: "Tuesday", activity: "Writing about self", goal: "Write 3 sentences", materials: "Tablet or paper", duration: "30 min" }, { day: "Wednesday", activity: "Group project", goal: "Meaningful contribution", materials: "Project materials", duration: "35 min" }, { day: "Thursday", activity: "Problem-solving scenarios", goal: "Suggest 2 solutions", materials: "Scenario cards", duration: "25 min" }, { day: "Friday", activity: "Self-evaluation", goal: "Rate own work and set goal", materials: "Self-rating chart", duration: "20 min" }], learningOutcome: "Higher-order thinking, group cooperation, self-monitoring", expectedOutcomes: ["Full group participation", "Self-evaluate accurately"], strategies: ["Metacognitive journaling", "Peer mentoring"], parentTips: ["Discuss school day at dinner"], targetScore: Math.min(score + 10, 100) },
    };
    return plans[level] ?? plans["MEDIUM"];
  },

  _fallbackEvalQuestions: (iepPlan) => [
    { id: "eq1", category: "goal_achievement", text: `Did your child complete the Monday activity: "${iepPlan.weeklyPlan[0]?.activity}"?`, options: ["Always (4+ times)", "Often (2–3 times)", "Sometimes (1 time)", "Not yet"], scoring: { "Always (4+ times)": 3, "Often (2–3 times)": 2, "Sometimes (1 time)": 1, "Not yet": 0 }, relatedActivity: "Monday" },
    { id: "eq2", category: "engagement",        text: "How engaged was your child during learning activities?",                              options: ["Very engaged", "Engaged most of the time", "Engaged occasionally", "Hard to engage"], scoring: { "Very engaged": 3, "Engaged most of the time": 2, "Engaged occasionally": 1, "Hard to engage": 0 }, relatedActivity: "General" },
    { id: "eq3", category: "independence",      text: "How independently did your child complete tasks?",                                    options: ["Mostly independent", "Needed reminders only", "Needed frequent help", "Needed constant support"], scoring: { "Mostly independent": 3, "Needed reminders only": 2, "Needed frequent help": 1, "Needed constant support": 0 }, relatedActivity: "General" },
    { id: "eq4", category: "social",            text: "Did your child interact positively with others?",                                     options: ["Consistently positive", "Usually positive", "Mixed", "Avoided interaction"], scoring: { "Consistently positive": 3, "Usually positive": 2, "Mixed": 1, "Avoided interaction": 0 }, relatedActivity: "Social" },
    { id: "eq5", category: "goal_achievement",  text: "Was this week's main goal achieved?",                                                 options: ["Fully achieved", "Mostly achieved", "Partially achieved", "Not achieved"], scoring: { "Fully achieved": 3, "Mostly achieved": 2, "Partially achieved": 1, "Not achieved": 0 }, relatedActivity: "Goal" },
  ],
};

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 5 — SERVICES  (CRUD layer — mirrors Express route handlers)
// ════════════════════════════════════════════════════════════════════════════════

const assessmentService = {
  getParentById:         (id)      => mockDB.parents.find(p => p.id === id),
  getEducatorById:       (id)      => mockDB.educators.find(e => e.id === id),
  getAssessmentsByChild: (childId) => mockDB.assessments.filter(a => a.childID === childId).sort((a, b) => a.weekNumber - b.weekNumber),
  getIEPByChild:         (childId) => mockDB.iepPlans.filter(p => p.childID === childId).sort((a, b) => a.weekNumber - b.weekNumber),
  getFeedbackByEducator: (eduId)   => mockDB.feedback.filter(f => f.educatorID === eduId),
  getFeedbackByParent:   (pid)     => mockDB.feedback.filter(f => f.parentID === pid),
  getInitialAssessment:  (childId) => mockDB.initialAssessments.find(ia => ia.childId === childId),
  hasCompletedInitialAssessment: (childId) => mockDB.initialAssessments.some(ia => ia.childId === childId),
  getWeeklyEvaluations:  (childId) => mockDB.weeklyEvaluations.filter(e => e.childId === childId).sort((a, b) => a.weekNumber - b.weekNumber),
  hasPendingEvaluation:  (childId, weekNumber) => mockDB.weeklyEvaluations.some(e => e.childId === childId && e.weekNumber === weekNumber),

  saveInitialAssessment: (childId, questions, answers, totalScore, level, disabilityType, age) => {
    const record = { id: "ia" + Date.now(), childId, questions, answers, totalScore, level, disabilityType, age, completedAt: new Date().toISOString().slice(0, 10), week1PlanGenerated: false };
    mockDB.initialAssessments.push(record);
    const parent = mockDB.parents.find(p => p.id === childId);
    if (parent) { parent.initialAssessmentDone = true; parent.isNewUser = false; }
    return record;
  },
  markWeek1PlanGenerated: (childId) => { const ia = mockDB.initialAssessments.find(i => i.childId === childId); if (ia) ia.week1PlanGenerated = true; },
  saveWeek1Plan: (childId, educatorId, planData, score, level) => {
    const existing = mockDB.iepPlans.filter(p => p.childID === childId);
    if (existing.some(p => p.weekNumber === 1)) return existing.find(p => p.weekNumber === 1);
    const plan = { id: "iep" + Date.now(), childID: childId, educatorID: educatorId, weeklyPlan: planData.weeklyPlan, learningOutcome: planData.learningOutcome, expectedOutcomes: planData.expectedOutcomes, strategies: planData.strategies, parentTips: planData.parentTips, status: "ONGOING", weekNumber: 1, aiGenerated: true, editedByEducator: false, previousScore: score, targetScore: planData.targetScore, initialLevel: level, createdAt: new Date().toISOString() };
    mockDB.iepPlans.push(plan);
    assessmentService.markWeek1PlanGenerated(childId);
    return plan;
  },
  saveWeeklyEvaluation: (childId, educatorId, weekNumber, iepPlanId, questions, answers, score, previousScore, aiDecision) => {
    const record = { id: "we" + Date.now(), childId, educatorId, weekNumber, iepPlanId, questions, answers, score, previousScore, improvement: score - previousScore, aiDecision: aiDecision.decision, aiReasoning: aiDecision.reasoning, modifications: aiDecision.modifications, nextWeekHints: aiDecision.nextWeekHints, encouragementMessage: aiDecision.encouragementMessage, completedAt: new Date().toISOString().slice(0, 10) };
    mockDB.weeklyEvaluations.push(record);
    return record;
  },
  updateIEPStatus: (planId, status) => { const plan = mockDB.iepPlans.find(p => p.id === planId); if (plan) plan.status = status; return plan; },
  saveNextWeekPlan: (childId, educatorId, weekNumber, planData, score) => {
    const plan = { id: "iep" + Date.now(), childID: childId, educatorID: educatorId, weeklyPlan: planData.weeklyPlan, learningOutcome: planData.learningOutcome, expectedOutcomes: planData.expectedOutcomes ?? [], strategies: planData.strategies ?? [], parentTips: planData.parentTips ?? [], status: "ONGOING", weekNumber, aiGenerated: true, editedByEducator: false, previousScore: score, targetScore: planData.targetScore, createdAt: new Date().toISOString() };
    mockDB.iepPlans.push(plan);
    return plan;
  },
  modifyIEPPlan: (planId, modifications) => { const plan = mockDB.iepPlans.find(p => p.id === planId); if (!plan) return null; plan.status = "ONGOING"; plan.modifications = modifications; plan.modifiedAt = new Date().toISOString(); plan.aiModified = true; return plan; },
};

const milestoneService = {
  getMilestonesByChild: (childId) => mockDB.milestones.filter(m => m.childId === childId).sort((a, b) => a.week - b.week),
  getMilestonesByWeek:  (childId, week) => mockDB.milestones.find(m => m.childId === childId && m.week === week),
  saveMilestones: (childId, week, milestones) => {
    if (mockDB.milestones.find(m => m.childId === childId && m.week === week)) return;
    const record = { id: "ms" + Date.now(), childId, week, milestones, createdAt: new Date().toISOString() };
    mockDB.milestones.push(record);
    return record;
  },
  updateMilestoneStatus: (childId, week, aiDecision) => {
    const record = mockDB.milestones.find(m => m.childId === childId && m.week === week);
    if (!record) return null;
    record.milestones = record.milestones.map(ms => ({ ...ms, status: aiDecision === "ADVANCE" ? "COMPLETED" : ms.status }));
    return record;
  },
  toggleMilestone: (childId, week, idx) => {
    const record = mockDB.milestones.find(m => m.childId === childId && m.week === week);
    if (!record?.milestones[idx]) return null;
    record.milestones[idx].status = record.milestones[idx].status === "PENDING" ? "COMPLETED" : "PENDING";
    return record;
  },
};

const progressService = {
  getProgressData: (childId) => {
    const data = [];
    mockDB.assessments.filter(a => a.childID === childId).sort((a, b) => a.weekNumber - b.weekNumber).forEach(a => { if (!data.find(d => d.week === a.weekNumber)) data.push({ week: a.weekNumber, score: a.score }); });
    mockDB.weeklyEvaluations.filter(e => e.childId === childId).sort((a, b) => a.weekNumber - b.weekNumber).forEach(e => { const ex = data.find(d => d.week === e.weekNumber); if (ex) ex.evalScore = e.score; else data.push({ week: e.weekNumber, score: e.score }); });
    return data.sort((a, b) => a.week - b.week);
  },
};

/** POST /api/assessment — Multi-domain assessment service */
const multiDomainService = {
  getAssessmentByUser: (userId) => mockDB.multiDomainAssessments.find(a => a.userId === userId),
  saveAssessment: (userId, domainScores, overallScore, overallLevel, breakdown) => {
    const existing = mockDB.multiDomainAssessments.find(a => a.userId === userId);
    if (existing) { Object.assign(existing, { iqScore: domainScores.iq ?? 0, cognitiveScore: domainScores.cognitive ?? 0, motorScore: domainScores.motor ?? 0, communicationScore: domainScores.communication ?? 0, overallLevel, breakdown, completedAt: new Date().toISOString().slice(0, 10) }); return existing; }
    const record = { id: "mda" + Date.now(), userId, iqScore: domainScores.iq ?? 0, cognitiveScore: domainScores.cognitive ?? 0, motorScore: domainScores.motor ?? 0, communicationScore: domainScores.communication ?? 0, overallLevel, breakdown, completedAt: new Date().toISOString().slice(0, 10) };
    mockDB.multiDomainAssessments.push(record);
    return record;
  },
};

/** GET /api/education-plan/:userId — Education plan service */
const educationPlanService = {
  getPlanByUser: (userId) => mockDB.educationPlans.find(p => p.userId === userId),
  savePlan: (userId, planData) => {
    const existing = mockDB.educationPlans.find(p => p.userId === userId);
    if (existing) { Object.assign(existing, planData); return existing; }
    const record = { id: "ep" + Date.now(), userId, ...planData };
    mockDB.educationPlans.push(record);
    return record;
  },
};

const summaryService = {
  getSummariesByChild: (childId) => mockDB.weeklySummaries.filter(s => s.childId === childId).sort((a, b) => b.week - a.week),
  saveSummary: (childId, week, summaries) => {
    const existing = mockDB.weeklySummaries.find(s => s.childId === childId && s.week === week);
    if (existing) { existing.summaries = summaries; return existing; }
    const record = { id: "ws" + Date.now(), childId, week, summaries, createdAt: new Date().toISOString().slice(0, 10) };
    mockDB.weeklySummaries.push(record);
    return record;
  },
};

const educatorService = {
  findMatchingEducator: (disabilityType) => mockDB.educators.find(e => e.educatorType === disabilityType) ?? null,
  assignEducator: (parentId, educatorId) => {
    const parent = mockDB.parents.find(p => p.id === parentId);
    const educator = mockDB.educators.find(e => e.id === educatorId);
    if (!parent || !educator) return false;
    parent.assignedEducatorID = educatorId;
    if (!educator.assignedChildren.includes(parentId)) educator.assignedChildren.push(parentId);
    return true;
  },
  runDeferredMatching: (educatorId) => {
    const educator = mockDB.educators.find(e => e.id === educatorId);
    if (!educator) return 0;
    let matched = 0;
    mockDB.parents.forEach(parent => { if (!parent.assignedEducatorID && parent.disabilityType === educator.educatorType) { educatorService.assignEducator(parent.id, educatorId); matched++; } });
    return matched;
  },
};

const mockAuth = {
  login: (email, password, role) => {
    const db = role === "educator" ? mockDB.educators : mockDB.parents;
    const user = db.find(u => u.email === email && u.password === password);
    if (!user) return { error: "Invalid credentials" };
    return { token: btoa(JSON.stringify({ id: user.id, role, email })), user, role };
  },
  register: (data, role) => {
    if (role === "educator") {
      if (mockDB.educators.find(e => e.email === data.email)) return { error: "Email already registered" };
      const newEdu = { ...data, id: "edu" + Date.now(), assignedChildren: [] };
      mockDB.educators.push(newEdu);
      const matchedCount = educatorService.runDeferredMatching(newEdu.id);
      return { token: btoa(JSON.stringify({ id: newEdu.id, role, email: data.email })), user: newEdu, role, matchedCount };
    } else {
      if (mockDB.parents.find(p => p.email === data.email)) return { error: "Email already registered" };
      const matchedEdu = educatorService.findMatchingEducator(data.disabilityType);
      const grade = curriculumEngine.getGradeFromAge(data.age);
      const uniqueChildID = "CHILD-" + String(Math.floor(Math.random() * 900000) + 100000);
      const newParent = { ...data, id: "par" + Date.now(), uniqueChildID, assignedEducatorID: matchedEdu?.id ?? null, isNewUser: true, initialAssessmentDone: false, gradeLevel: grade };
      mockDB.parents.push(newParent);
      if (matchedEdu) matchedEdu.assignedChildren.push(newParent.id);
      return { token: btoa(JSON.stringify({ id: newParent.id, role, email: data.email })), user: newParent, role, assignedEducator: matchedEdu ?? null, requiresInitialAssessment: true, educatorPending: !matchedEdu };
    }
  },
};

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 6 — DESIGN SYSTEM
// ════════════════════════════════════════════════════════════════════════════════

const C = {
  primary:   "#1a3a5c",
  secondary: "#e85d26",
  accent:    "#34c2b3",
  soft:      "#f0f7ff",
  card:      "#ffffff",
  border:    "#dce8f5",
  text:      "#1e2b3a",
  muted:     "#6b859e",
  success:   "#2db87a",
  warning:   "#f5a623",
  danger:    "#e84b4b",
  gradient:  "linear-gradient(135deg, #1a3a5c 0%, #2563a8 60%, #34c2b3 100%)",
  domain:    { iq: "#6366f1", cognitive: "#f59e0b", motor: "#10b981", communication: "#ec4899" },
};

const G = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=DM+Serif+Display&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Nunito',sans-serif;color:#1e2b3a;}
  .fade-in{animation:fadeIn 0.35s ease;}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  .pulse{animation:pulse 1.5s ease-in-out infinite;}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
  .slide-in{animation:slideIn 0.4s cubic-bezier(0.34,1.56,0.64,1);}
  @keyframes slideIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
  @keyframes spin{to{transform:rotate(360deg)}}
`;

const disabilityTypes = ["Autism", "ADHD", "Intellectual Disability", "Down Syndrome"];

// ── Primitive components ──────────────────────────────────────────────────────

const Card = ({ children, style = {} }) => (
  <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 20, boxShadow: "0 2px 12px rgba(26,58,92,0.06)", ...style }}>{children}</div>
);

const Badge = ({ children, color = "blue" }) => {
  const map = { blue: ["#dbeafe","#1d4ed8"], green: ["#d1fae5","#065f46"], orange: ["#ffedd5","#9a3412"], red: ["#fee2e2","#991b1b"], teal: ["#ccfbf1","#0f766e"], purple: ["#ede9fe","#5b21b6"], yellow: ["#fefce8","#854d0e"], indigo: ["#e0e7ff","#3730a3"], pink: ["#fce7f3","#9d174d"] };
  const [bg, fg] = map[color] ?? map.blue;
  return <span style={{ background: bg, color: fg, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{children}</span>;
};

const Button = ({ children, onClick, disabled, variant = "primary", size = "md", style = {} }) => {
  const sz = { sm: { padding: "7px 14px", fontSize: 13 }, md: { padding: "10px 20px", fontSize: 14 }, lg: { padding: "13px 28px", fontSize: 15 } };
  const va = { primary: { background: C.secondary, color: "#fff" }, secondary: { background: C.accent, color: "#fff" }, outline: { background: "transparent", border: `1.5px solid ${C.border}`, color: C.text }, ghost: { background: "transparent", color: C.primary }, danger: { background: C.danger, color: "#fff" }, success: { background: C.success, color: "#fff" } };
  return <button onClick={onClick} disabled={disabled} style={{ border: "none", borderRadius: 10, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "Nunito", fontWeight: 700, transition: "all 0.2s", opacity: disabled ? 0.6 : 1, ...sz[size], ...va[variant], ...style }}>{children}</button>;
};

const Spinner = ({ size = 24, color = C.accent }) => (
  <div style={{ width: size, height: size, border: `3px solid ${color}30`, borderTop: `3px solid ${color}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
);

const Alert = ({ children, type = "info" }) => {
  const map = { info: ["#dbeafe","#1e40af","ℹ️"], success: ["#d1fae5","#065f46","✅"], warning: ["#ffedd5","#9a3412","⚠️"], error: ["#fee2e2","#991b1b","❌"] };
  const [bg, fg, icon] = map[type];
  return <div style={{ background: bg, color: fg, padding: "12px 16px", borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "flex-start", gap: 8 }}><span>{icon}</span><span>{children}</span></div>;
};

const Input = ({ label, value, onChange, type = "text", placeholder, required, options }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: "block", fontWeight: 700, fontSize: 13, color: C.primary, marginBottom: 6 }}>{label}{required && <span style={{ color: C.danger }}>*</span>}</label>
    {options ? (
      <select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: "Nunito", fontSize: 14, outline: "none", background: "#fff", color: C.text }}>
        {options.map(o => <option key={typeof o === "string" ? o : o.value} value={typeof o === "string" ? o : o.value}>{typeof o === "string" ? o : o.label}</option>)}
      </select>
    ) : (
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: "Nunito", fontSize: 14, outline: "none" }} />
    )}
  </div>
);

const ProgressBar = ({ value, max = 100, color = C.accent, height = 10 }) => (
  <div style={{ background: C.border, borderRadius: 20, overflow: "hidden", height }}>
    <div style={{ width: `${Math.min((value / max) * 100, 100)}%`, height: "100%", background: color, borderRadius: 20, transition: "width 0.8s ease" }} />
  </div>
);

const DomainScoreCard = ({ domain, score, icon, color }) => (
  <div style={{ background: `${color}10`, border: `1.5px solid ${color}30`, borderRadius: 14, padding: 16, textAlign: "center" }}>
    <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
    <div style={{ fontSize: 24, fontWeight: 900, color }}>{score}<span style={{ fontSize: 14, color: C.muted }}>/100</span></div>
    <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginTop: 4 }}>{domain}</div>
    <ProgressBar value={score} max={100} color={color} height={4} />
  </div>
);

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 7 — MULTI-DOMAIN ASSESSMENT FLOW  (New User Gate)
// If isNewUser === true → this is shown before the main dashboard.
// Flow: intro → loading → domain questions → results → IEP
// ════════════════════════════════════════════════════════════════════════════════

const MultiDomainAssessmentFlow = ({ parent, onComplete }) => {
  const [phase, setPhase]               = useState("intro");
  const [domains, setDomains]           = useState(null);
  const [currentDomain, setCurrentDomain] = useState(0);
  const [currentQ, setCurrentQ]         = useState(0);
  const [answers, setAnswers]           = useState({});
  const [sliders, setSliders]           = useState({});
  const [result, setResult]             = useState(null);
  const [iep, setIep]                   = useState(null);
  const [iepLoading, setIepLoading]     = useState(false);

  const domainOrder = ["iq", "cognitive", "motor", "communication"];
  const domainLabels = { iq: "IQ & Reasoning", cognitive: "Cognitive Skills", motor: "Motor Skills", communication: "Communication" };
  const domainIcons  = { iq: "🧠", cognitive: "💡", motor: "✋", communication: "💬" };
  const domainColorMap = C.domain;

  const grade = curriculumEngine.getGradeFromAge(parent.age);
  const gradeInfo = curriculumEngine.getSubjectsForGrade(grade);

  const loadDomains = async () => {
    setPhase("loading");
    const d = await aiService.generateMultiDomainTest(parent.age, parent.disabilityType);
    setDomains(d); setCurrentDomain(0); setCurrentQ(0);
    setPhase("domain");
  };

  const dk = domainOrder[currentDomain];
  const domainData = domains?.[dk];
  const allQs = domainData?.questions ?? [];
  const curQ  = allQs[currentQ];

  const handleNextQ = () => {
    if (currentQ < allQs.length - 1) { setCurrentQ(c => c + 1); }
    else if (currentDomain < domainOrder.length - 1) { setCurrentDomain(d => d + 1); setCurrentQ(0); }
    else { submitAssessment(); }
  };

  const isAnswered = () => {
    if (!curQ) return true;
    if (curQ.type === "slider") return true;
    return !!answers[curQ.id];
  };

  const submitAssessment = () => {
    const allAnswers = { ...answers, ...sliders };
    const { domainScores, overallScore, overallLevel } = aiService.evaluateMultiDomainAssessment(allAnswers, domains);
    const record = multiDomainService.saveAssessment(parent.id, domainScores, overallScore, overallLevel, allAnswers);
    assessmentService.saveInitialAssessment(parent.id, [], [], overallScore, overallLevel, parent.disabilityType, parent.age);
    setResult({ domainScores, overallScore, overallLevel, record });
    setPhase("results");
  };

  const generateIEP = async () => {
    setIepLoading(true);
    const iepData = await aiService.generateIEP(parent, result);
    const saved = educationPlanService.savePlan(parent.id, iepData);
    setIep(saved); setIepLoading(false); setPhase("iep");
  };

  return (
    <div style={{ minHeight: "100vh", background: C.gradient, padding: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{G}</style>
      <div style={{ width: "100%", maxWidth: 640 }} className="fade-in">

        {/* ── INTRO ── */}
        {phase === "intro" && (
          <Card style={{ padding: 36 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>🧩</div>
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 28, color: C.primary, marginBottom: 8 }}>Welcome to EduPath!</h2>
              <p style={{ color: C.muted, fontSize: 14 }}>Hello, {parent.parentName}! Let's understand {parent.childName}'s abilities before creating a personalised plan.</p>
            </div>

            {/* Grade pill */}
            <div style={{ background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 14, padding: 16, marginBottom: 20 }}>
              <div style={{ fontWeight: 800, color: "#1d4ed8", fontSize: 13, marginBottom: 8 }}>📚 {gradeInfo.label} — Age {parent.age} ({curriculumEngine.getAgeRangeForGrade(grade)})</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {gradeInfo.subjects.map(s => <span key={s.name} style={{ background: "#dbeafe", color: "#1d4ed8", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{s.icon} {s.name}</span>)}
              </div>
            </div>

            {!parent.assignedEducatorID && <Alert type="warning">Please wait while we find a suitable educator. Complete the assessment to generate {parent.childName}'s personalised IEP.</Alert>}
            {parent.assignedEducatorID  && <Alert type="success">Matched with {assessmentService.getEducatorById(parent.assignedEducatorID)?.name} — {parent.disabilityType} Specialist</Alert>}

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 800, color: C.primary, marginBottom: 12 }}>This assessment covers 4 domains:</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  ["🧠", "IQ & Reasoning",   "Pattern recognition, logic, memory"],
                  ["💡", "Cognitive Skills", "Attention, problem-solving, instructions"],
                  ["✋", "Motor Skills",     "Fine motor (writing), gross motor (movement)"],
                  ["💬", "Communication",   "Speech clarity, vocabulary, understanding"],
                ].map(([icon, title, desc]) => (
                  <div key={title} style={{ padding: 12, background: C.soft, borderRadius: 12 }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: C.primary }}>{title}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <Button onClick={loadDomains} size="lg" style={{ width: "100%" }}>Begin Multi-Domain Assessment →</Button>
          </Card>
        )}

        {/* ── LOADING ── */}
        {phase === "loading" && (
          <Card style={{ padding: 48, textAlign: "center" }}>
            <div className="pulse" style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
            <p style={{ fontFamily: "DM Serif Display", fontSize: 22, color: C.primary }}>Preparing personalised assessment…</p>
            <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}><Spinner size={36} /></div>
          </Card>
        )}

        {/* ── DOMAIN QUESTIONS ── */}
        {phase === "domain" && curQ && (
          <Card style={{ padding: 32 }} className="slide-in">
            {/* Progress stepper */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {domainOrder.map((d, i) => (
                  <div key={d} style={{ flex: 1, height: 6, borderRadius: 10, background: i < currentDomain ? C.success : i === currentDomain ? domainColorMap[d] : C.border, transition: "all 0.3s" }} />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, color: C.muted, fontWeight: 700 }}>DOMAIN {currentDomain + 1}/4 — {domainIcons[dk]} {domainLabels[dk].toUpperCase()}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Question {currentQ + 1} of {allQs.length}</div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: domainColorMap[dk] }}>{domainIcons[dk]}</div>
              </div>
            </div>

            <h3 style={{ fontFamily: "DM Serif Display", fontSize: 19, color: C.primary, marginBottom: 24, lineHeight: 1.5 }}>{curQ.text}</h3>

            {/* MCQ options */}
            {curQ.type === "mcq" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                {curQ.options.map(opt => (
                  <button key={opt} onClick={() => setAnswers(p => ({ ...p, [curQ.id]: opt }))}
                    style={{ padding: "12px 18px", borderRadius: 12, border: `2px solid ${answers[curQ.id] === opt ? domainColorMap[dk] : C.border}`, background: answers[curQ.id] === opt ? `${domainColorMap[dk]}15` : "#fff", color: answers[curQ.id] === opt ? domainColorMap[dk] : C.text, fontFamily: "Nunito", fontWeight: answers[curQ.id] === opt ? 800 : 600, fontSize: 14, textAlign: "left", cursor: "pointer", transition: "all 0.15s" }}>
                    {answers[curQ.id] === opt ? "✓ " : ""}{opt}
                  </button>
                ))}
              </div>
            )}

            {/* Slider */}
            {curQ.type === "slider" && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: C.muted }}>Very limited</span>
                  <span style={{ fontSize: 20, fontWeight: 900, color: domainColorMap[dk] }}>{sliders[curQ.id] ?? 50}/100</span>
                  <span style={{ fontSize: 13, color: C.muted }}>Age-appropriate</span>
                </div>
                <input type="range" min={0} max={100} value={sliders[curQ.id] ?? 50}
                  onChange={e => setSliders(p => ({ ...p, [curQ.id]: Number(e.target.value) }))}
                  style={{ width: "100%", accentColor: domainColorMap[dk] }} />
                <div style={{ marginTop: 8 }}>
                  <ProgressBar value={sliders[curQ.id] ?? 50} max={100} color={domainColorMap[dk]} height={6} />
                </div>
              </div>
            )}

            <Button onClick={handleNextQ} disabled={!isAnswered()} size="lg" style={{ width: "100%" }}>
              {currentDomain === domainOrder.length - 1 && currentQ === allQs.length - 1 ? "Submit Assessment →" : "Next →"}
            </Button>
          </Card>
        )}

        {/* ── RESULTS ── */}
        {phase === "results" && result && (
          <Card style={{ padding: 36 }} className="fade-in">
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 52, marginBottom: 10 }}>📊</div>
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: C.primary, marginBottom: 6 }}>Assessment Complete!</h2>
              <p style={{ color: C.muted, fontSize: 14 }}>Here is {parent.childName}'s ability profile across all 4 domains.</p>
            </div>

            {/* Domain score grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 24 }}>
              {[
                { key: "iq",            label: "IQ & Reasoning", icon: "🧠", color: C.domain.iq },
                { key: "cognitive",     label: "Cognitive",       icon: "💡", color: C.domain.cognitive },
                { key: "motor",         label: "Motor",           icon: "✋", color: C.domain.motor },
                { key: "communication", label: "Communication",   icon: "💬", color: C.domain.communication },
              ].map(d => <DomainScoreCard key={d.key} domain={d.label} score={result.domainScores[d.key] ?? 0} icon={d.icon} color={d.color} />)}
            </div>

            {/* Overall badge */}
            <div style={{ background: result.overallLevel === "HIGH" ? "#d1fae5" : result.overallLevel === "MEDIUM" ? "#ffedd5" : "#fee2e2", borderRadius: 14, padding: 16, marginBottom: 24, textAlign: "center" }}>
              <div style={{ fontSize: 13, color: C.muted, fontWeight: 700, marginBottom: 4 }}>OVERALL ABILITY LEVEL</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: result.overallLevel === "HIGH" ? "#065f46" : result.overallLevel === "MEDIUM" ? "#9a3412" : "#991b1b" }}>
                {result.overallLevel} — {result.overallScore}/100
              </div>
            </div>

            <Alert type="info">
              <strong>Next step:</strong> Generate {parent.childName}'s personalised IEP based on these results. The plan will be aligned to <strong>{gradeInfo.label}</strong> curriculum with modifications for {result.overallLevel} ability.
            </Alert>

            <Button onClick={generateIEP} disabled={iepLoading} size="lg" style={{ width: "100%" }}>
              {iepLoading ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}><Spinner size={18} color="#fff" />Generating IEP…</span> : "🎓 Generate My IEP →"}
            </Button>
          </Card>
        )}

        {/* ── IEP GENERATED ── */}
        {phase === "iep" && iep && (
          <Card style={{ padding: 32 }} className="fade-in">
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 52, marginBottom: 10 }}>🎉</div>
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: C.primary, marginBottom: 6 }}>IEP Generated!</h2>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                <Badge color="blue">{iep.gradeLabel}</Badge>
                <Badge color={iep.overallLevel === "HIGH" ? "green" : iep.overallLevel === "MEDIUM" ? "orange" : "red"}>{iep.overallLevel} Ability</Badge>
                <Badge color="purple">AI Personalised</Badge>
              </div>
            </div>

            {/* Subject goals preview */}
            <Card style={{ marginBottom: 16, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
              <div style={{ fontWeight: 800, color: "#1d4ed8", marginBottom: 12 }}>📚 Modified Curriculum for {iep.gradeLabel}</div>
              {(iep.subjects ?? []).slice(0, 3).map((s, i) => (
                <div key={i} style={{ marginBottom: 8, fontSize: 13 }}>
                  <span style={{ fontWeight: 700 }}>{s.icon} {s.name}:</span> <span style={{ color: C.muted }}>{s.modifiedGoal}</span>
                </div>
              ))}
            </Card>

            <Alert type="success">Your IEP is ready! Head to the "My IEP" tab in your dashboard to view the full plan including all goals, recommendations, and accommodations.</Alert>

            <Button onClick={onComplete} size="lg" style={{ width: "100%" }}>Go to My Dashboard →</Button>
          </Card>
        )}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 8 — SHARED COMPONENTS
// ════════════════════════════════════════════════════════════════════════════════

const MilestoneTracker = ({ childId, week, refreshKey }) => {
  const [record, setRecord] = useState(() => milestoneService.getMilestonesByWeek(childId, week));
  useEffect(() => { setRecord(milestoneService.getMilestonesByWeek(childId, week)); }, [childId, week, refreshKey]);
  const handleToggle = (idx) => { milestoneService.toggleMilestone(childId, week, idx); setRecord({ ...milestoneService.getMilestonesByWeek(childId, week) }); };
  if (!record) return <div style={{ padding: 16, background: C.soft, borderRadius: 12, textAlign: "center", color: C.muted, fontSize: 13 }}>No milestones for Week {week} yet.</div>;
  const completed = record.milestones.filter(m => m.status === "COMPLETED").length;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontWeight: 800, color: C.primary, fontSize: 14 }}>Week {week} Milestones</div>
        <Badge color={completed === record.milestones.length ? "green" : "orange"}>{completed}/{record.milestones.length} Done</Badge>
      </div>
      <ProgressBar value={completed} max={record.milestones.length} color={completed === record.milestones.length ? C.success : C.warning} height={6} />
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {record.milestones.map((ms, idx) => (
          <div key={idx} onClick={() => handleToggle(idx)} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 12px", borderRadius: 12, cursor: "pointer", background: ms.status === "COMPLETED" ? "#d1fae5" : C.soft, border: `1.5px solid ${ms.status === "COMPLETED" ? "#6ee7b7" : C.border}`, transition: "all 0.2s" }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, background: ms.status === "COMPLETED" ? C.success : "#fff", border: `2px solid ${ms.status === "COMPLETED" ? C.success : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", fontWeight: 900 }}>{ms.status === "COMPLETED" ? "✓" : ""}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: ms.status === "COMPLETED" ? "#065f46" : C.text, textDecoration: ms.status === "COMPLETED" ? "line-through" : "none" }}>{ms.title}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{ms.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProgressGraph = ({ childId }) => {
  const data = progressService.getProgressData(childId);
  if (data.length === 0) return <div style={{ textAlign: "center", padding: 40, background: C.soft, borderRadius: 12, color: C.muted }}>📈 Progress data will appear after your first evaluation.</div>;
  const Tip = ({ active, payload, label }) => active && payload?.length ? (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
      <div style={{ fontWeight: 800, color: C.primary, marginBottom: 4 }}>Week {label}</div>
      {payload.map((p, i) => <div key={i} style={{ fontSize: 13, color: p.color, fontWeight: 700 }}>{p.name}: {p.value}/100</div>)}
    </div>
  ) : null;
  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 800, color: C.primary }}>Score Progression</div>
        <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
          <span style={{ color: C.accent, fontWeight: 700 }}>● Assessments</span>
          <span style={{ color: C.secondary, fontWeight: 700 }}>● Evaluations</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
          <XAxis dataKey="week" tick={{ fontSize: 12, fill: C.muted }} tickFormatter={v => `W${v}`} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: C.muted }} />
          <Tooltip content={<Tip />} />
          <ReferenceLine y={70} stroke="#2db87a" strokeDasharray="4 4" />
          <Line type="monotone" dataKey="score"     stroke={C.accent}     strokeWidth={2.5} dot={{ r: 5, fill: C.accent }}     name="Score" />
          <Line type="monotone" dataKey="evalScore" stroke={C.secondary}  strokeWidth={2}   dot={{ r: 4, fill: C.secondary }}  name="Eval" strokeDasharray="5 5" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Weekly Summary Card — Language Toggle
 * v4 FIX: Only shows EN and TA buttons (both confirmed working).
 * Falls back to English if Tamil content is missing.
 */
const WeeklySummaryCard = ({ childId, preferredLanguage }) => {
  const defaultCode = languageEngine.getLangCode(preferredLanguage);
  const [lang, setLang] = useState(defaultCode);
  const summaries = summaryService.getSummariesByChild(childId);
  if (summaries.length === 0) return <div style={{ textAlign: "center", padding: 32, background: C.soft, borderRadius: 12, color: C.muted }}>📝 Summaries will appear after your first weekly evaluation.</div>;
  return (
    <div>
      {/* Language Toggle — EN and TA only (v4 language fix) */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 800, color: C.primary, marginBottom: 10 }}>Select Language</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SUPPORTED_LANGUAGES.map(l => (
            <button key={l.code} onClick={() => setLang(l.code)}
              style={{ padding: "6px 14px", border: `2px solid ${lang === l.code ? C.primary : C.border}`, borderRadius: 20, cursor: "pointer", fontFamily: "Nunito", fontWeight: 700, fontSize: 13, background: lang === l.code ? C.primary : "#fff", color: lang === l.code ? "#fff" : C.text, transition: "all 0.2s" }}>
              {l.flag} {l.nativeName}
            </button>
          ))}
        </div>
      </div>
      {summaries.map(s => (
        <div key={s.id} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <Badge color="blue">Week {s.week}</Badge>
            <span style={{ fontSize: 12, color: C.muted }}>{s.createdAt}</span>
          </div>
          <div style={{ background: lang === "ta" ? "#fdf4ff" : "#f0f9ff", border: `1px solid ${lang === "ta" ? "#e9d5ff" : "#bae6fd"}`, borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 14, color: C.text, lineHeight: 1.9 }}>
              {s.summaries?.[lang] ?? s.summaries?.en ?? "Summary not available."}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

/** IEP Viewer — shown in parent dashboard "My IEP" tab */
const IEPViewer = ({ userId, childName }) => {
  const iep       = educationPlanService.getPlanByUser(userId);
  const multiAssmt = multiDomainService.getAssessmentByUser(userId);
  if (!iep) return (
    <div style={{ textAlign: "center", padding: 40, background: C.soft, borderRadius: 14 }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🎓</div>
      <p style={{ color: C.muted }}>No IEP yet. Complete the multi-domain assessment to generate {childName}'s personalised plan.</p>
    </div>
  );
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <Badge color="blue">{iep.gradeLabel}</Badge>
        <Badge color={iep.overallLevel === "HIGH" ? "green" : iep.overallLevel === "MEDIUM" ? "orange" : "red"}>{iep.overallLevel} Ability Level</Badge>
        <Badge color="purple">AI Generated</Badge>
        <Badge color="indigo">{new Date(iep.generatedAt).toLocaleDateString()}</Badge>
      </div>

      {/* Assessment profile */}
      {multiAssmt && (
        <Card style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 800, color: C.primary, marginBottom: 14 }}>📊 Assessment Profile</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
            {[
              { key: "iqScore",            label: "IQ & Reasoning", icon: "🧠", color: C.domain.iq },
              { key: "cognitiveScore",     label: "Cognitive",       icon: "💡", color: C.domain.cognitive },
              { key: "motorScore",         label: "Motor",           icon: "✋", color: C.domain.motor },
              { key: "communicationScore", label: "Communication",   icon: "💬", color: C.domain.communication },
            ].map(d => <DomainScoreCard key={d.key} domain={d.label} score={multiAssmt[d.key] ?? 0} icon={d.icon} color={d.color} />)}
          </div>
        </Card>
      )}

      {/* Modified curriculum */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 800, color: C.primary, marginBottom: 14 }}>📚 Modified Curriculum</div>
        {(iep.subjects ?? []).map((s, i) => (
          <div key={i} style={{ marginBottom: 12, padding: 14, background: C.soft, borderRadius: 12 }}>
            <div style={{ fontWeight: 800, color: C.primary, marginBottom: 6 }}>{s.icon} {s.name}</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>📖 Grade standard: {s.gradeGoal}</div>
            <div style={{ fontSize: 13, color: C.success, fontWeight: 700 }}>✏️ Modified goal: {s.modifiedGoal}</div>
          </div>
        ))}
      </Card>

      {/* Goals */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <Card style={{ background: "#eff6ff" }}>
          <div style={{ fontWeight: 800, color: "#1d4ed8", fontSize: 13, marginBottom: 10 }}>🎯 Academic Goals</div>
          {(iep.goals?.academic ?? []).map((g, i) => <div key={i} style={{ fontSize: 12, color: "#1e40af", marginBottom: 6 }}>• {g}</div>)}
        </Card>
        <Card style={{ background: "#f0fdf4" }}>
          <div style={{ fontWeight: 800, color: "#065f46", fontSize: 13, marginBottom: 10 }}>⚡ Functional Goals</div>
          {(iep.goals?.functional ?? []).map((g, i) => <div key={i} style={{ fontSize: 12, color: "#065f46", marginBottom: 6 }}>• {g}</div>)}
        </Card>
      </div>

      {/* Recommendations + Accommodations */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card style={{ background: "#fffbeb" }}>
          <div style={{ fontWeight: 800, color: "#92400e", fontSize: 13, marginBottom: 10 }}>💡 Recommendations</div>
          {(iep.recommendations ?? []).map((r, i) => <div key={i} style={{ fontSize: 12, color: "#78350f", marginBottom: 6 }}>• {r}</div>)}
        </Card>
        <Card style={{ background: "#fdf4ff" }}>
          <div style={{ fontWeight: 800, color: "#5b21b6", fontSize: 13, marginBottom: 10 }}>🛡 Accommodations</div>
          {(iep.accommodations ?? []).map((a, i) => <div key={i} style={{ fontSize: 12, color: "#5b21b6", marginBottom: 6 }}>• {a}</div>)}
        </Card>
      </div>
    </div>
  );
};

// ── Weekly Evaluation Flow ──────────────────────────────────────────────────

const WeeklyEvaluationFlow = ({ parent, iepPlan, onComplete, onClose }) => {
  const [phase, setPhase]       = useState("intro");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers]   = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [evalResult, setEvalResult] = useState(null);
  const educator = assessmentService.getEducatorById(parent.assignedEducatorID);

  const loadQuestions = async () => { setPhase("loading"); const qs = await aiService.generateWeeklyEvalTest(iepPlan, parent); setQuestions(qs); setPhase("questions"); };
  const handleNext = () => { if (currentQ < questions.length - 1) setCurrentQ(c => c + 1); else submitEvaluation(); };

  const submitEvaluation = async () => {
    setPhase("evaluating");
    const answersArr = questions.map(q => { const ans = answers[q.id] ?? q.options[q.options.length - 1]; return { questionId: q.id, answer: ans, isCorrect: (q.scoring?.[ans] ?? 0) >= 2 }; });
    const earned = answersArr.reduce((s, a) => { const q = questions.find(q => q.id === a.questionId); return s + (q?.scoring?.[a.answer] ?? 0); }, 0);
    const score = Math.round((earned / (questions.length * 3)) * 100);
    const prevScore = iepPlan.previousScore ?? 50;
    const aiDecision = await aiService.makeProgressDecision(score, iepPlan.targetScore, prevScore, iepPlan, parent);
    assessmentService.saveWeeklyEvaluation(parent.id, educator?.id ?? "edu1", iepPlan.weekNumber, iepPlan.id, questions, answersArr, score, prevScore, aiDecision);
    milestoneService.updateMilestoneStatus(parent.id, iepPlan.weekNumber, aiDecision.decision);

    // Generate summary in EN + TA (v4 language fix)
    const evaluation = { score, previousScore: prevScore, improvement: score - prevScore, aiDecision: aiDecision.decision };
    const summaries = await aiService.generateSummary(parent, iepPlan, evaluation);
    summaryService.saveSummary(parent.id, iepPlan.weekNumber, summaries);

    if (aiDecision.decision === "ADVANCE") {
      assessmentService.updateIEPStatus(iepPlan.id, "Achieved");
      const nextPlanData = await aiService.generateNextWeekPlan(parent, iepPlan, { score });
      const nextPlan = assessmentService.saveNextWeekPlan(parent.id, educator?.id, iepPlan.weekNumber + 1, nextPlanData, score);
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
    <div style={{ minHeight: "100vh", background: C.gradient, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{G}</style>
      <div className="fade-in" style={{ width: "100%", maxWidth: 560 }}>
        {phase === "intro" && (
          <Card style={{ padding: 32 }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>📝</div>
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 24, color: C.primary }}>Week {iepPlan.weekNumber} Evaluation</h2>
              <p style={{ color: C.muted, marginTop: 8, fontSize: 14 }}>How did {parent.childName} do this week?</p>
            </div>
            <Alert type="info">After evaluation, a summary will be generated in English and Tamil.</Alert>
            <div style={{ display: "flex", gap: 12 }}>
              <Button onClick={onClose} variant="outline" style={{ flex: 1 }}>Back</Button>
              <Button onClick={loadQuestions} style={{ flex: 2 }}>Start Evaluation →</Button>
            </div>
          </Card>
        )}
        {phase === "loading" && (
          <Card style={{ padding: 48, textAlign: "center" }}>
            <div className="pulse" style={{ fontSize: 44, marginBottom: 16 }}>🤖</div>
            <p style={{ fontFamily: "DM Serif Display", fontSize: 20, color: C.primary }}>Generating questions…</p>
            <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}><Spinner size={32} /></div>
          </Card>
        )}
        {phase === "questions" && questions.length > 0 && (
          <Card style={{ padding: 32 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: C.muted, fontWeight: 700 }}>Q{currentQ + 1}/{questions.length}</span>
                <Badge color="purple">Week {iepPlan.weekNumber}</Badge>
              </div>
              <ProgressBar value={currentQ + 1} max={questions.length} />
            </div>
            <h3 style={{ fontFamily: "DM Serif Display", fontSize: 18, color: C.primary, marginBottom: 20, lineHeight: 1.5 }}>{questions[currentQ].text}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {questions[currentQ].options.map(opt => (
                <button key={opt} onClick={() => setAnswers(p => ({ ...p, [questions[currentQ].id]: opt }))}
                  style={{ padding: "12px 18px", borderRadius: 12, border: `2px solid ${answers[questions[currentQ].id] === opt ? C.accent : C.border}`, background: answers[questions[currentQ].id] === opt ? "#f0fdfa" : "#fff", color: answers[questions[currentQ].id] === opt ? "#0f766e" : C.text, fontFamily: "Nunito", fontWeight: answers[questions[currentQ].id] === opt ? 800 : 600, fontSize: 14, textAlign: "left", cursor: "pointer" }}>
                  {answers[questions[currentQ].id] === opt ? "✓ " : ""}{opt}
                </button>
              ))}
            </div>
            <Button onClick={handleNext} disabled={!answers[questions[currentQ].id]} size="lg" style={{ width: "100%" }}>{currentQ < questions.length - 1 ? "Next →" : "Submit →"}</Button>
          </Card>
        )}
        {phase === "evaluating" && (
          <Card style={{ padding: 48, textAlign: "center" }}>
            <div className="pulse" style={{ fontSize: 44, marginBottom: 16 }}>🤖</div>
            <p style={{ fontFamily: "DM Serif Display", fontSize: 20, color: C.primary }}>AI evaluating + generating summary in English & Tamil…</p>
            <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}><Spinner size={32} /></div>
          </Card>
        )}
        {phase === "result" && evalResult && (
          <Card style={{ padding: 32 }} className="fade-in">
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 52, marginBottom: 10 }}>{evalResult.aiDecision.decision === "ADVANCE" ? "🎉" : "💪"}</div>
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 24, color: C.primary }}>Week {iepPlan.weekNumber} Done!</h2>
              <div style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "center" }}>
                <Badge color={evalResult.aiDecision.decision === "ADVANCE" ? "green" : "orange"}>{evalResult.aiDecision.decision === "ADVANCE" ? "✅ ADVANCED" : "🔄 MODIFIED"}</Badge>
                <Badge color={evalResult.improvement >= 0 ? "green" : "red"}>{evalResult.score}/100</Badge>
              </div>
            </div>
            <div style={{ background: evalResult.aiDecision.decision === "ADVANCE" ? "#d1fae5" : "#ffedd5", borderRadius: 12, padding: 14, marginBottom: 14 }}>
              <p style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{evalResult.aiDecision.reasoning}</p>
            </div>
            {evalResult.aiDecision.encouragementMessage && (
              <div style={{ background: "#f5f3ff", borderRadius: 10, padding: 12, marginBottom: 14, textAlign: "center" }}>
                <p style={{ fontSize: 14, color: "#5b21b6", fontWeight: 600, fontStyle: "italic" }}>💬 "{evalResult.aiDecision.encouragementMessage}"</p>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, padding: 12, background: "#f0fdf4", borderRadius: 10, marginBottom: 16 }}>
              <span>🌐</span>
              <div style={{ fontSize: 13, color: "#065f46", fontWeight: 700 }}>Summary generated in English & Tamil — view in the Summaries tab!</div>
            </div>
            <Button onClick={() => onComplete()} size="lg" style={{ width: "100%" }}>Go to Dashboard →</Button>
          </Card>
        )}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 9 — AUTH PAGE
// ════════════════════════════════════════════════════════════════════════════════

const AuthPage = ({ onLogin }) => {
  const [role, setRole]   = useState("parent");
  const [mode, setMode]   = useState("login");
  const [form, setForm]   = useState({ email: "", password: "", parentName: "", childName: "", age: "", disabilityType: disabilityTypes[0], preferredLanguage: "English", name: "", educatorType: disabilityTypes[0] });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [success, setSuccess] = useState("");
  const f = key => val => setForm(p => ({ ...p, [key]: val }));

  const handleSubmit = async () => {
    setError(""); setSuccess(""); setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const res = mode === "login" ? mockAuth.login(form.email, form.password, role) : mockAuth.register(form, role);
    if (res.error) { setError(res.error); setLoading(false); return; }
    if (mode === "register") {
      const grade = role === "parent" ? curriculumEngine.getGradeFromAge(form.age) : null;
      const msg = role === "parent"
        ? `Registered! ${grade ? `Auto-assigned ${curriculumEngine.getSubjectsForGrade(grade).label}.` : ""} ${res.assignedEducator ? `Matched educator: ${res.assignedEducator.name}.` : "Educator matching in progress."}`
        : res.matchedCount > 0 ? `Registered! Matched ${res.matchedCount} waiting child(ren).` : "Registered successfully!";
      setSuccess(msg);
      setTimeout(() => onLogin(res), 2000);
    } else { onLogin(res); }
    setLoading(false);
  };

  const previewGrade = form.age ? curriculumEngine.getGradeFromAge(form.age) : null;
  const previewGradeInfo = previewGrade ? curriculumEngine.getSubjectsForGrade(previewGrade) : null;

  return (
    <div style={{ minHeight: "100vh", background: C.gradient, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{G}</style>
      <div className="fade-in" style={{ width: "100%", maxWidth: 480 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>🌱</div>
          <h1 style={{ fontFamily: "DM Serif Display", fontSize: 34, color: "#fff", marginBottom: 6 }}>EduPath</h1>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 15 }}>Special Needs Education Plan Generator — v4</p>
        </div>
        <Card style={{ padding: 32 }}>
          {/* Role toggle */}
          <div style={{ display: "flex", background: C.soft, borderRadius: 12, padding: 4, marginBottom: 24 }}>
            {["parent", "educator"].map(r => (
              <button key={r} onClick={() => setRole(r)} style={{ flex: 1, padding: "9px 0", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "Nunito", fontWeight: 700, fontSize: 14, background: role === r ? C.primary : "transparent", color: role === r ? "#fff" : C.muted, transition: "all 0.2s" }}>
                {r === "parent" ? "👨‍👩‍👧 Parent" : "👩‍🏫 Educator"}
              </button>
            ))}
          </div>
          {/* Mode toggle */}
          <div style={{ display: "flex", gap: 16, marginBottom: 24, borderBottom: `2px solid ${C.border}`, paddingBottom: 16 }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ border: "none", background: "none", cursor: "pointer", fontFamily: "Nunito", fontWeight: 700, fontSize: 15, color: mode === m ? C.secondary : C.muted, borderBottom: mode === m ? `2px solid ${C.secondary}` : "2px solid transparent", paddingBottom: 4, transition: "all 0.2s" }}>
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          {error   && <Alert type="error">{error}</Alert>}
          {success && <Alert type="success">{success}</Alert>}

          <Input label="Email"    value={form.email}    onChange={f("email")}    type="email"    placeholder="your@email.com" required />
          <Input label="Password" value={form.password} onChange={f("password")} type="password" placeholder="••••••••"       required />

          {mode === "register" && role === "educator" && (
            <>
              <Input label="Full Name"       value={form.name}         onChange={f("name")}         placeholder="Dr. Jane Smith" required />
              <Input label="Specialization"  value={form.educatorType} onChange={f("educatorType")} options={disabilityTypes}    required />
              <Alert type="info">Upon registration you will be auto-matched with waiting children of your specialization.</Alert>
            </>
          )}

          {mode === "register" && role === "parent" && (
            <>
              <Input label="Your Name"         value={form.parentName}        onChange={f("parentName")}        placeholder="Parent Full Name"  required />
              <Input label="Child's Name"      value={form.childName}         onChange={f("childName")}         placeholder="Child's Name"      required />
              <Input label="Child's Age"       value={form.age}               onChange={f("age")}               type="number" placeholder="e.g. 8" required />
              <Input label="Disability Type"   value={form.disabilityType}    onChange={f("disabilityType")}    options={disabilityTypes}       required />
              {/* v4 FIX: Only English and Tamil options shown */}
              <Input label="Preferred Language" value={form.preferredLanguage} onChange={f("preferredLanguage")} options={SUPPORTED_LANGUAGES.map(l => ({ value: l.label, label: `${l.flag} ${l.label} (${l.nativeName})` }))} required />
              {/* Live grade preview */}
              {previewGradeInfo && (
                <div style={{ marginTop: -6, marginBottom: 14, padding: "10px 14px", background: "#eff6ff", borderRadius: 10, fontSize: 12, color: "#1d4ed8", fontWeight: 700 }}>
                  📚 Age {form.age} → <strong>{previewGradeInfo.label}</strong> ({curriculumEngine.getAgeRangeForGrade(previewGrade)}) — subjects: {previewGradeInfo.subjects.map(s => s.name).join(", ")}
                </div>
              )}
            </>
          )}

          <Button onClick={handleSubmit} disabled={loading} style={{ width: "100%", marginTop: 8 }} size="lg">
            {loading
              ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}><Spinner size={18} color="#fff" />Processing…</div>
              : mode === "login" ? "Sign In →" : "Create Account →"}
          </Button>

          {mode === "login" && (
            <div style={{ marginTop: 20, padding: 14, background: C.soft, borderRadius: 10, fontSize: 12, color: C.muted }}>
              <strong style={{ color: C.primary }}>Demo accounts:</strong><br />
              👨‍👩‍👧 Parent (Tamil · Grade 4): meera@parent.com / pass123<br />
              👨‍👩‍👧 Parent (English · Grade 6): suresh@parent.com / pass123<br />
              👨‍👩‍👧 Parent (Tamil · Grade 10): anand@parent.com / pass123<br />
              🆕 New User (Tamil · Grade 3): lakshmi@parent.com / pass123<br />
              👩‍🏫 Educator: priya@edu.com / pass123
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 10 — EDUCATOR DASHBOARD
// ════════════════════════════════════════════════════════════════════════════════

const EducatorDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab]   = useState("overview");
  const [selectedChild, setSelectedChild] = useState(null);
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiPlan, setAiPlan]         = useState(null);
  const [editPlan, setEditPlan]     = useState(null);
  const [assessForm, setAssessForm] = useState({ communication: 50, motor: 50, cognitive: 50, social: 50, emotional: 50 });
  const [notification, setNotification] = useState("");
  const [saving, setSaving]         = useState(false);
  const [feedbackList, setFeedbackList] = useState([]);

  const educator = assessmentService.getEducatorById(user.userId);
  const children = educator?.assignedChildren?.map(id => assessmentService.getParentById(id)).filter(Boolean) ?? [];
  const unread   = assessmentService.getFeedbackByEducator(user.userId).filter(f => !f.isRead).length;

  useEffect(() => { setFeedbackList(assessmentService.getFeedbackByEducator(user.userId)); }, [user.userId]);
  const notify = msg => { setNotification(msg); setTimeout(() => setNotification(""), 3500); };

  const handleGenIEP = async () => {
    if (!selectedChild) return;
    const asss = assessmentService.getAssessmentsByChild(selectedChild.id);
    const latest = asss[asss.length - 1];
    if (!latest) { notify("⚠️ Add an assessment first."); return; }
    setAiLoading(true);
    const plan = await aiService.generateNextWeekPlan(selectedChild, { weekNumber: asss.length, learningOutcome: "Build on existing skills" }, { score: latest.score });
    setAiPlan(plan); setEditPlan({ ...plan, weeklyPlan: plan.weeklyPlan.map(d => ({ ...d })) });
    setAiLoading(false); setActiveTab("iep");
  };

  const handleSaveIEP = async () => {
    if (!editPlan || !selectedChild) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    const asss = assessmentService.getAssessmentsByChild(selectedChild.id);
    const latest = asss[asss.length - 1];
    const newPlan = { id: "iep" + Date.now(), childID: selectedChild.id, educatorID: user.userId, weeklyPlan: editPlan.weeklyPlan, learningOutcome: editPlan.learningOutcome, status: "ONGOING", weekNumber: asss.length, aiGenerated: true, editedByEducator: true, previousScore: latest?.score ?? 0, targetScore: editPlan.targetScore ?? ((latest?.score ?? 50) + 12), createdAt: new Date().toISOString() };
    mockDB.iepPlans.push(newPlan);
    const milestones = await aiService.generateMilestones(newPlan, selectedChild);
    milestoneService.saveMilestones(selectedChild.id, newPlan.weekNumber, milestones);
    notify("✅ IEP Plan + Milestones saved!");
    setAiPlan(null); setEditPlan(null); setSaving(false);
  };

  const handleAddAssessment = () => {
    if (!selectedChild) return;
    const vals = Object.values(assessForm).map(Number);
    const score = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    const prev = assessmentService.getAssessmentsByChild(selectedChild.id);
    mockDB.assessments.push({ id: "ass" + Date.now(), childID: selectedChild.id, educatorID: user.userId, testDetails: { ...assessForm }, score, date: new Date().toISOString().slice(0, 10), weekNumber: prev.length + 1 });
    notify(`✅ Assessment saved. Score: ${score}/100`);
  };

  const tabs = [
    { id: "overview",   label: "🏠 Overview" },
    { id: "curriculum", label: "📚 Curriculum" },
    { id: "assess",     label: "📊 Assess" },
    { id: "iep",        label: "🎓 IEP Plans" },
    { id: "milestones", label: "🏁 Milestones" },
    { id: "progress",   label: "📈 Progress" },
    { id: "feedback",   label: `💬 Feedback${unread > 0 ? ` (${unread})` : ""}` },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f4f8fd" }}>
      <style>{G}</style>
      {/* Header */}
      <div style={{ background: C.gradient, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 28 }}>🌱</span>
          <div><div style={{ fontFamily: "DM Serif Display", fontSize: 20, color: "#fff" }}>EduPath</div><div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Educator Portal · v4</div></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right" }}><div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{educator?.name}</div><div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{educator?.educatorType} Specialist</div></div>
          <Button onClick={onLogout} variant="outline" size="sm" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.4)" }}>Logout</Button>
        </div>
      </div>
      {notification && <div style={{ background: C.success, color: "#fff", padding: "12px 24px", textAlign: "center", fontWeight: 700 }}>{notification}</div>}

      <div style={{ display: "flex", minHeight: "calc(100vh - 72px)" }}>
        {/* Sidebar */}
        <div style={{ width: 230, background: "#fff", borderRight: `1px solid ${C.border}`, padding: "24px 0", flexShrink: 0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ width: "100%", textAlign: "left", padding: "11px 20px", border: "none", background: activeTab === t.id ? C.soft : "transparent", color: activeTab === t.id ? C.primary : C.muted, fontFamily: "Nunito", fontWeight: activeTab === t.id ? 800 : 600, fontSize: 13, cursor: "pointer", borderLeft: activeTab === t.id ? `4px solid ${C.secondary}` : "4px solid transparent", transition: "all 0.2s" }}>
              {t.label}
            </button>
          ))}
          {/* Student list */}
          {children.length > 0 && (
            <div style={{ padding: "16px 12px" }}>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 8, paddingLeft: 8 }}>STUDENTS ({children.length})</div>
              {children.map(c => {
                const grade = curriculumEngine.getGradeFromAge(c.age);
                const gInfo = curriculumEngine.getSubjectsForGrade(grade);
                return (
                  <button key={c.id} onClick={() => setSelectedChild(c)}
                    style={{ width: "100%", textAlign: "left", padding: "9px 10px", border: "none", borderRadius: 10, cursor: "pointer", marginBottom: 4, background: selectedChild?.id === c.id ? "#dbeafe" : "transparent", fontFamily: "Nunito", transition: "background 0.2s" }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: C.primary }}>{c.childName}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{c.disabilityType} · {gInfo.label}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, padding: 28, overflow: "auto" }}>
          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: C.primary, marginBottom: 20 }}>Overview</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
                {[
                  { label: "Total Students", value: children.length,    icon: "👶", color: "#dbeafe" },
                  { label: "Total Plans",    value: mockDB.iepPlans.filter(p => p.educatorID === user.userId).length, icon: "📋", color: "#d1fae5" },
                  { label: "Unread Feedback",value: unread,             icon: "💬", color: unread > 0 ? "#ffedd5" : "#f0fdf4" },
                ].map(s => (
                  <Card key={s.label} style={{ background: s.color, border: "none", textAlign: "center", padding: "16px 12px" }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{s.icon}</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: C.primary }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: C.muted, fontWeight: 700 }}>{s.label}</div>
                  </Card>
                ))}
              </div>
              {children.map(c => {
                const grade = curriculumEngine.getGradeFromAge(c.age);
                const gInfo = curriculumEngine.getSubjectsForGrade(grade);
                const asss  = assessmentService.getAssessmentsByChild(c.id);
                const lastScore = asss[asss.length - 1]?.score;
                return (
                  <Card key={c.id} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 16, color: C.primary }}>{c.childName}</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{c.disabilityType} · Age {c.age} · {gInfo.label} · {c.uniqueChildID}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {lastScore !== undefined && <Badge color={lastScore >= 70 ? "green" : lastScore >= 40 ? "orange" : "red"}>{lastScore}/100</Badge>}
                        <Badge color="teal">{c.preferredLanguage}</Badge>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {gInfo.subjects.map(s => <span key={s.name} style={{ background: "#eff6ff", color: "#1d4ed8", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{s.icon} {s.name}</span>)}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* CURRICULUM — Extended to Grade 12 */}
          {activeTab === "curriculum" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: C.primary, marginBottom: 8 }}>Grade-Based Curriculum</h2>
              <p style={{ color: C.muted, marginBottom: 20 }}>Age-to-grade mapping (Grade 1–12) and subject allocations used to generate personalised IEPs.</p>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(grade => {
                const info = curriculumEngine.getSubjectsForGrade(grade);
                const myKids = children.filter(c => curriculumEngine.getGradeFromAge(c.age) === grade);
                return (
                  <Card key={grade} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 900, color: C.primary, fontSize: 16 }}>{info.label}</div>
                        <div style={{ fontSize: 12, color: C.muted }}>{curriculumEngine.getAgeRangeForGrade(grade)}</div>
                      </div>
                      {myKids.length > 0 && <Badge color="teal">{myKids.map(c => c.childName).join(", ")}</Badge>}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                      {info.subjects.map(s => (
                        <div key={s.name} style={{ padding: 10, background: C.soft, borderRadius: 10 }}>
                          <div style={{ fontWeight: 800, fontSize: 13 }}>{s.icon} {s.name}</div>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{s.focus}</div>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* ASSESS */}
          {activeTab === "assess" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: C.primary, marginBottom: 20 }}>Assess & Generate Plan</h2>
              {!selectedChild ? <Alert type="warning">Select a student from the sidebar.</Alert> : (
                <Card>
                  <div style={{ fontWeight: 900, color: C.primary, marginBottom: 16 }}>Assessing: {selectedChild.childName} · {curriculumEngine.getSubjectsForGrade(curriculumEngine.getGradeFromAge(selectedChild.age)).label}</div>
                  {Object.keys(assessForm).map(field => (
                    <div key={field} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <label style={{ fontWeight: 700, fontSize: 13, color: C.primary, textTransform: "capitalize" }}>{field}</label>
                        <span style={{ fontWeight: 800, color: C.accent }}>{assessForm[field]}</span>
                      </div>
                      <input type="range" min={0} max={100} value={assessForm[field]} onChange={e => setAssessForm(p => ({ ...p, [field]: e.target.value }))} style={{ width: "100%", accentColor: C.accent }} />
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

          {/* IEP PLANS */}
          {activeTab === "iep" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: C.primary, marginBottom: 20 }}>IEP Plans</h2>
              {editPlan && aiPlan ? (
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <h3 style={{ fontWeight: 800, color: C.primary }}>✏️ Review & Edit AI Plan</h3>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button onClick={handleSaveIEP} disabled={saving} variant="secondary">{saving ? "Saving…" : "Save & Send ✓"}</Button>
                      <Button onClick={() => { setAiPlan(null); setEditPlan(null); }} variant="outline">Cancel</Button>
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontWeight: 700, fontSize: 13, color: C.primary, display: "block", marginBottom: 6 }}>Learning Outcome</label>
                    <input value={editPlan.learningOutcome} onChange={e => setEditPlan(p => ({ ...p, learningOutcome: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: "Nunito", fontSize: 14, outline: "none" }} />
                  </div>
                  {editPlan.weeklyPlan.map((day, i) => (
                    <div key={i} style={{ padding: 14, background: C.soft, borderRadius: 12, marginBottom: 10 }}>
                      <div style={{ fontWeight: 800, color: C.secondary, marginBottom: 8 }}>{day.day}</div>
                      {["activity", "goal", "materials"].map(field => (
                        <input key={field} value={day[field]} onChange={e => { const wp = [...editPlan.weeklyPlan]; wp[i] = { ...wp[i], [field]: e.target.value }; setEditPlan(p => ({ ...p, weeklyPlan: wp })); }} placeholder={field} style={{ display: "block", width: "100%", padding: "7px 10px", marginBottom: 6, border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: "Nunito", fontSize: 13, outline: "none" }} />
                      ))}
                    </div>
                  ))}
                </Card>
              ) : (
                <div>
                  {mockDB.iepPlans.filter(p => p.educatorID === user.userId).length === 0 && <Alert type="info">No IEP plans yet. Go to Assess tab.</Alert>}
                  {mockDB.iepPlans.filter(p => p.educatorID === user.userId).slice().reverse().map(plan => {
                    const child = assessmentService.getParentById(plan.childID);
                    return (
                      <Card key={plan.id} style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                          <div>
                            <div style={{ fontWeight: 900, fontSize: 16, color: C.primary }}>Week {plan.weekNumber} — {child?.childName}</div>
                            <div style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>{plan.learningOutcome}</div>
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <Badge color={plan.status === "Achieved" ? "green" : "teal"}>{plan.status}</Badge>
                            {plan.aiModified && <Badge color="purple">AI Modified</Badge>}
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
                          {plan.weeklyPlan.map((day, i) => (
                            <div key={i} style={{ padding: 10, background: C.soft, borderRadius: 10 }}>
                              <div style={{ fontWeight: 800, fontSize: 12, color: C.secondary }}>{day.day}</div>
                              <div style={{ fontSize: 11, color: C.text, marginTop: 3 }}>{day.activity}</div>
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

          {/* MILESTONES */}
          {activeTab === "milestones" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: C.primary, marginBottom: 20 }}>Milestones</h2>
              {!selectedChild ? <Alert type="info">Select a student to view milestones.</Alert> : (
                milestoneService.getMilestonesByChild(selectedChild.id).length === 0
                  ? <Alert type="info">No milestones yet. Generate an IEP plan first.</Alert>
                  : milestoneService.getMilestonesByChild(selectedChild.id).map(rec => (
                    <Card key={rec.id} style={{ marginBottom: 14 }}>
                      <MilestoneTracker childId={selectedChild.id} week={rec.week} refreshKey={0} />
                    </Card>
                  ))
              )}
            </div>
          )}

          {/* PROGRESS */}
          {activeTab === "progress" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: C.primary, marginBottom: 20 }}>Progress</h2>
              {!selectedChild
                ? children.length > 0
                  ? children.map(c => <Card key={c.id} style={{ marginBottom: 20 }}><div style={{ fontWeight: 800, color: C.primary, marginBottom: 12 }}>{c.childName}</div><ProgressGraph childId={c.id} /></Card>)
                  : <Alert type="info">No students assigned.</Alert>
                : <Card><div style={{ fontWeight: 800, color: C.primary, marginBottom: 12 }}>{selectedChild.childName}</div><ProgressGraph childId={selectedChild.id} /></Card>
              }
            </div>
          )}

          {/* FEEDBACK */}
          {activeTab === "feedback" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: C.primary, marginBottom: 20 }}>Parent Feedback</h2>
              {feedbackList.length === 0 && <Alert type="info">No feedback received yet.</Alert>}
              {feedbackList.map(fb => {
                const p = assessmentService.getParentById(fb.parentID);
                return (
                  <Card key={fb.id} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <div><span style={{ fontWeight: 800, color: C.primary }}>{p?.parentName}</span><span style={{ color: C.muted, fontSize: 12, marginLeft: 8 }}>re: {p?.childName}</span></div>
                      <div style={{ display: "flex", gap: 8 }}><span style={{ color: "#f5a623" }}>{"★".repeat(fb.rating)}</span><span style={{ fontSize: 12, color: C.muted }}>{fb.date}</span>{!fb.isRead && <Badge color="orange">New</Badge>}</div>
                    </div>
                    <p style={{ fontSize: 14, color: C.text }}>{fb.message}</p>
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

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 11 — PARENT DASHBOARD
// ════════════════════════════════════════════════════════════════════════════════

const ParentDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab]     = useState("overview");
  const [notification, setNotification] = useState("");
  const [fbMsg, setFbMsg]             = useState("");
  const [fbRating, setFbRating]       = useState(5);
  const [fbSubmitting, setFbSubmitting] = useState(false);
  const [showWeeklyEval, setShowWeeklyEval] = useState(false);
  const [selectedEvalPlan, setSelectedEvalPlan] = useState(null);
  const [refreshKey, setRefreshKey]   = useState(0);

  const parent     = assessmentService.getParentById(user.userId);
  const educator   = assessmentService.getEducatorById(parent?.assignedEducatorID);
  const assessments = assessmentService.getAssessmentsByChild(user.userId);
  const iepPlans   = assessmentService.getIEPByChild(user.userId);
  const myFeedback = assessmentService.getFeedbackByParent(user.userId);
  const latestPlan = iepPlans[iepPlans.length - 1];
  const latestScore = assessments[assessments.length - 1]?.score;
  const trend       = assessments.length >= 2 ? assessments[assessments.length - 1].score - assessments[assessments.length - 2].score : 0;
  const initAssmt  = assessmentService.getInitialAssessment(user.userId);
  const weeklyEvals = assessmentService.getWeeklyEvaluations(user.userId);
  const grade       = curriculumEngine.getGradeFromAge(parent?.age);
  const gradeInfo   = curriculumEngine.getSubjectsForGrade(grade);

  const notify = msg => { setNotification(msg); setTimeout(() => setNotification(""), 3500); };

  const handleFeedback = async () => {
    if (!fbMsg.trim() || !educator) return;
    setFbSubmitting(true);
    await new Promise(r => setTimeout(r, 600));
    mockDB.feedback.push({ id: "fb" + Date.now(), parentID: user.userId, educatorID: educator.id, childID: user.userId, message: fbMsg, rating: fbRating, date: new Date().toISOString().slice(0, 10), isRead: false });
    notify("✅ Feedback sent!"); setFbMsg(""); setFbRating(5); setFbSubmitting(false);
  };

  const handleStartEval = plan => { setSelectedEvalPlan(plan); setShowWeeklyEval(true); };
  const handleEvalComplete = () => {
    setShowWeeklyEval(false); setSelectedEvalPlan(null);
    setRefreshKey(k => k + 1);
    notify("✅ Evaluation complete! Summary available in English & Tamil.");
    setActiveTab("overview");
  };

  if (showWeeklyEval && selectedEvalPlan) {
    return <WeeklyEvaluationFlow parent={parent} iepPlan={selectedEvalPlan} onComplete={handleEvalComplete} onClose={() => setShowWeeklyEval(false)} />;
  }

  const cycleStatus = () => {
    if (!initAssmt) return { step: 0, label: "Awaiting Initial Assessment", color: C.muted };
    if (iepPlans.length === 0) return { step: 1, label: "Week 1 Plan Pending", color: C.warning };
    if (weeklyEvals.length === 0) return { step: 2, label: "Ready for Week 1 Evaluation", color: C.accent };
    const last = weeklyEvals[weeklyEvals.length - 1];
    return last.aiDecision === "ADVANCE"
      ? { step: 3, label: `Week ${last.weekNumber + 1} Plan Ready`, color: C.success }
      : { step: 3, label: "Plan Being Adapted",                     color: C.warning };
  };

  const tabs = [
    { id: "overview",    label: "🏠 Overview" },
    { id: "iep",         label: "🎓 My IEP" },
    { id: "plans",       label: "📋 Weekly Plans" },
    { id: "milestones",  label: "🏁 Milestones" },
    { id: "progress",    label: "📈 Progress" },
    { id: "summaries",   label: "📝 Summaries" },
    { id: "evaluations", label: "📊 Evaluations" },
    { id: "feedback",    label: "💬 Feedback" },
  ];

  const cycle = cycleStatus();

  return (
    <div style={{ minHeight: "100vh", background: "#f4f8fd" }} key={refreshKey}>
      <style>{G}</style>
      {/* Header */}
      <div style={{ background: C.gradient, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 28 }}>🌱</span>
          <div><div style={{ fontFamily: "DM Serif Display", fontSize: 20, color: "#fff" }}>EduPath</div><div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Parent Portal · v4</div></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{parent?.parentName}</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{parent?.childName} · {gradeInfo.label} · {parent?.uniqueChildID}</div>
          </div>
          <Button onClick={onLogout} variant="outline" size="sm" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.4)" }}>Logout</Button>
        </div>
      </div>
      {notification && <div style={{ background: C.success, color: "#fff", padding: "12px 24px", textAlign: "center", fontWeight: 700 }}>{notification}</div>}
      {!educator && <div style={{ background: "#fffbeb", borderLeft: `4px solid ${C.warning}`, padding: "12px 24px", fontSize: 13, fontWeight: 700, color: "#92400e" }}>⏳ Finding a suitable educator for your child. Your IEP is ready to view in the meantime.</div>}

      <div style={{ display: "flex", minHeight: "calc(100vh - 72px)" }}>
        {/* Sidebar */}
        <div style={{ width: 230, background: "#fff", borderRight: `1px solid ${C.border}`, padding: "24px 0", flexShrink: 0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ width: "100%", textAlign: "left", padding: "11px 20px", border: "none", background: activeTab === t.id ? C.soft : "transparent", color: activeTab === t.id ? C.primary : C.muted, fontFamily: "Nunito", fontWeight: activeTab === t.id ? 800 : 600, fontSize: 13, cursor: "pointer", borderLeft: activeTab === t.id ? `4px solid ${C.secondary}` : "4px solid transparent", transition: "all 0.2s" }}>
              {t.label}
            </button>
          ))}
          {/* Educator card */}
          <div style={{ margin: "16px", padding: 12, background: educator ? "#d1fae5" : "#fff7ed", borderRadius: 12, border: `1px solid ${educator ? "#6ee7b7" : "#fed7aa"}` }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 4 }}>Educator</div>
            {educator ? (<><div style={{ fontWeight: 800, color: C.primary, fontSize: 13 }}>{educator.name}</div><div style={{ fontSize: 11, color: C.muted }}>{educator.educatorType}</div></>) : <div style={{ color: "#92400e", fontSize: 12, fontWeight: 700 }}>⏳ Finding match…</div>}
          </div>
          {/* Grade + language info */}
          <div style={{ margin: "0 16px", padding: 12, background: "#eff6ff", borderRadius: 12 }}>
            <div style={{ fontSize: 11, color: "#1d4ed8", fontWeight: 700 }}>📚 {gradeInfo.label} ({curriculumEngine.getAgeRangeForGrade(grade)})</div>
            <div style={{ fontSize: 11, color: "#1d4ed8", marginTop: 3 }}>🌐 {parent?.preferredLanguage}</div>
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, padding: 28, overflow: "auto" }}>

          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: C.primary, marginBottom: 8 }}>Welcome, {parent?.parentName?.split(" ")[0]}! 💙</h2>
              <p style={{ color: C.muted, marginBottom: 20 }}>{parent?.childName}'s learning journey at a glance.</p>

              {/* Learning cycle status */}
              <div style={{ background: `${cycle.color}15`, border: `2px solid ${cycle.color}40`, borderRadius: 14, padding: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: cycle.color }} />
                <div>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>LEARNING CYCLE</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.primary }}>{cycle.label}</div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  {["Assessment", "Plan", "Evaluate", "Advance"].map((s, i) => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i < cycle.step ? C.success : i === cycle.step ? cycle.color : C.border }} title={s} />
                  ))}
                </div>
              </div>

              {/* Grade banner */}
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 14, padding: 14, marginBottom: 20 }}>
                <div style={{ fontWeight: 800, color: "#1d4ed8", marginBottom: 8 }}>📚 {gradeInfo.label} Curriculum ({curriculumEngine.getAgeRangeForGrade(grade)})</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {gradeInfo.subjects.map(s => <span key={s.name} style={{ background: "#dbeafe", color: "#1d4ed8", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{s.icon} {s.name}</span>)}
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 20 }}>
                {[
                  { label: "Current Score", value: latestScore !== undefined ? `${latestScore}/100` : "—", icon: "🎯", color: "#dbeafe" },
                  { label: "Week Trend",    value: trend !== 0 ? `${trend >= 0 ? "+" : ""}${trend}` : "—", icon: trend >= 0 ? "📈" : "📉", color: trend >= 0 ? "#d1fae5" : "#fee2e2" },
                  { label: "IEP Plans",    value: iepPlans.length,     icon: "📋", color: "#ffedd5" },
                  { label: "Evaluations",  value: weeklyEvals.length,  icon: "📊", color: "#ede9fe" },
                ].map(stat => (
                  <Card key={stat.label} style={{ background: stat.color, border: "none", textAlign: "center", padding: "16px 12px" }}>
                    <div style={{ fontSize: 26, marginBottom: 6 }}>{stat.icon}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: C.primary }}>{stat.value}</div>
                    <div style={{ fontSize: 12, color: C.muted, fontWeight: 700 }}>{stat.label}</div>
                  </Card>
                ))}
              </div>

              {latestPlan && milestoneService.getMilestonesByWeek(user.userId, latestPlan.weekNumber) && (
                <Card style={{ marginBottom: 18 }}>
                  <div style={{ fontWeight: 800, color: C.primary, marginBottom: 12 }}>🏁 Week {latestPlan.weekNumber} Milestones</div>
                  <MilestoneTracker childId={user.userId} week={latestPlan.weekNumber} refreshKey={refreshKey} />
                </Card>
              )}

              {assessments.length > 0 && (
                <Card><div style={{ fontWeight: 800, color: C.primary, marginBottom: 12 }}>📈 Progress</div><ProgressGraph childId={user.userId} /></Card>
              )}
            </div>
          )}

          {/* MY IEP */}
          {activeTab === "iep" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: C.primary, marginBottom: 20 }}>🎓 {parent?.childName}'s IEP</h2>
              <IEPViewer userId={user.userId} childName={parent?.childName} />
            </div>
          )}

          {/* WEEKLY PLANS */}
          {activeTab === "plans" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: C.primary, marginBottom: 20 }}>Weekly Plans</h2>
              {iepPlans.length === 0 && <Alert type="info">No plans yet. Your educator will generate one after your child's assessment.</Alert>}
              {iepPlans.slice().reverse().map(plan => (
                <Card key={plan.id} style={{ marginBottom: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 18, color: C.primary }}>Week {plan.weekNumber} Plan</div>
                      <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>{plan.learningOutcome}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Badge color={plan.status === "Achieved" ? "green" : "teal"}>{plan.status}</Badge>
                      {plan.aiModified && <Badge color="purple">AI Modified</Badge>}
                      {!assessmentService.hasPendingEvaluation(user.userId, plan.weekNumber) && (
                        <Button onClick={() => handleStartEval(plan)} size="sm" variant="secondary">📝 Evaluate</Button>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(145px, 1fr))", gap: 10 }}>
                    {plan.weeklyPlan.map((day, i) => (
                      <div key={i} style={{ padding: 12, background: ["#eff6ff","#f0fdf4","#fffbeb","#fdf4ff","#fef2f2"][i % 5], borderRadius: 12 }}>
                        <div style={{ fontWeight: 800, fontSize: 12, color: C.primary, marginBottom: 4 }}>{day.day}</div>
                        <div style={{ fontSize: 11, fontWeight: 600 }}>{day.activity}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>🎯 {day.goal}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* MILESTONES */}
          {activeTab === "milestones" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: C.primary, marginBottom: 20 }}>🏁 Milestones</h2>
              <p style={{ color: C.muted, marginBottom: 20 }}>Auto-updated after each evaluation. Tap any milestone to toggle.</p>
              {milestoneService.getMilestonesByChild(user.userId).length === 0
                ? <Alert type="info">Milestones appear automatically when your educator creates a plan.</Alert>
                : milestoneService.getMilestonesByChild(user.userId).map(rec => (
                  <Card key={rec.id} style={{ marginBottom: 14 }}>
                    <MilestoneTracker childId={user.userId} week={rec.week} refreshKey={refreshKey} />
                  </Card>
                ))
              }
            </div>
          )}

          {/* PROGRESS */}
          {activeTab === "progress" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: C.primary, marginBottom: 20 }}>📈 Progress Graph</h2>
              <Card><ProgressGraph childId={user.userId} /></Card>
            </div>
          )}

          {/* SUMMARIES — EN + TA toggle (v4 language fix) */}
          {activeTab === "summaries" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: C.primary, marginBottom: 8 }}>📝 Weekly Summaries</h2>
              <p style={{ color: C.muted, marginBottom: 4 }}>AI-generated summaries in English and Tamil.</p>
              <Alert type="info" style={{ marginBottom: 16 }}>
                <strong>v4 Language Update:</strong> Summaries are now generated in English and Tamil only — both languages are fully reliable. Selecting other languages previously showed incorrect or missing content.
              </Alert>
              <WeeklySummaryCard childId={user.userId} preferredLanguage={parent?.preferredLanguage} />
            </div>
          )}

          {/* EVALUATIONS */}
          {activeTab === "evaluations" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: C.primary, marginBottom: 20 }}>Weekly Evaluations</h2>
              {weeklyEvals.length === 0 ? (
                <div>
                  <Alert type="info">No evaluations yet. Start one from the Plans tab.</Alert>
                  {latestPlan && !assessmentService.hasPendingEvaluation(user.userId, latestPlan.weekNumber) && (
                    <Card style={{ textAlign: "center", padding: 32 }}>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
                      <h3 style={{ fontWeight: 800, color: C.primary, marginBottom: 8 }}>Week {latestPlan.weekNumber} Evaluation Ready</h3>
                      <Button onClick={() => handleStartEval(latestPlan)} size="lg">Start →</Button>
                    </Card>
                  )}
                </div>
              ) : weeklyEvals.slice().reverse().map(ev => (
                <Card key={ev.id} style={{ marginBottom: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 18, color: C.primary }}>Week {ev.weekNumber}</div>
                      <div style={{ fontSize: 13, color: C.muted }}>{ev.completedAt}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Badge color={ev.aiDecision === "ADVANCE" ? "green" : "orange"}>{ev.aiDecision === "ADVANCE" ? "✅ ADVANCED" : "🔄 MODIFIED"}</Badge>
                      <Badge color={ev.improvement >= 0 ? "green" : "red"}>{ev.score}/100 ({ev.improvement >= 0 ? "+" : ""}{ev.improvement})</Badge>
                    </div>
                  </div>
                  <div style={{ background: ev.aiDecision === "ADVANCE" ? "#d1fae5" : "#ffedd5", borderRadius: 12, padding: 14, marginBottom: 12 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6, color: ev.aiDecision === "ADVANCE" ? "#065f46" : "#9a3412" }}>🤖 AI Reasoning</div>
                    <p style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{ev.aiReasoning}</p>
                  </div>
                  {ev.encouragementMessage && (
                    <div style={{ background: "#f5f3ff", borderRadius: 10, padding: 12, textAlign: "center" }}>
                      <p style={{ fontSize: 14, color: "#5b21b6", fontWeight: 600, fontStyle: "italic" }}>💬 "{ev.encouragementMessage}"</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* FEEDBACK */}
          {activeTab === "feedback" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: C.primary, marginBottom: 20 }}>Send Feedback</h2>
              {!educator && <Alert type="warning">No educator assigned yet. Feedback will be available once matched.</Alert>}
              {educator  && <Alert type="info">Sending to: <strong>{educator.name}</strong> ({educator.educatorType})</Alert>}
              <Card style={{ marginBottom: 20, maxWidth: 560 }}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontWeight: 700, fontSize: 13, color: C.primary, marginBottom: 8 }}>Rating</label>
                  <div style={{ display: "flex", gap: 8 }}>{[1,2,3,4,5].map(r => <button key={r} onClick={() => setFbRating(r)} style={{ fontSize: 28, border: "none", background: "none", cursor: "pointer", opacity: r <= fbRating ? 1 : 0.3 }}>★</button>)}</div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontWeight: 700, fontSize: 13, color: C.primary, marginBottom: 8 }}>Message</label>
                  <textarea value={fbMsg} onChange={e => setFbMsg(e.target.value)} placeholder="Share observations, concerns, or appreciation…" rows={4} style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: "Nunito", fontSize: 14, resize: "vertical", outline: "none" }} />
                </div>
                <Button onClick={handleFeedback} variant="secondary" size="lg" disabled={fbSubmitting || !educator}>{fbSubmitting ? "Sending…" : "Send Feedback →"}</Button>
              </Card>
              {myFeedback.map(fb => (
                <Card key={fb.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: C.muted }}>{fb.date}</span>
                    <span style={{ color: "#f5a623" }}>{"★".repeat(fb.rating)}</span>
                  </div>
                  <p style={{ fontSize: 14, color: C.text }}>{fb.message}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 12 — ROOT APP
// isNewUser → MultiDomainAssessmentFlow → Dashboard
// ════════════════════════════════════════════════════════════════════════════════

export default function App() {
  const [auth, setAuth]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAssessment, setShowAssessment] = useState(false);

  useEffect(() => {
    const token  = localStorage.getItem("snep_token");
    const role   = localStorage.getItem("snep_role");
    const userId = localStorage.getItem("snep_userId");
    if (token && role && userId) {
      setAuth({ token, role, userId });
      if (role === "parent") {
        const parent = assessmentService.getParentById(userId);
        if (parent?.isNewUser && !assessmentService.hasCompletedInitialAssessment(userId)) {
          setShowAssessment(true);
        }
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = useCallback(res => {
    localStorage.setItem("snep_token", res.token);
    localStorage.setItem("snep_role",  res.role);
    localStorage.setItem("snep_userId", res.user.id);
    setAuth({ token: res.token, role: res.role, userId: res.user.id });
    if (res.role === "parent" && (res.requiresInitialAssessment || res.user.isNewUser)) {
      setShowAssessment(true);
    }
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("snep_token");
    localStorage.removeItem("snep_role");
    localStorage.removeItem("snep_userId");
    setAuth(null); setShowAssessment(false);
  }, []);

  const handleAssessmentComplete = useCallback(() => {
    setShowAssessment(false);
  }, []);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: C.gradient }}>
      <style>{G}</style>
      <Spinner size={48} color="#fff" />
    </div>
  );

  if (!auth) return <AuthPage onLogin={handleLogin} />;

  if (auth.role === "parent" && showAssessment) {
    const parent = assessmentService.getParentById(auth.userId);
    return <MultiDomainAssessmentFlow parent={parent} onComplete={handleAssessmentComplete} />;
  }

  if (auth.role === "educator") return <EducatorDashboard user={auth} onLogout={handleLogout} />;
  if (auth.role === "parent")   return <ParentDashboard   user={auth} onLogout={handleLogout} />;
  return <AuthPage onLogin={handleLogin} />;
}

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * BACKEND CODE  (Node.js + Express + MongoDB)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * /models/User.js
 * ───────────────
 * const userSchema = new mongoose.Schema({
 *   parentName:           { type: String, required: true },
 *   childName:            { type: String, required: true },
 *   age:                  { type: Number, required: true },
 *   disabilityType:       { type: String, required: true },
 *   email:                { type: String, required: true, unique: true },
 *   password:             { type: String, required: true },
 *   preferredLanguage:    { type: String, enum: ["English", "Tamil"], default: "English" },
 *   uniqueChildID:        { type: String },
 *   assignedEducatorID:   { type: mongoose.Schema.Types.ObjectId, ref: "Educator" },
 *   isNewUser:            { type: Boolean, default: true },
 *   initialAssessmentDone:{ type: Boolean, default: false },
 *   gradeLevel:           { type: Number },  // computed: age - 4 (clamped 1–12)
 * }, { timestamps: true });
 *
 * /models/Assessment.js
 * ──────────────────────
 * const assessmentSchema = new mongoose.Schema({
 *   userId:              { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
 *   iqScore:             { type: Number, min: 0, max: 100 },
 *   cognitiveScore:      { type: Number, min: 0, max: 100 },
 *   motorScore:          { type: Number, min: 0, max: 100 },
 *   communicationScore:  { type: Number, min: 0, max: 100 },
 *   overallLevel:        { type: String, enum: ["LOW", "MEDIUM", "HIGH"] },
 *   breakdown:           { type: mongoose.Schema.Types.Mixed },
 *   completedAt:         { type: Date, default: Date.now },
 * });
 *
 * /models/EducationPlan.js
 * ─────────────────────────
 * const educationPlanSchema = new mongoose.Schema({
 *   userId:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
 *   gradeLevel:   { type: Number, required: true },
 *   subjects:     [{ name: String, icon: String, gradeGoal: String, modifiedGoal: String }],
 *   goals:        { academic: [String], functional: [String] },
 *   recommendations: [String],
 *   accommodations:  [String],
 *   generatedAt:     { type: Date, default: Date.now },
 * });
 *
 * /routes/assessment.js
 * ──────────────────────
 * // POST /api/assessment
 * router.post("/", async (req, res) => {
 *   const { userId, domainScores } = req.body;
 *   const total = (domainScores.iq + domainScores.cognitive + domainScores.motor + domainScores.communication) / 4;
 *   const overallLevel = total < 40 ? "LOW" : total < 70 ? "MEDIUM" : "HIGH";
 *   const record = await Assessment.findOneAndUpdate(
 *     { userId },
 *     { ...domainScores.map(k => ({ [k + "Score"]: domainScores[k] })), overallLevel },
 *     { upsert: true, new: true }
 *   );
 *   res.json({ success: true, record });
 * });
 *
 * /routes/educationPlan.js
 * ─────────────────────────
 * // GET /api/education-plan/:userId
 * router.get("/:userId", async (req, res) => {
 *   const user       = await User.findById(req.params.userId);
 *   const assessment = await Assessment.findOne({ userId: req.params.userId });
 *   const grade      = getGradeFromAge(user.age);       // age - 4, clamped 1–12
 *   const gradeInfo  = getSubjectsForGrade(grade);
 *
 *   // IF new user: assessment must exist
 *   if (user.isNewUser && !assessment) return res.status(400).json({ error: "Complete assessment first" });
 *
 *   let plan = await EducationPlan.findOne({ userId: req.params.userId });
 *   if (!plan) {
 *     // Generate via AI, save to DB
 *     const iepData = await generateIEP(user, assessment, grade, gradeInfo);
 *     plan = await EducationPlan.create({ userId: user._id, ...iepData });
 *   }
 *   res.json(plan);
 * });
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SAMPLE IEP OUTPUT JSON
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * {
 *   "userId": "par1",
 *   "gradeLevel": 5,
 *   "gradeLabel": "Grade 5",
 *   "overallLevel": "MEDIUM",
 *   "subjects": [
 *     { "name": "Mathematics", "icon": "🔢",
 *       "gradeGoal": "Decimals, percentages, area, perimeter",
 *       "modifiedGoal": "With scaffolded support, work on single-digit decimals and basic area using grid paper" },
 *     { "name": "Science", "icon": "🔬",
 *       "gradeGoal": "Human body, ecosystems, forces, light",
 *       "modifiedGoal": "Identify major body organs from labelled diagram; describe one ecosystem with visual support" },
 *     { "name": "English", "icon": "📖",
 *       "gradeGoal": "Literature, formal writing, vocabulary",
 *       "modifiedGoal": "Read simplified passages (Grade 3 level), write 3-sentence responses with sentence starters" },
 *     { "name": "Social Science", "icon": "🌏",
 *       "gradeGoal": "Ancient civilisations, Indian geography",
 *       "modifiedGoal": "Identify 3 ancient civilisations from picture cards; locate India and home state on a map" }
 *   ],
 *   "goals": {
 *     "academic": [
 *       "With moderate support, the student will add and subtract decimals to one place using a number line",
 *       "With moderate support, the student will read and retell a simplified story in 3 sentences",
 *       "With peer support, the student will complete a structured science worksheet with 80% accuracy"
 *     ],
 *     "functional": [
 *       "Follow a visual daily schedule independently for 5 consecutive school days",
 *       "Initiate requesting help from the teacher using a pre-taught phrase or AAC symbol",
 *       "Participate in a structured group activity for 15 minutes with minimal prompting"
 *     ]
 *   },
 *   "recommendations": [
 *     "Use graphic organisers and visual maps for all subjects",
 *     "Pair abstract concepts with real-world concrete examples",
 *     "Implement cooperative learning with a trained peer buddy",
 *     "Provide choice boards to increase motivation and agency"
 *   ],
 *   "accommodations": [
 *     "Extended time (1.5×) for all assessments",
 *     "Modified worksheets with reduced item count and larger font",
 *     "Oral response option for written assessments",
 *     "Access to quiet break area with 5-minute sensory breaks every 30 minutes"
 *   ],
 *   "generatedAt": "2025-01-15T10:30:00.000Z"
 * }
 */
