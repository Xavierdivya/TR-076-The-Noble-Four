
import { useState, useEffect, useCallback } from "react";

// ============================================================
// PHASE 1: DATABASE SCHEMA DEFINITIONS (JS representations)
// ============================================================

/*
MONGODB SCHEMAS (Mongoose-style definitions):

SpecialEducator {
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (bcrypt hashed),
  educatorType: Enum["Autism","ADHD","Intellectual Disability","Down Syndrome"],
  assignedChildren: [ObjectId -> Parent],
  createdAt: Date
}

Parent {
  _id: ObjectId,
  parentName: String,
  childName: String,
  age: Number,
  disabilityType: Enum["Autism","ADHD","Intellectual Disability","Down Syndrome"],
  email: String (unique),
  password: String (bcrypt hashed),
  preferredLanguage: Enum["English","Hindi","Tamil","Telugu","Bengali","Marathi"],
  uniqueChildID: String (auto-generated: "CHILD-XXXXXX"),
  assignedEducatorID: ObjectId -> SpecialEducator,
  createdAt: Date
}

Assessment {
  _id: ObjectId,
  childID: ObjectId -> Parent,
  educatorID: ObjectId -> SpecialEducator,
  testDetails: { communication, motor, cognitive, social, emotional },
  score: Number (0-100),
  date: Date,
  weekNumber: Number
}

IEPPlan {
  _id: ObjectId,
  childID: ObjectId -> Parent,
  educatorID: ObjectId -> SpecialEducator,
  weeklyPlan: [{ day, activity, goal, materials }],
  learningOutcome: String,
  status: Enum["Achieved","Not Achieved","In Progress"],
  weekNumber: Number,
  aiGenerated: Boolean,
  editedByEducator: Boolean,
  previousScore: Number,
  targetScore: Number,
  createdAt: Date
}

Feedback {
  _id: ObjectId,
  parentID: ObjectId -> Parent,
  educatorID: ObjectId -> SpecialEducator,
  childID: ObjectId -> Parent,
  message: String,
  rating: Number (1-5),
  date: Date,
  isRead: Boolean
}

RELATIONSHIPS:
- Parent (1) <-> (1) SpecialEducator [matched by disabilityType == educatorType]
- Parent (1) -> (many) Assessment
- Parent (1) -> (many) IEPPlan
- Parent (1) -> (many) Feedback
- SpecialEducator (1) -> (many) Parent (assignedChildren)
*/

// ============================================================
// PHASE 2 & 5: MOCK BACKEND / DATA LAYER
// ============================================================

// Mock DB
let mockDB = {
  educators: [
    { id: "edu1", name: "Dr. Priya Sharma", email: "priya@edu.com", password: "pass123", educatorType: "Autism", assignedChildren: ["par1"] },
    { id: "edu2", name: "Mr. Rahul Verma", email: "rahul@edu.com", password: "pass123", educatorType: "ADHD", assignedChildren: ["par2"] },
    { id: "edu3", name: "Ms. Anita Nair", email: "anita@edu.com", password: "pass123", educatorType: "Intellectual Disability", assignedChildren: [] },
    { id: "edu4", name: "Dr. Sunita Patel", email: "sunita@edu.com", password: "pass123", educatorType: "Down Syndrome", assignedChildren: [] },
  ],
  parents: [
    { id: "par1", parentName: "Meera Krishnan", childName: "Arjun", age: 8, disabilityType: "Autism", email: "meera@parent.com", password: "pass123", preferredLanguage: "Tamil", uniqueChildID: "CHILD-001001", assignedEducatorID: "edu1" },
    { id: "par2", parentName: "Suresh Gupta", childName: "Riya", age: 10, disabilityType: "ADHD", email: "suresh@parent.com", password: "pass123", preferredLanguage: "Hindi", uniqueChildID: "CHILD-002002", assignedEducatorID: "edu2" },
  ],
  assessments: [
    { id: "ass1", childID: "par1", educatorID: "edu1", testDetails: { communication: 40, motor: 55, cognitive: 35, social: 30, emotional: 45 }, score: 41, date: "2024-01-08", weekNumber: 1 },
    { id: "ass2", childID: "par1", educatorID: "edu1", testDetails: { communication: 50, motor: 60, cognitive: 45, social: 40, emotional: 50 }, score: 49, date: "2024-01-15", weekNumber: 2 },
    { id: "ass3", childID: "par1", educatorID: "edu1", testDetails: { communication: 60, motor: 65, cognitive: 55, social: 52, emotional: 58 }, score: 58, date: "2024-01-22", weekNumber: 3 },
    { id: "ass4", childID: "par2", educatorID: "edu2", testDetails: { communication: 65, motor: 70, cognitive: 60, social: 55, emotional: 50 }, score: 60, date: "2024-01-08", weekNumber: 1 },
    { id: "ass5", childID: "par2", educatorID: "edu2", testDetails: { communication: 70, motor: 72, cognitive: 65, social: 62, emotional: 58 }, score: 65, date: "2024-01-15", weekNumber: 2 },
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
        { day: "Monday", activity: "AAC device practice", goal: "Use 10 new AAC symbols", materials: "AAC device, visual schedule" },
        { day: "Tuesday", activity: "Group motor activity", goal: "Participate in group for 15 min", materials: "Ball, hoops" },
        { day: "Wednesday", activity: "Emotion identification cards", goal: "Identify 6 emotions correctly", materials: "Emotion flashcards" },
        { day: "Thursday", activity: "Cooking simple recipe", goal: "Follow 3-step instruction", materials: "Ingredients, picture recipe" },
        { day: "Friday", activity: "Community outing preparation", goal: "Practice safety rules", materials: "Visual rules card" },
      ],
      learningOutcome: "Build independence in daily communication and group participation",
      status: "In Progress", weekNumber: 2, aiGenerated: true, editedByEducator: false, previousScore: 49, targetScore: 62
    },
  ],
  feedback: [
    { id: "fb1", parentID: "par1", educatorID: "edu1", childID: "par1", message: "Arjun has been using picture cards at home! We are seeing real progress in his communication. Thank you Dr. Priya!", rating: 5, date: "2024-01-14", isRead: true },
    { id: "fb2", parentID: "par2", educatorID: "edu2", childID: "par2", message: "Riya is more focused now. The ADHD techniques you suggested are helping. Can we discuss medication alternatives?", rating: 4, date: "2024-01-16", isRead: false },
  ],
};

// Auth simulation
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
      const token = btoa(JSON.stringify({ id: newEdu.id, role, email: data.email }));
      return { token, user: newEdu, role };
    } else {
      const exists = mockDB.parents.find(p => p.email === data.email);
      if (exists) return { error: "Email already registered" };
      // Auto-assign educator by disability type
      const matchedEdu = mockDB.educators.find(e => e.educatorType === data.disabilityType);
      const uniqueChildID = "CHILD-" + String(Math.floor(Math.random() * 900000) + 100000);
      const newParent = { ...data, id: "par" + Date.now(), uniqueChildID, assignedEducatorID: matchedEdu?.id || null };
      mockDB.parents.push(newParent);
      if (matchedEdu) matchedEdu.assignedChildren.push(newParent.id);
      const token = btoa(JSON.stringify({ id: newParent.id, role, email: data.email }));
      return { token, user: newParent, role, assignedEducator: matchedEdu };
    }
  }
};

// ============================================================
// PHASE 3 & 4: AI IEP GENERATION (Claude API)
// ============================================================

const generateIEPWithAI = async (childData, assessmentScore, disabilityType, weekNumber) => {
  const prompt = `You are a special education expert. Generate a detailed weekly IEP (Individualized Education Plan) for a child.

Child Details:
- Name: ${childData.childName}
- Age: ${childData.age}
- Disability Type: ${disabilityType}
- Current Assessment Score: ${assessmentScore}/100
- Week Number: ${weekNumber}

Generate a JSON response with this EXACT structure (no markdown, no explanation, just JSON):
{
  "weeklyPlan": [
    {"day": "Monday", "activity": "...", "goal": "...", "materials": "..."},
    {"day": "Tuesday", "activity": "...", "goal": "...", "materials": "..."},
    {"day": "Wednesday", "activity": "...", "goal": "...", "materials": "..."},
    {"day": "Thursday", "activity": "...", "goal": "...", "materials": "..."},
    {"day": "Friday", "activity": "...", "goal": "...", "materials": "..."}
  ],
  "learningOutcome": "A specific measurable outcome for this week",
  "targetScore": ${Math.min(assessmentScore + 12, 100)},
  "strategies": ["strategy 1", "strategy 2", "strategy 3"],
  "parentTips": ["tip 1", "tip 2", "tip 3"]
}

Make activities specific, therapeutic, and appropriate for ${disabilityType}. Each activity should build on the current score of ${assessmentScore}.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await response.json();
    const text = data.content?.map(b => b.text || "").join("") || "";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (err) {
    // Fallback mock IEP
    return {
      weeklyPlan: [
        { day: "Monday", activity: `Structured ${disabilityType} therapy session`, goal: "Improve focus and engagement", materials: "Therapy tools, visual aids" },
        { day: "Tuesday", activity: "Fine motor skill development", goal: "Complete 3 tasks independently", materials: "Manipulatives, worksheets" },
        { day: "Wednesday", activity: "Social communication practice", goal: "Initiate 5 peer interactions", materials: "Communication cards, mirrors" },
        { day: "Thursday", activity: "Sensory integration activity", goal: "Tolerate new sensory input", materials: "Sensory bin, textures" },
        { day: "Friday", activity: "Review and reward session", goal: "Celebrate weekly achievements", materials: "Star chart, reward tokens" },
      ],
      learningOutcome: `Improve ${disabilityType} management skills and achieve ${Math.min(assessmentScore + 12, 100)}% target score`,
      targetScore: Math.min(assessmentScore + 12, 100),
      strategies: ["Positive reinforcement", "Structured routines", "Visual supports"],
      parentTips: ["Practice activities at home daily", "Maintain consistent routine", "Celebrate small wins"]
    };
  }
};

// ============================================================
// PHASE 6: TRANSLATION (Claude API)
// ============================================================

const translateSummary = async (text, targetLanguage) => {
  if (targetLanguage === "English") return text;
  const prompt = `Translate this educational progress summary to ${targetLanguage}. Keep it natural and warm for parents. Return only the translated text, no explanation:\n\n${text}`;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await response.json();
    return data.content?.[0]?.text || text;
  } catch {
    return text + `\n\n[Translation to ${targetLanguage} unavailable offline]`;
  }
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

const getCurrentUser = () => {
  try {
    const token = localStorage.getItem("snep_token");
    const role = localStorage.getItem("snep_role");
    const userId = localStorage.getItem("snep_userId");
    if (!token) return null;
    return { token, role, userId };
  } catch { return null; }
};

const getParentById = (id) => mockDB.parents.find(p => p.id === id);
const getEducatorById = (id) => mockDB.educators.find(e => e.id === id);
const getAssessmentsByChild = (childId) => mockDB.assessments.filter(a => a.childID === childId).sort((a, b) => a.weekNumber - b.weekNumber);
const getIEPByChild = (childId) => mockDB.iepPlans.filter(p => p.childID === childId).sort((a, b) => a.weekNumber - b.weekNumber);
const getFeedbackByEducator = (eduId) => mockDB.feedback.filter(f => f.educatorID === eduId);
const getFeedbackByParent = (parentId) => mockDB.feedback.filter(f => f.parentID === parentId);

// ============================================================
// PHASE 7 & 8: FRONTEND COMPONENTS
// ============================================================

// --- Color palette ---
const colors = {
  primary: "#1a3a5c",
  secondary: "#e85d26",
  accent: "#34c2b3",
  soft: "#f0f7ff",
  card: "#ffffff",
  border: "#dce8f5",
  text: "#1e2b3a",
  muted: "#6b859e",
  success: "#2db87a",
  warning: "#f5a623",
  danger: "#e84b4b",
  gradient: "linear-gradient(135deg, #1a3a5c 0%, #2563a8 60%, #34c2b3 100%)",
};

// Global styles
const globalStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=DM+Serif+Display&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Nunito', sans-serif; background: #f4f8fd; color: #1e2b3a; }
  ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #f0f4f8; }
  ::-webkit-scrollbar-thumb { background: #bcd3ef; border-radius: 3px; }
  .fade-in { animation: fadeIn 0.4s ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .pulse { animation: pulse 2s ease-in-out infinite; }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
`;

// --- Reusable UI Components ---

const Badge = ({ children, color = "blue" }) => {
  const map = { blue: "#dbeafe:#1d4ed8", green: "#d1fae5:#065f46", orange: "#ffedd5:#c2410c", red: "#fee2e2:#b91c1c", purple: "#ede9fe:#5b21b6", teal: "#ccfbf1:#0d9488" };
  const [bg, text] = (map[color] || map.blue).split(":");
  return <span style={{ background: bg, color: text, padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{children}</span>;
};

const Card = ({ children, style = {}, className = "" }) => (
  <div className={className} style={{ background: "#fff", borderRadius: 16, boxShadow: "0 2px 16px rgba(26,58,92,0.08)", border: "1px solid #e8f0fa", padding: 24, ...style }}>{children}</div>
);

const Button = ({ children, onClick, variant = "primary", size = "md", disabled = false, style = {} }) => {
  const base = { border: "none", borderRadius: 10, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "Nunito", fontWeight: 700, transition: "all 0.2s", opacity: disabled ? 0.6 : 1 };
  const variants = {
    primary: { background: colors.secondary, color: "#fff", boxShadow: "0 4px 12px rgba(232,93,38,0.3)" },
    secondary: { background: colors.primary, color: "#fff", boxShadow: "0 4px 12px rgba(26,58,92,0.25)" },
    outline: { background: "transparent", color: colors.primary, border: `2px solid ${colors.primary}` },
    ghost: { background: "#f0f7ff", color: colors.primary },
    danger: { background: colors.danger, color: "#fff" },
    success: { background: colors.success, color: "#fff" },
  };
  const sizes = { sm: { padding: "6px 14px", fontSize: 13 }, md: { padding: "10px 22px", fontSize: 14 }, lg: { padding: "13px 30px", fontSize: 16 } };
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant], ...sizes[size], ...style }}>{children}</button>;
};

const Input = ({ label, value, onChange, type = "text", placeholder = "", required = false, options = null }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: colors.primary, marginBottom: 6 }}>{label}{required && <span style={{ color: colors.secondary }}> *</span>}</label>}
    {options ? (
      <select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${colors.border}`, borderRadius: 10, fontSize: 14, fontFamily: "Nunito", background: "#fff", color: colors.text, outline: "none" }}>
        <option value="">Select...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : (
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${colors.border}`, borderRadius: 10, fontSize: 14, fontFamily: "Nunito", outline: "none", transition: "border 0.2s" }} />
    )}
  </div>
);

const Spinner = ({ size = 24, color = colors.secondary }) => (
  <div className="spin" style={{ width: size, height: size, border: `3px solid ${color}22`, borderTopColor: color, borderRadius: "50%" }} />
);

const Alert = ({ type = "info", children }) => {
  const map = { info: "#eff6ff:#1d4ed8", success: "#f0fdf4:#15803d", warning: "#fffbeb:#b45309", error: "#fef2f2:#b91c1c" };
  const [bg, text] = (map[type] || map.info).split(":");
  return <div style={{ background: bg, color: text, padding: "12px 16px", borderRadius: 10, fontSize: 14, fontWeight: 600, marginBottom: 16 }}>{children}</div>;
};

// ============================================================
// CHARTS (SVG-based, no external library needed)
// ============================================================

const LineChart = ({ data, width = 500, height = 220, label = "Score" }) => {
  if (!data || data.length < 2) return <div style={{ color: colors.muted, textAlign: "center", padding: 40 }}>Not enough data for chart</div>;
  const pad = { top: 20, right: 20, bottom: 40, left: 45 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const maxV = Math.max(...data.map(d => d.value), 100);
  const minV = 0;
  const xStep = w / (data.length - 1);
  const yScale = v => h - ((v - minV) / (maxV - minV)) * h;
  const pts = data.map((d, i) => ({ x: i * xStep, y: yScale(d.value) }));
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ");
  const areaD = `${pathD} L ${pts[pts.length - 1].x},${h} L 0,${h} Z`;
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.accent} stopOpacity={0.3} />
          <stop offset="100%" stopColor={colors.accent} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <g transform={`translate(${pad.left},${pad.top})`}>
        {[0, 25, 50, 75, 100].map(v => (
          <g key={v}>
            <line x1={0} y1={yScale(v)} x2={w} y2={yScale(v)} stroke="#e8f0fa" strokeDasharray="4,4" />
            <text x={-8} y={yScale(v) + 4} textAnchor="end" fontSize={11} fill={colors.muted}>{v}</text>
          </g>
        ))}
        <path d={areaD} fill="url(#areaGrad)" />
        <path d={pathD} fill="none" stroke={colors.accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={5} fill="#fff" stroke={colors.accent} strokeWidth={2.5} />
            <text x={p.x} y={h + 20} textAnchor="middle" fontSize={11} fill={colors.muted}>W{data[i].week}</text>
            <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize={11} fill={colors.primary} fontWeight={700}>{data[i].value}</text>
          </g>
        ))}
        <text x={w / 2} y={h + 38} textAnchor="middle" fontSize={12} fill={colors.muted} fontWeight={700}>{label}</text>
      </g>
    </svg>
  );
};

const BarChart = ({ data }) => {
  if (!data || !data.length) return null;
  const h = 180; const pad = { top: 20, right: 10, bottom: 40, left: 40 };
  const w = 480 - pad.left - pad.right;
  const barW = (w / data.length) * 0.6;
  const gap = w / data.length;
  const maxV = Math.max(...data.map(d => d.value), 100);
  return (
    <svg width="100%" viewBox={`0 0 480 ${h + pad.top + pad.bottom}`}>
      <g transform={`translate(${pad.left},${pad.top})`}>
        {[0, 25, 50, 75, 100].map(v => (
          <g key={v}>
            <line x1={0} y1={h - (v / maxV) * h} x2={w} y2={h - (v / maxV) * h} stroke="#e8f0fa" strokeDasharray="3,3" />
            <text x={-6} y={h - (v / maxV) * h + 4} textAnchor="end" fontSize={10} fill={colors.muted}>{v}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const bh = (d.value / maxV) * h;
          const clr = d.achieved ? colors.success : colors.danger;
          return (
            <g key={i}>
              <rect x={i * gap + gap / 2 - barW / 2} y={h - bh} width={barW} height={bh} rx={5} fill={clr} opacity={0.85} />
              <text x={i * gap + gap / 2} y={h - bh - 6} textAnchor="middle" fontSize={11} fill={clr} fontWeight={700}>{d.value}</text>
              <text x={i * gap + gap / 2} y={h + 16} textAnchor="middle" fontSize={10} fill={colors.muted}>W{d.week}</text>
              <text x={i * gap + gap / 2} y={h + 30} textAnchor="middle" fontSize={9} fill={d.achieved ? colors.success : colors.danger}>{d.achieved ? "✓" : "✗"}</text>
            </g>
          );
        })}
      </g>
    </svg>
  );
};

const RadarChart = ({ scores }) => {
  const keys = Object.keys(scores);
  const n = keys.length;
  const cx = 120, cy = 120, r = 80;
  const angle = (i) => (i * 2 * Math.PI / n) - Math.PI / 2;
  const pt = (i, scale) => ({ x: cx + scale * r * Math.cos(angle(i)), y: cy + scale * r * Math.sin(angle(i)) });
  const gridLevels = [0.25, 0.5, 0.75, 1];
  const dataPath = keys.map((k, i) => pt(i, scores[k] / 100));
  const dp = dataPath.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + "Z";
  return (
    <svg width={240} height={240} viewBox="0 0 240 240">
      {gridLevels.map(l => {
        const gpts = keys.map((_, i) => pt(i, l));
        return <polygon key={l} points={gpts.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#dce8f5" strokeWidth={1} />;
      })}
      {keys.map((k, i) => { const p = pt(i, 1); return <line key={k} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#dce8f5" strokeWidth={1} />; })}
      <path d={dp} fill={colors.accent + "33"} stroke={colors.accent} strokeWidth={2} />
      {keys.map((k, i) => {
        const p = pt(i, 1.22);
        return <text key={k} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill={colors.primary} fontWeight={700}>{k.charAt(0).toUpperCase() + k.slice(0, 4)}</text>;
      })}
      {keys.map((k, i) => { const p = dataPath[i]; return <circle key={k} cx={p.x} cy={p.y} r={4} fill={colors.accent} />; })}
    </svg>
  );
};

// ============================================================
// AUTH PAGE
// ============================================================

const AuthPage = ({ onLogin }) => {
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("parent");
  const [form, setForm] = useState({ name: "", email: "", password: "", educatorType: "", childName: "", age: "", disabilityType: "", preferredLanguage: "", parentName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const disabilityTypes = ["Autism", "ADHD", "Intellectual Disability", "Down Syndrome"];
  const languages = ["English", "Hindi", "Tamil", "Telugu", "Bengali", "Marathi"];

  const f = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    setError(""); setSuccess(""); setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    if (mode === "login") {
      const res = mockAuth.login(form.email, form.password, role);
      if (res.error) { setError(res.error); setLoading(false); return; }
      localStorage.setItem("snep_token", res.token);
      localStorage.setItem("snep_role", res.role);
      localStorage.setItem("snep_userId", res.user.id);
      onLogin(res);
    } else {
      const data = role === "educator"
        ? { name: form.name, email: form.email, password: form.password, educatorType: form.educatorType }
        : { parentName: form.parentName, childName: form.childName, age: parseInt(form.age), disabilityType: form.disabilityType, email: form.email, password: form.password, preferredLanguage: form.preferredLanguage };
      const res = mockAuth.register(data, role);
      if (res.error) { setError(res.error); setLoading(false); return; }
      setSuccess(role === "parent" ? `Registration successful! Child ID: ${res.user.uniqueChildID}. ${res.assignedEducator ? `Matched with: ${res.assignedEducator.name}` : "No educator matched yet."}` : "Registration successful!");
      setTimeout(() => { localStorage.setItem("snep_token", res.token); localStorage.setItem("snep_role", res.role); localStorage.setItem("snep_userId", res.user.id); onLogin(res); }, 1800);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: colors.gradient, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="fade-in" style={{ width: "100%", maxWidth: 460 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🌱</div>
          <h1 style={{ fontFamily: "DM Serif Display", fontSize: 32, color: "#fff", marginBottom: 6 }}>EduPath</h1>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 15 }}>Special Needs Education Plan Generator</p>
        </div>
        <Card style={{ padding: 32 }}>
          {/* Role toggle */}
          <div style={{ display: "flex", background: colors.soft, borderRadius: 12, padding: 4, marginBottom: 24 }}>
            {["parent", "educator"].map(r => (
              <button key={r} onClick={() => setRole(r)} style={{ flex: 1, padding: "9px 0", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "Nunito", fontWeight: 700, fontSize: 14, background: role === r ? colors.primary : "transparent", color: role === r ? "#fff" : colors.muted, transition: "all 0.2s" }}>
                {r === "parent" ? "👨‍👩‍👧 Parent" : "👩‍🏫 Educator"}
              </button>
            ))}
          </div>
          {/* Mode toggle */}
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
              <strong style={{ color: colors.primary }}>Demo Accounts:</strong><br />
              Parent: meera@parent.com / pass123<br />
              Educator: priya@edu.com / pass123
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

// ============================================================
// EDUCATOR DASHBOARD
// ============================================================

const EducatorDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedChild, setSelectedChild] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPlan, setAiPlan] = useState(null);
  const [editPlan, setEditPlan] = useState(null);
  const [assessForm, setAssessForm] = useState({ communication: 50, motor: 50, cognitive: 50, social: 50, emotional: 50 });
  const [notification, setNotification] = useState("");
  const [feedbackList, setFeedbackList] = useState([]);
  const [saving, setSaving] = useState(false);

  const educator = getEducatorById(user.userId);
  const children = educator?.assignedChildren?.map(id => getParentById(id)).filter(Boolean) || [];
  const unreadFeedback = getFeedbackByEducator(user.userId).filter(f => !f.isRead).length;

  useEffect(() => {
    setFeedbackList(getFeedbackByEducator(user.userId));
  }, [user.userId]);

  const notify = (msg) => { setNotification(msg); setTimeout(() => setNotification(""), 3500); };

  const avgScore = (childId) => {
    const asss = getAssessmentsByChild(childId);
    if (!asss.length) return 0;
    return Math.round(asss.reduce((s, a) => s + a.score, 0) / asss.length);
  };

  const handleGenIEP = async () => {
    if (!selectedChild) return;
    const asss = getAssessmentsByChild(selectedChild.id);
    const latest = asss[asss.length - 1];
    if (!latest) { notify("⚠️ Please add an assessment first."); return; }
    setAiLoading(true);
    const plan = await generateIEPWithAI(selectedChild, latest.score, selectedChild.disabilityType, asss.length + 1);
    setAiPlan(plan);
    setEditPlan({ ...plan, weeklyPlan: [...plan.weeklyPlan.map(d => ({ ...d }))] });
    setAiLoading(false);
    setActiveTab("iep");
  };

  const handleSaveIEP = async () => {
    if (!editPlan || !selectedChild) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    const asss = getAssessmentsByChild(selectedChild.id);
    const latest = asss[asss.length - 1];
    const newPlan = {
      id: "iep" + Date.now(),
      childID: selectedChild.id,
      educatorID: user.userId,
      weeklyPlan: editPlan.weeklyPlan,
      learningOutcome: editPlan.learningOutcome,
      status: "In Progress",
      weekNumber: asss.length,
      aiGenerated: true,
      editedByEducator: JSON.stringify(editPlan) !== JSON.stringify(aiPlan),
      previousScore: latest?.score || 0,
      targetScore: editPlan.targetScore,
      createdAt: new Date().toISOString()
    };
    mockDB.iepPlans.push(newPlan);
    notify("✅ IEP Plan saved and sent to parent!");
    setAiPlan(null); setEditPlan(null);
    setSaving(false);
  };

  const handleAddAssessment = () => {
    if (!selectedChild) return;
    const vals = Object.values(assessForm).map(Number);
    const score = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    const prev = getAssessmentsByChild(selectedChild.id);
    const newAss = { id: "ass" + Date.now(), childID: selectedChild.id, educatorID: user.userId, testDetails: { ...assessForm }, score, date: new Date().toISOString().slice(0, 10), weekNumber: prev.length + 1 };
    mockDB.assessments.push(newAss);
    notify(`✅ Assessment saved! Score: ${score}/100`);
    setActiveTab("overview");
  };

  const tabs = [
    { id: "overview", label: "📊 Overview" },
    { id: "children", label: "👧 Children" },
    { id: "assess", label: "📝 Assess" },
    { id: "iep", label: "📋 IEP Plans" },
    { id: "feedback", label: `💬 Feedback${unreadFeedback > 0 ? ` (${unreadFeedback})` : ""}` },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f4f8fd" }}>
      <style>{globalStyle}</style>
      {/* Header */}
      <div style={{ background: colors.gradient, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 28 }}>🌱</span>
          <div>
            <div style={{ fontFamily: "DM Serif Display", fontSize: 20, color: "#fff" }}>EduPath</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Special Needs Education</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{educator?.name}</div>
            <Badge color="teal">{educator?.educatorType}</Badge>
          </div>
          <Button onClick={onLogout} variant="outline" size="sm" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.4)" }}>Logout</Button>
        </div>
      </div>

      {notification && <div style={{ background: colors.success, color: "#fff", padding: "12px 24px", textAlign: "center", fontWeight: 700 }}>{notification}</div>}

      <div style={{ display: "flex", minHeight: "calc(100vh - 72px)" }}>
        {/* Sidebar */}
        <div style={{ width: 220, background: "#fff", borderRight: `1px solid ${colors.border}`, padding: "24px 0" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ width: "100%", textAlign: "left", padding: "12px 24px", border: "none", background: activeTab === t.id ? colors.soft : "transparent", color: activeTab === t.id ? colors.primary : colors.muted, fontFamily: "Nunito", fontWeight: activeTab === t.id ? 800 : 600, fontSize: 14, cursor: "pointer", borderLeft: activeTab === t.id ? `4px solid ${colors.secondary}` : "4px solid transparent", transition: "all 0.2s" }}>
              {t.label}
            </button>
          ))}
          <div style={{ margin: "24px 16px 0", padding: 14, background: colors.soft, borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: colors.muted, fontWeight: 700 }}>Students Assigned</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: colors.primary }}>{children.length}</div>
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, padding: 28, overflow: "auto" }}>
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: colors.primary, marginBottom: 8 }}>Good Day, {educator?.name?.split(" ")[0]}! 👋</h2>
              <p style={{ color: colors.muted, marginBottom: 28 }}>Here's your teaching overview for today.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
                {[
                  { label: "Assigned Students", value: children.length, icon: "👧", color: "#dbeafe" },
                  { label: "Assessments Done", value: mockDB.assessments.filter(a => a.educatorID === user.userId).length, icon: "📝", color: "#d1fae5" },
                  { label: "IEP Plans Created", value: mockDB.iepPlans.filter(p => p.educatorID === user.userId).length, icon: "📋", color: "#ffedd5" },
                  { label: "Unread Feedback", value: unreadFeedback, icon: "💬", color: "#ede9fe" },
                ].map(stat => (
                  <Card key={stat.label} style={{ background: stat.color, border: "none", textAlign: "center", padding: "20px 16px" }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>{stat.icon}</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: colors.primary }}>{stat.value}</div>
                    <div style={{ fontSize: 12, color: colors.muted, fontWeight: 700 }}>{stat.label}</div>
                  </Card>
                ))}
              </div>
              <h3 style={{ fontWeight: 800, color: colors.primary, marginBottom: 16 }}>Assigned Students</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                {children.map(child => {
                  const asss = getAssessmentsByChild(child.id);
                  const lastScore = asss[asss.length - 1]?.score || "—";
                  const trend = asss.length >= 2 ? asss[asss.length - 1].score - asss[asss.length - 2].score : null;
                  return (
                    <Card key={child.id} style={{ cursor: "pointer", transition: "box-shadow 0.2s" }} onClick={() => { setSelectedChild(child); setActiveTab("children"); }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                        <div style={{ width: 48, height: 48, borderRadius: "50%", background: colors.gradient, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 18 }}>{child.childName[0]}</div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 16, color: colors.primary }}>{child.childName}</div>
                          <div style={{ fontSize: 13, color: colors.muted }}>Age {child.age} · Parent: {child.parentName}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                        <Badge color="blue">{child.disabilityType}</Badge>
                        <Badge color="teal">ID: {child.uniqueChildID}</Badge>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: 13, color: colors.muted }}>Latest Score: <strong style={{ color: colors.primary, fontSize: 18 }}>{lastScore}</strong>{lastScore !== "—" && "/100"}</div>
                        {trend !== null && <span style={{ color: trend >= 0 ? colors.success : colors.danger, fontWeight: 800 }}>{trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}</span>}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* CHILDREN TAB */}
          {activeTab === "children" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: colors.primary, marginBottom: 20 }}>Student Details</h2>
              <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
                {children.map(c => (
                  <button key={c.id} onClick={() => setSelectedChild(c)} style={{ padding: "8px 18px", border: `2px solid ${selectedChild?.id === c.id ? colors.primary : colors.border}`, borderRadius: 20, background: selectedChild?.id === c.id ? colors.primary : "#fff", color: selectedChild?.id === c.id ? "#fff" : colors.text, fontFamily: "Nunito", fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>
                    {c.childName}
                  </button>
                ))}
              </div>
              {selectedChild ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <Card>
                    <h3 style={{ fontWeight: 800, color: colors.primary, marginBottom: 16 }}>Child Profile</h3>
                    {[["Name", selectedChild.childName], ["Age", selectedChild.age], ["Disability", selectedChild.disabilityType], ["Unique ID", selectedChild.uniqueChildID], ["Parent", selectedChild.parentName], ["Language", selectedChild.preferredLanguage]].map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${colors.border}`, fontSize: 14 }}>
                        <span style={{ color: colors.muted, fontWeight: 700 }}>{k}</span>
                        <span style={{ color: colors.primary, fontWeight: 800 }}>{v}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                      <Button onClick={() => setActiveTab("assess")} variant="secondary" size="sm">Add Assessment</Button>
                      <Button onClick={handleGenIEP} variant="primary" size="sm">Generate IEP</Button>
                    </div>
                  </Card>
                  <Card>
                    <h3 style={{ fontWeight: 800, color: colors.primary, marginBottom: 16 }}>Score Breakdown</h3>
                    {(() => {
                      const asss = getAssessmentsByChild(selectedChild.id);
                      const latest = asss[asss.length - 1];
                      if (!latest) return <p style={{ color: colors.muted }}>No assessment yet.</p>;
                      return <RadarChart scores={latest.testDetails} />;
                    })()}
                  </Card>
                  <Card style={{ gridColumn: "1/-1" }}>
                    <h3 style={{ fontWeight: 800, color: colors.primary, marginBottom: 16 }}>Progress Over Weeks</h3>
                    <LineChart data={getAssessmentsByChild(selectedChild.id).map(a => ({ week: a.weekNumber, value: a.score }))} label="Assessment Score per Week" />
                  </Card>
                </div>
              ) : <p style={{ color: colors.muted }}>Select a child above to view details.</p>}
            </div>
          )}

          {/* ASSESS TAB */}
          {activeTab === "assess" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: colors.primary, marginBottom: 20 }}>New Assessment</h2>
              <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                {children.map(c => (
                  <button key={c.id} onClick={() => setSelectedChild(c)} style={{ padding: "8px 18px", border: `2px solid ${selectedChild?.id === c.id ? colors.primary : colors.border}`, borderRadius: 20, background: selectedChild?.id === c.id ? colors.primary : "#fff", color: selectedChild?.id === c.id ? "#fff" : colors.text, fontFamily: "Nunito", fontWeight: 700, cursor: "pointer" }}>
                    {c.childName}
                  </button>
                ))}
              </div>
              {selectedChild ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                  <Card>
                    <h3 style={{ fontWeight: 800, color: colors.primary, marginBottom: 20 }}>Assessment Scores for {selectedChild.childName}</h3>
                    {Object.keys(assessForm).map(key => (
                      <div key={key} style={{ marginBottom: 20 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <label style={{ fontWeight: 700, fontSize: 14, color: colors.primary, textTransform: "capitalize" }}>{key}</label>
                          <span style={{ fontWeight: 900, color: colors.secondary, fontSize: 16 }}>{assessForm[key]}</span>
                        </div>
                        <input type="range" min={0} max={100} value={assessForm[key]} onChange={e => setAssessForm(p => ({ ...p, [key]: parseInt(e.target.value) }))} style={{ width: "100%", accentColor: colors.accent }} />
                      </div>
                    ))}
                    <div style={{ padding: "14px 16px", background: colors.soft, borderRadius: 12, marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: 700, color: colors.primary }}>Overall Score</span>
                      <span style={{ fontWeight: 900, fontSize: 24, color: colors.secondary }}>{Math.round(Object.values(assessForm).reduce((a, b) => a + b, 0) / 5)}/100</span>
                    </div>
                    <Button onClick={handleAddAssessment} variant="secondary" size="lg" style={{ width: "100%" }}>Save Assessment</Button>
                  </Card>
                  <Card>
                    <h3 style={{ fontWeight: 800, color: colors.primary, marginBottom: 16 }}>Assessment History</h3>
                    {getAssessmentsByChild(selectedChild.id).slice().reverse().map(a => (
                      <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: colors.soft, borderRadius: 10, marginBottom: 10 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: colors.primary }}>Week {a.weekNumber}</div>
                          <div style={{ fontSize: 12, color: colors.muted }}>{a.date}</div>
                        </div>
                        <div style={{ fontWeight: 900, fontSize: 22, color: a.score >= 70 ? colors.success : a.score >= 50 ? colors.warning : colors.danger }}>{a.score}</div>
                      </div>
                    ))}
                    {!getAssessmentsByChild(selectedChild.id).length && <p style={{ color: colors.muted, fontSize: 14 }}>No assessments yet.</p>}
                  </Card>
                </div>
              ) : <Alert type="info">Please select a child from the tabs above.</Alert>}
            </div>
          )}

          {/* IEP TAB */}
          {activeTab === "iep" && (
            <div className="fade-in">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: colors.primary }}>IEP Plan Management</h2>
                {selectedChild && <Button onClick={handleGenIEP} variant="primary" disabled={aiLoading}>{aiLoading ? <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Spinner size={16} color="#fff" /> Generating AI Plan...</div> : "✨ Generate AI IEP"}</Button>}
              </div>
              <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                {children.map(c => (
                  <button key={c.id} onClick={() => setSelectedChild(c)} style={{ padding: "8px 18px", border: `2px solid ${selectedChild?.id === c.id ? colors.primary : colors.border}`, borderRadius: 20, background: selectedChild?.id === c.id ? colors.primary : "#fff", color: selectedChild?.id === c.id ? "#fff" : colors.text, fontFamily: "Nunito", fontWeight: 700, cursor: "pointer" }}>
                    {c.childName}
                  </button>
                ))}
              </div>

              {aiLoading && (
                <div style={{ textAlign: "center", padding: 60 }}>
                  <Spinner size={48} color={colors.accent} />
                  <p style={{ color: colors.muted, marginTop: 16, fontWeight: 700 }}>AI is analyzing assessment data and generating personalized IEP plan...</p>
                </div>
              )}

              {editPlan && !aiLoading && (
                <div className="fade-in">
                  <Alert type="success">✨ AI has generated an IEP plan. Review and edit before saving.</Alert>
                  <Card style={{ marginBottom: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <h3 style={{ fontWeight: 800, color: colors.primary }}>Weekly Activities (Editable)</h3>
                      <Badge color="purple">AI Generated</Badge>
                    </div>
                    {editPlan.weeklyPlan.map((day, i) => (
                      <div key={i} style={{ padding: 16, background: colors.soft, borderRadius: 12, marginBottom: 12 }}>
                        <div style={{ fontWeight: 800, color: colors.secondary, marginBottom: 10 }}>{day.day}</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          {["activity", "goal", "materials"].map(f => (
                            <div key={f} style={{ gridColumn: f === "activity" ? "1/-1" : "auto" }}>
                              <label style={{ fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: "uppercase" }}>{f}</label>
                              <input value={day[f]} onChange={e => { const p = [...editPlan.weeklyPlan]; p[i] = { ...p[i], [f]: e.target.value }; setEditPlan(ep => ({ ...ep, weeklyPlan: p })); }} style={{ width: "100%", padding: "7px 10px", border: `1.5px solid ${colors.border}`, borderRadius: 8, fontFamily: "Nunito", fontSize: 13, marginTop: 4 }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: colors.muted }}>LEARNING OUTCOME</label>
                      <input value={editPlan.learningOutcome} onChange={e => setEditPlan(ep => ({ ...ep, learningOutcome: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${colors.border}`, borderRadius: 8, fontFamily: "Nunito", fontSize: 14, marginTop: 6 }} />
                    </div>
                    {editPlan.parentTips && (
                      <div style={{ padding: 14, background: "#fffbeb", borderRadius: 10, marginBottom: 12 }}>
                        <div style={{ fontWeight: 700, color: "#b45309", marginBottom: 8 }}>💡 Parent Tips</div>
                        {editPlan.parentTips.map((t, i) => <div key={i} style={{ fontSize: 13, color: "#92400e", marginBottom: 4 }}>• {t}</div>)}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 12 }}>
                      <Button onClick={handleSaveIEP} variant="success" size="lg" disabled={saving}>{saving ? "Saving..." : "✅ Save & Send to Parent"}</Button>
                      <Button onClick={() => { setEditPlan(null); setAiPlan(null); }} variant="outline">Discard</Button>
                    </div>
                  </Card>
                </div>
              )}

              {selectedChild && !editPlan && (
                <div>
                  <h3 style={{ fontWeight: 800, color: colors.primary, marginBottom: 16 }}>Saved IEP Plans — {selectedChild.childName}</h3>
                  {getIEPByChild(selectedChild.id).map(plan => (
                    <Card key={plan.id} style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 16, color: colors.primary }}>Week {plan.weekNumber} IEP</div>
                          <div style={{ fontSize: 13, color: colors.muted }}>{plan.learningOutcome}</div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <Badge color={plan.status === "Achieved" ? "green" : plan.status === "In Progress" ? "orange" : "red"}>{plan.status}</Badge>
                          {plan.aiGenerated && <Badge color="purple">AI</Badge>}
                          {plan.editedByEducator && <Badge color="blue">Edited</Badge>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 16, fontSize: 13, color: colors.muted }}>
                        <span>Prev Score: <strong>{plan.previousScore}</strong></span>
                        <span>Target: <strong>{plan.targetScore}</strong></span>
                      </div>
                    </Card>
                  ))}
                  {!getIEPByChild(selectedChild.id).length && <Alert type="info">No IEP plans yet. Generate one above!</Alert>}
                </div>
              )}
            </div>
          )}

          {/* FEEDBACK TAB */}
          {activeTab === "feedback" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: colors.primary, marginBottom: 20 }}>Parent Feedback</h2>
              {feedbackList.length === 0 && <Alert type="info">No feedback received yet.</Alert>}
              {feedbackList.map(fb => {
                const parent = getParentById(fb.parentID);
                return (
                  <Card key={fb.id} style={{ marginBottom: 16, borderLeft: `4px solid ${fb.isRead ? colors.border : colors.secondary}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: colors.soft, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: colors.primary }}>{parent?.parentName[0]}</div>
                        <div>
                          <div style={{ fontWeight: 800, color: colors.primary }}>{parent?.parentName}</div>
                          <div style={{ fontSize: 12, color: colors.muted }}>Re: {parent?.childName} · {fb.date}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {"★".repeat(fb.rating)}{"☆".repeat(5 - fb.rating)}
                        {!fb.isRead && <Badge color="orange">New</Badge>}
                      </div>
                    </div>
                    <p style={{ color: colors.text, fontSize: 14, lineHeight: 1.6 }}>{fb.message}</p>
                    {!fb.isRead && <Button size="sm" variant="ghost" style={{ marginTop: 10 }} onClick={() => { fb.isRead = true; setFeedbackList([...getFeedbackByEducator(user.userId)]); }}>Mark as Read</Button>}
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

// ============================================================
// PARENT DASHBOARD
// ============================================================

const ParentDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [fbMsg, setFbMsg] = useState("");
  const [fbRating, setFbRating] = useState(5);
  const [notification, setNotification] = useState("");
  const [translating, setTranslating] = useState(false);
  const [translatedSummary, setTranslatedSummary] = useState("");
  const [fbSubmitting, setFbSubmitting] = useState(false);

  const parent = getParentById(user.userId);
  const educator = parent?.assignedEducatorID ? getEducatorById(parent.assignedEducatorID) : null;
  const assessments = getAssessmentsByChild(user.userId);
  const iepPlans = getIEPByChild(user.userId);
  const myFeedback = getFeedbackByParent(user.userId);

  const notify = (msg) => { setNotification(msg); setTimeout(() => setNotification(""), 3500); };

  const latestPlan = iepPlans[iepPlans.length - 1];
  const latestScore = assessments[assessments.length - 1]?.score;
  const prevScore = assessments.length >= 2 ? assessments[assessments.length - 2].score : null;
  const trend = prevScore !== null && latestScore !== undefined ? latestScore - prevScore : null;

  const summaryText = `Progress Report for ${parent?.childName} (${parent?.disabilityType}):\n\nLatest assessment score: ${latestScore || "N/A"}/100. ${trend !== null ? `Change from last week: ${trend >= 0 ? "+" : ""}${trend} points. ` : ""}Total assessments completed: ${assessments.length}. IEP plans generated: ${iepPlans.length}. ${latestPlan ? `Current learning outcome: ${latestPlan.learningOutcome}.` : ""} Your child is making ${latestScore >= 70 ? "excellent" : latestScore >= 50 ? "good" : "steady"} progress. Keep encouraging them at home!`;

  const handleTranslate = async () => {
    if (!parent?.preferredLanguage || parent.preferredLanguage === "English") { notify("Language is already English"); return; }
    setTranslating(true);
    const result = await translateSummary(summaryText, parent.preferredLanguage);
    setTranslatedSummary(result);
    setTranslating(false);
    setActiveTab("progress");
  };

  const handleFeedback = async () => {
    if (!fbMsg.trim()) { notify("⚠️ Please write a message."); return; }
    if (!educator) { notify("⚠️ No educator assigned."); return; }
    setFbSubmitting(true);
    await new Promise(r => setTimeout(r, 600));
    mockDB.feedback.push({ id: "fb" + Date.now(), parentID: user.userId, educatorID: educator.id, childID: user.userId, message: fbMsg, rating: fbRating, date: new Date().toISOString().slice(0, 10), isRead: false });
    notify("✅ Feedback sent to your educator!");
    setFbMsg(""); setFbRating(5);
    setFbSubmitting(false);
  };

  const tabs = [
    { id: "overview", label: "🏠 Overview" },
    { id: "plans", label: "📋 My IEP Plans" },
    { id: "progress", label: "📊 Progress" },
    { id: "feedback", label: "💬 Send Feedback" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f4f8fd" }}>
      <style>{globalStyle}</style>
      {/* Header */}
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
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>Child: {parent?.childName} · {parent?.uniqueChildID}</div>
          </div>
          <Button onClick={onLogout} variant="outline" size="sm" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.4)" }}>Logout</Button>
        </div>
      </div>

      {notification && <div style={{ background: colors.success, color: "#fff", padding: "12px 24px", textAlign: "center", fontWeight: 700 }}>{notification}</div>}

      <div style={{ display: "flex", minHeight: "calc(100vh - 72px)" }}>
        <div style={{ width: 220, background: "#fff", borderRight: `1px solid ${colors.border}`, padding: "24px 0" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ width: "100%", textAlign: "left", padding: "12px 24px", border: "none", background: activeTab === t.id ? colors.soft : "transparent", color: activeTab === t.id ? colors.primary : colors.muted, fontFamily: "Nunito", fontWeight: activeTab === t.id ? 800 : 600, fontSize: 14, cursor: "pointer", borderLeft: activeTab === t.id ? `4px solid ${colors.secondary}` : "4px solid transparent", transition: "all 0.2s" }}>
              {t.label}
            </button>
          ))}
          <div style={{ margin: "24px 16px 0", padding: 14, background: educator ? "#d1fae5" : "#fee2e2", borderRadius: 12 }}>
            <div style={{ fontSize: 11, color: colors.muted, fontWeight: 700, marginBottom: 4 }}>Assigned Educator</div>
            {educator ? (<>
              <div style={{ fontWeight: 800, color: colors.primary, fontSize: 13 }}>{educator.name}</div>
              <div style={{ fontSize: 11, color: colors.muted }}>{educator.educatorType}</div>
            </>) : <div style={{ color: colors.danger, fontSize: 13, fontWeight: 700 }}>Not assigned yet</div>}
          </div>
        </div>

        <div style={{ flex: 1, padding: 28, overflow: "auto" }}>
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: colors.primary, marginBottom: 8 }}>Welcome, {parent?.parentName?.split(" ")[0]}! 💙</h2>
              <p style={{ color: colors.muted, marginBottom: 28 }}>Here's how {parent?.childName} is progressing.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
                {[
                  { label: "Current Score", value: latestScore !== undefined ? `${latestScore}/100` : "—", icon: "🎯", color: "#dbeafe" },
                  { label: "Week Progress", value: trend !== null ? `${trend >= 0 ? "+" : ""}${trend}` : "N/A", icon: trend >= 0 ? "📈" : "📉", color: trend >= 0 ? "#d1fae5" : "#fee2e2" },
                  { label: "IEP Plans", value: iepPlans.length, icon: "📋", color: "#ffedd5" },
                  { label: "Assessments", value: assessments.length, icon: "📝", color: "#ede9fe" },
                ].map(stat => (
                  <Card key={stat.label} style={{ background: stat.color, border: "none", textAlign: "center", padding: "20px 16px" }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>{stat.icon}</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: colors.primary }}>{stat.value}</div>
                    <div style={{ fontSize: 12, color: colors.muted, fontWeight: 700 }}>{stat.label}</div>
                  </Card>
                ))}
              </div>
              {latestPlan && (
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h3 style={{ fontWeight: 800, color: colors.primary }}>Current Week's IEP Plan</h3>
                    <Badge color={latestPlan.status === "Achieved" ? "green" : "orange"}>{latestPlan.status}</Badge>
                  </div>
                  <p style={{ color: colors.text, marginBottom: 16, fontSize: 14 }}><strong>Goal:</strong> {latestPlan.learningOutcome}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                    {latestPlan.weeklyPlan.map((day, i) => (
                      <div key={i} style={{ padding: 14, background: colors.soft, borderRadius: 12 }}>
                        <div style={{ fontWeight: 800, color: colors.secondary, fontSize: 13, marginBottom: 6 }}>{day.day}</div>
                        <div style={{ fontSize: 12, color: colors.text, fontWeight: 600 }}>{day.activity}</div>
                        <div style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>🎯 {day.goal}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* PLANS TAB */}
          {activeTab === "plans" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: colors.primary, marginBottom: 20 }}>IEP Plans for {parent?.childName}</h2>
              {iepPlans.length === 0 && <Alert type="info">No IEP plans available yet. Your educator will generate one after the first assessment.</Alert>}
              {iepPlans.slice().reverse().map(plan => (
                <Card key={plan.id} style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 18, color: colors.primary }}>Week {plan.weekNumber} Plan</div>
                      <div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{plan.learningOutcome}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <Badge color={plan.status === "Achieved" ? "green" : plan.status === "In Progress" ? "orange" : "red"}>{plan.status}</Badge>
                      <div style={{ fontSize: 13, color: colors.muted }}>Target: <strong>{plan.targetScore}</strong></div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 10 }}>
                    {plan.weeklyPlan.map((day, i) => (
                      <div key={i} style={{ padding: 14, background: `${["#eff6ff","#f0fdf4","#fffbeb","#fdf4ff","#fef2f2"][i % 5]}`, borderRadius: 12 }}>
                        <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6, color: colors.primary }}>{day.day}</div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{day.activity}</div>
                        <div style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>🎯 {day.goal}</div>
                        <div style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>🧰 {day.materials}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* PROGRESS TAB */}
          {activeTab === "progress" && (
            <div className="fade-in">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: colors.primary }}>{parent?.childName}'s Progress</h2>
                <Button onClick={handleTranslate} variant="ghost" disabled={translating}>{translating ? <Spinner size={16} /> : `🌐 Translate to ${parent?.preferredLanguage}`}</Button>
              </div>
              {assessments.length < 2 && <Alert type="info">More data needed for graphs. At least 2 assessments required.</Alert>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                <Card>
                  <h3 style={{ fontWeight: 800, color: colors.primary, marginBottom: 16 }}>Score Trend</h3>
                  <LineChart data={assessments.map(a => ({ week: a.weekNumber, value: a.score }))} label="Weekly Assessment Score" />
                </Card>
                <Card>
                  <h3 style={{ fontWeight: 800, color: colors.primary, marginBottom: 16 }}>Goal Achievement</h3>
                  <BarChart data={iepPlans.map(p => ({ week: p.weekNumber, value: p.previousScore, achieved: p.status === "Achieved" }))} />
                  <div style={{ display: "flex", gap: 16, marginTop: 10, justifyContent: "center" }}>
                    <span style={{ fontSize: 12, color: colors.success, fontWeight: 700 }}>■ Achieved</span>
                    <span style={{ fontSize: 12, color: colors.danger, fontWeight: 700 }}>■ Not Achieved</span>
                  </div>
                </Card>
              </div>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ fontWeight: 800, color: colors.primary }}>Progress Summary Report</h3>
                  <Badge color={latestScore >= 70 ? "green" : latestScore >= 50 ? "orange" : "red"}>{latestScore >= 70 ? "Excellent" : latestScore >= 50 ? "Good Progress" : "Needs Support"}</Badge>
                </div>
                <div style={{ background: colors.soft, borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 14, lineHeight: 1.8, color: colors.text }}>
                  {summaryText.split("\n").map((line, i) => <p key={i} style={{ marginBottom: 4 }}>{line}</p>)}
                </div>
                {translatedSummary && (
                  <div style={{ background: "#fffbeb", borderRadius: 12, padding: 16, fontSize: 14, lineHeight: 1.8 }}>
                    <div style={{ fontWeight: 800, color: "#b45309", marginBottom: 8 }}>🌐 {parent?.preferredLanguage} Translation:</div>
                    {translatedSummary.split("\n").map((line, i) => <p key={i} style={{ marginBottom: 4, color: "#78350f" }}>{line}</p>)}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* FEEDBACK TAB */}
          {activeTab === "feedback" && (
            <div className="fade-in">
              <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: colors.primary, marginBottom: 20 }}>Send Feedback to Educator</h2>
              {educator && (
                <Alert type="info">Sending to: <strong>{educator.name}</strong> ({educator.educatorType} Specialist)</Alert>
              )}
              <Card style={{ marginBottom: 24, maxWidth: 600 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontWeight: 700, fontSize: 13, color: colors.primary, marginBottom: 8 }}>Rating</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[1, 2, 3, 4, 5].map(r => (
                      <button key={r} onClick={() => setFbRating(r)} style={{ fontSize: 28, border: "none", background: "none", cursor: "pointer", opacity: r <= fbRating ? 1 : 0.3, transition: "opacity 0.15s" }}>★</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontWeight: 700, fontSize: 13, color: colors.primary, marginBottom: 8 }}>Your Message</label>
                  <textarea value={fbMsg} onChange={e => setFbMsg(e.target.value)} placeholder="Share your observations, concerns, or appreciation..." rows={5} style={{ width: "100%", padding: "12px 14px", border: `1.5px solid ${colors.border}`, borderRadius: 10, fontFamily: "Nunito", fontSize: 14, resize: "vertical", outline: "none" }} />
                </div>
                <Button onClick={handleFeedback} variant="secondary" size="lg" disabled={fbSubmitting}>{fbSubmitting ? "Sending..." : "Send Feedback →"}</Button>
              </Card>
              <h3 style={{ fontWeight: 800, color: colors.primary, marginBottom: 16 }}>My Previous Feedback</h3>
              {myFeedback.length === 0 && <p style={{ color: colors.muted }}>No feedback sent yet.</p>}
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

// ============================================================
// MAIN APP
// ============================================================

export default function App() {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("snep_token");
    const role = localStorage.getItem("snep_role");
    const userId = localStorage.getItem("snep_userId");
    if (token && role && userId) setAuth({ token, role, userId });
    setLoading(false);
  }, []);

  const handleLogin = useCallback((res) => {
    setAuth({ token: res.token, role: res.role, userId: res.user.id });
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("snep_token");
    localStorage.removeItem("snep_role");
    localStorage.removeItem("snep_userId");
    setAuth(null);
  }, []);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: colors.gradient }}>
      <Spinner size={48} color="#fff" />
    </div>
  );

  if (!auth) return <AuthPage onLogin={handleLogin} />;
  if (auth.role === "educator") return <EducatorDashboard user={auth} onLogout={handleLogout} />;
  if (auth.role === "parent") return <ParentDashboard user={auth} onLogout={handleLogout} />;
  return <AuthPage onLogin={handleLogin} />;
}
