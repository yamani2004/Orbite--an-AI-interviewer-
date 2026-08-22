import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api';
import { supabase } from './supabase';

const defaults = { readinessScore: 76, questionsAnswered: 12, mockInterviews: 3, practiceMinutes: 45, streakDays: 4, fundamentals: 84, problemSolving: 81, systemDesign: 68, communication: 71, followUps: 74, weakAreas: ['System design trade-offs', 'Concise answer structure'], recommendation: 'Practice explaining caching in under 90 seconds.' };
const reportFallback = { overallScore: 78, technicalKnowledge: 84, problemSolving: 81, communication: 68, systemDesign: 72, followUpHandling: 76, strengths: ['You structured your answer instead of jumping straight to implementation.', 'You engaged with the follow-up questions.'], improvements: ['State the direct answer first, then expand.', 'Make one concrete trade-off explicit in technical answers.'], recommendedPractice: ['Caching and distributed systems', 'Explaining one solution in 90 seconds'], communicationCoach: 'Use a simple structure: direct answer, explanation, example, trade-off, conclusion.' };

const levels = ['SDE-1', 'SDE-2', 'Senior'];
const roles = ['Software Engineer', 'Backend Engineer', 'Frontend Engineer', 'Full Stack Engineer'];
const types = ['General', 'DSA', 'System Design', 'Database', 'Backend'];
const topics = ['Computer Fundamentals', 'Operating Systems', 'DBMS', 'Computer Networks', 'OOP', 'APIs'];
const difficulties = ['Adaptive', 'Easy', 'Medium', 'Hard'];
const durations = [20, 30, 45];
const preparationStages = [
  ['Creating your interview plan', 'Selecting questions matched to your level, role and interview type.'],
  ['Preparing interviewer follow-ups', 'Building adaptive probes for clarification, trade-offs, edge cases and communication.'],
  ['Preparing the workspace', 'Setting up the problem document, coding/whiteboard tools and interview notes.'],
  ['Calibrating the interview', 'Applying the selected difficulty and making the session behave like a real interview.'],
  ['Opening the room', 'Checking the final interview context before Maya joins the room.']
];

const bank = {
  'SDE-1': {
    General: [
      ['Tell me about yourself.', 'INTRO'],
      ['Walk me through one project you are most proud of. What did you personally own?', 'RESUME'],
      ['What is one technical decision you made in that project, and why did you choose it?', 'RESUME'],
      ['Explain a time you had to debug a problem you did not understand initially.', 'BEHAVIORAL']
    ],
    DSA: [
      ['Tell me about yourself and how you usually approach an unfamiliar coding problem.', 'INTRO'],
      ['Before we code, what questions would you ask to clarify this problem?', 'DSA_CLARIFY'],
      ['Let us solve the problem shown in the Problem document. Start with a brute-force approach.', 'DSA_BRUTE'],
      ['Now optimize it. What is the bottleneck in your current approach?', 'DSA_OPTIMIZE'],
      ['Before you code, will you tell me the final approach, invariant, and time and space complexity? When you are ready, move to the code editor and implement it while talking through each decision.', 'DSA_CODE'],
      ['Now dry-run your actual implementation on the sample and one edge case. Explain each important state change.', 'DSA_DRYRUN']
    ],
    'System Design': [
      ['Tell me about yourself and briefly describe a project where you worked with an API, database, or distributed component.', 'INTRO'],
      ['In that project, why did you choose that architecture or data store? What would you change today?', 'RESUME'],
      ['Great. I am going to give you a system-design problem. First, read the document I dropped in the chat. Tell me what you understood.', 'SD_PROBLEM'],
      ['What are the functional requirements you would confirm with the product team?', 'SD_FR'],
      ['Now give me the non-functional requirements and the scale assumptions you want to make.', 'SD_NFR'],
      ['Before the architecture, do a rough capacity estimate for requests, storage and peak load.', 'SD_CAPACITY'],
      ['Walk me through the high-level architecture. Start with the request flow.', 'SD_ARCH'],
      ['What is the biggest bottleneck or failure mode in your design, and how would you handle it?', 'SD_TRADEOFF'],
      ['What security boundaries and abuse cases would you design for?', 'SD_SECURITY'],
      ['Which metrics, logs and traces would you monitor first?', 'SD_OBSERVABILITY']
    ],
    Database: [
    ['Tell me about yourself and your experience working with relational or NoSQL data.', 'INTRO'],
    ['Pick one project where you designed or changed a data model. What did you choose and why?', 'RESUME'],
    ['Let us work through the database problem. First clarify the requirements and access patterns.', 'DB_CLARIFY'],
    ['Design the schema and explain the entities, relationships, keys and constraints.', 'DB_SCHEMA'],
    ['Now draw the ER diagram and explain the cardinality of each important relationship.', 'DB_ER'],
    ['What indexes would you add? Explain the read/write trade-offs and query patterns.', 'DB_INDEX'],
    ['How would you handle concurrency, transactions and consistency for the critical write path?', 'DB_TXN'],
    ['Suppose the dataset grows 100x. What would you change first?', 'DB_SCALE']
  ],
  Backend: [
      ['Tell me about yourself and the backend work you have done.', 'INTRO'],
      ['Pick one backend project from your experience. How does a request flow through the system?', 'RESUME'],
      ['How did you handle persistence, validation, and errors in that project?', 'RESUME'],
      ['How would you make that service more reliable under higher traffic?', 'BACKEND_SCALE']
    ]
  },
  'SDE-2': {
    General: [
      ['Tell me about yourself, focusing on the engineering problems you have owned end to end.', 'INTRO'],
      ['Choose a project from your resume. What was the hardest engineering trade-off you made?', 'RESUME'],
      ['Tell me about a production issue or ambiguous problem where you had to drive the solution.', 'BEHAVIORAL'],
      ['If another engineer challenged your design, how would you evaluate whether to change it?', 'BEHAVIORAL']
    ],
    DSA: [
      ['Tell me about yourself and how you balance correctness, complexity, and maintainability when solving problems.', 'INTRO'],
      ['Read the problem in the document. What constraints matter most before you choose an approach?', 'DSA_CLARIFY'],
      ['Give me the best approach you can think of, including why simpler approaches do not scale.', 'DSA_OPTIMIZE'],
      ['Before you code, will you tell me the final approach, invariant, and time and space complexity? Then move to the code editor and implement it. I may interrupt with edge cases.', 'DSA_CODE'],
      ['Now dry-run the code on the sample and one edge case. Explain each important state change.', 'DSA_DRYRUN']
    ],
    'System Design': [
      ['Tell me about yourself, focusing on systems you have designed or significantly changed.', 'INTRO'],
      ['Pick one system on your resume. What were the scale assumptions and the most important trade-off?', 'RESUME'],
      ['I have dropped a design problem in the chat. Read it first, then summarize the problem in your own words.', 'SD_PROBLEM'],
      ['Define the functional requirements. Tell me which ones you would explicitly leave out of scope.', 'SD_FR'],
      ['Define availability, latency, consistency, durability, and scale targets for the system.', 'SD_NFR'],
      ['Do a rough capacity estimate for peak requests, storage and bandwidth.', 'SD_CAPACITY'],
      ['Design the high-level architecture and explain the request/data flow.', 'SD_ARCH'],
      ['What security boundary would you put around the critical data or APIs?', 'SD_SECURITY'],
      ['Now deep dive into the data model and the read/write path.', 'SD_DATA'],
      ['Suppose traffic grows 10x and one dependency becomes unhealthy. What changes?', 'SD_TRADEOFF']
    ],
    Database: [
    ['Tell me about yourself and your experience working with relational or NoSQL data.', 'INTRO'],
    ['Pick one project where you designed or changed a data model. What did you choose and why?', 'RESUME'],
    ['Let us work through the database problem. First clarify the requirements and access patterns.', 'DB_CLARIFY'],
    ['Design the schema and explain the entities, relationships, keys and constraints.', 'DB_SCHEMA'],
    ['Now draw the ER diagram and explain the cardinality of each important relationship.', 'DB_ER'],
    ['What indexes would you add? Explain the read/write trade-offs and query patterns.', 'DB_INDEX'],
    ['How would you handle concurrency, transactions and consistency for the critical write path?', 'DB_TXN'],
    ['Suppose the dataset grows 100x. What would you change first?', 'DB_SCALE']
  ],
  Backend: [
      ['Tell me about yourself and a backend service you have owned beyond just implementing endpoints.', 'INTRO'],
      ['Walk me through a production request path from the edge to the database.', 'RESUME'],
      ['Where were the consistency, caching, observability, or failure-handling decisions made?', 'BACKEND_SCALE'],
      ['How would you evolve the service without creating a risky migration?', 'BACKEND_SCALE']
    ]
  },
  Senior: {
    General: [
      ['Tell me about yourself and the systems or teams where you have had the most engineering ownership.', 'INTRO'],
      ['Choose a project where your decision materially changed reliability, cost, or developer velocity.', 'RESUME'],
      ['Tell me about a disagreement on architecture. How did you reach a decision?', 'BEHAVIORAL'],
      ['How do you decide when a design is good enough to ship?', 'BEHAVIORAL']
    ],
    DSA: [
      ['Tell me about yourself and how you reason about algorithmic trade-offs in production code.', 'INTRO'],
      ['Read the problem document and state the constraints you would validate before coding.', 'DSA_CLARIFY'],
      ['Derive an efficient solution and compare it with at least one alternative.', 'DSA_OPTIMIZE'],
      ['Before you code, will you tell me the final approach, invariant, and time and space complexity? Then move to the code editor and implement it while calling out failure cases.', 'DSA_CODE'],
      ['Dry-run the implementation and identify the invariant that proves correctness.', 'DSA_DRYRUN']
    ],
    'System Design': [
      ['Tell me about yourself, focusing on architecture decisions you have owned.', 'INTRO'],
      ['Pick a system from your resume and explain the decision that had the largest long-term consequence.', 'RESUME'],
      ['Read the design document I dropped. Restate the problem, assumptions, and what is explicitly out of scope.', 'SD_PROBLEM'],
      ['Define the product and functional requirements, including the important edge cases.', 'SD_FR'],
      ['Set measurable non-functional requirements and explain why they matter.', 'SD_NFR'],
      ['Do a rough capacity estimate and identify the uncertainty in your assumptions.', 'SD_CAPACITY'],
      ['Propose the architecture. I will challenge individual components as we go.', 'SD_ARCH'],
      ['Which security boundary, threat model and abuse case matters most?', 'SD_SECURITY'],
      ['Deep dive into storage, consistency, partitioning, caching, and failure recovery.', 'SD_DATA'],
      ['The system is now 10x larger. Tell me what breaks first and how you would evolve the design.', 'SD_TRADEOFF']
    ],
    Database: [
    ['Tell me about yourself and your experience working with relational or NoSQL data.', 'INTRO'],
    ['Pick one project where you designed or changed a data model. What did you choose and why?', 'RESUME'],
    ['Let us work through the database problem. First clarify the requirements and access patterns.', 'DB_CLARIFY'],
    ['Design the schema and explain the entities, relationships, keys and constraints.', 'DB_SCHEMA'],
    ['Now draw the ER diagram and explain the cardinality of each important relationship.', 'DB_ER'],
    ['What indexes would you add? Explain the read/write trade-offs and query patterns.', 'DB_INDEX'],
    ['How would you handle concurrency, transactions and consistency for the critical write path?', 'DB_TXN'],
    ['Suppose the dataset grows 100x. What would you change first?', 'DB_SCALE']
  ],
  Backend: [
      ['Tell me about yourself and a backend system where you made an architectural decision.', 'INTRO'],
      ['Walk me through the most critical request path and its failure modes.', 'RESUME'],
      ['How would you instrument and operate that service at scale?', 'BACKEND_SCALE'],
      ['How would you migrate a critical data model with near-zero downtime?', 'BACKEND_SCALE']
    ]
  }
};

const designDocs = {
  'SDE-1': { title: 'Design a URL Shortener', body: 'Build a service that converts long URLs into short links and redirects users to the original URL. Start with a simple production-ready design.', bullets: ['Create a short URL for a long URL', 'Redirect a short URL to the original URL', 'Assume links should remain durable', 'Keep analytics out of scope for the first version'] },
  'SDE-2': { title: 'Design a High-Traffic Feed', body: 'Design a feed service for a large consumer application. Users should see a personalized feed with predictable latency while individual downstream services can fail.', bullets: ['Generate and serve a personalized feed', 'Support high read traffic and bursts', 'Tolerate partial dependency failures', 'Explain caching and freshness decisions'] },
  Senior: { title: 'Design a Globally Distributed File Metadata Service', body: 'Design a metadata service used by clients around the world. It must remain available during regional failures and support rapid growth.', bullets: ['Create, read, update and delete metadata', 'Serve low-latency reads globally', 'Survive a regional outage', 'Explain consistency, partitioning and recovery'] }
};

const dsaDocs = {
  'SDE-1': { title: 'Longest Consecutive Sequence', body: 'Given an unsorted array of integers, return the length of the longest consecutive elements sequence. The solution should run in O(n) time.', bullets: ['Example: [100,4,200,1,3,2] → 4', 'Do not assume the array is sorted', 'Discuss duplicates and an empty input'] },
  'SDE-2': { title: 'Minimum Window Substring', body: 'Given strings s and t, return the smallest substring of s that contains every character in t with the required frequency.', bullets: ['Example: s = ADOBECODEBANC, t = ABC → BANC', 'Discuss repeated characters', 'Target O(n) time'] },
  Senior: { title: 'Streaming Top-K Events', body: 'A stream contains a very large number of event IDs. Return the K most frequent IDs while keeping memory bounded.', bullets: ['Events arrive continuously', 'K is much smaller than the stream size', 'Discuss exact vs approximate solutions'] }
};

const databaseDocs = {
  'SDE-1': { title: 'Design an Order Management Schema', body: 'Model customers, orders and products for an e-commerce application. Focus on correctness, relationships, constraints and common read/write patterns.', bullets: ['Customers can place many orders', 'An order contains multiple products with quantities', 'Orders have a status and timestamps', 'Explain keys, foreign keys and one-to-many / many-to-many relationships'] },
  'SDE-2': { title: 'Design a Marketplace Data Model', body: 'Design the primary relational model for listings, sellers, buyers, bids and purchases. Explain how the model supports the most important queries.', bullets: ['Listings can receive many bids', 'A successful bid should produce a purchase record', 'Users may be both buyers and sellers', 'Explain indexes, consistency and transaction boundaries'] },
  Senior: { title: 'Design a Globally Used Inventory Data Model', body: 'Design the data model for inventory across multiple warehouses and regions. Prioritize correctness, availability and operational scalability.', bullets: ['Inventory is tracked per product and warehouse', 'Concurrent reservations must not oversell stock', 'Reads are globally distributed', 'Explain partitioning, consistency, retention and recovery'] }
};

function say(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }
}

const topicQuestions = {
  'Computer Fundamentals': 'In your own words, explain the most important concept you know from computer fundamentals and give me one practical example.',
  'Operating Systems': 'Suppose a server is running many requests at once. Explain the difference between a process and a thread, and when you would choose each.',
  'DBMS': 'Explain how a database index works, then describe when an index hurts performance and how you would verify the right index with real query patterns.',
  'Computer Networks': 'Walk me through what happens to an HTTP request from the client to the server, including DNS, TCP or QUIC, and the response.',
  'OOP': 'Take a small backend feature and explain how you would use object-oriented design without over-engineering it.',
  'APIs': 'How would you design a robust REST API endpoint? Cover validation, idempotency, errors, pagination, and authentication.'
};

function resumeQuestion(resume) {
  const clean = resume.replace(/\\s+/g, ' ').trim();
  if (!clean) return null;
  const terms = clean.match(/(?:Spring Boot|Node(?:\.js)?|React|PostgreSQL|MySQL|MongoDB|Redis|Kafka|AWS|Docker|Kubernetes|JWT|REST|GraphQL|Java|C\\+\\+|Python|microservices|API|database|cache)/gi) || [];
  const unique = [...new Set(terms.map(item => item.toLowerCase()))].slice(0, 3);
  const focus = unique.length ? unique.join(', ') : 'one of the technologies or projects you listed';
  return [`I noticed ${focus} in your resume. Pick the most relevant project and walk me through what you personally built, why you chose that approach, and one problem you had to solve.`, 'RESUME'];
}

function buildQuestions(level, type, resume, topic) {
  let list = [...(bank[level]?.[type] || bank['SDE-1'].General)];
  if (resume.trim() && type === 'General') {
    const focus = resumeQuestion(resume);
    list = [list[0], focus, ['From the experience you described, what was the hardest technical decision and how did you validate it?', 'RESUME'], ['What would you improve in that project if you had another month?', 'RESUME']];
  }
  if (type === 'General' || type === 'Backend') {
    const topicPrompt = topicQuestions[topic] || topicQuestions['Computer Fundamentals'];
    list.splice(Math.min(3, list.length), 0, [topicPrompt, 'TECHNICAL']);
  }
  const resumePrompt = resumeQuestion(resume);
  if (resumePrompt && type !== 'DSA') {
    const resumeIndex = list.findIndex(item => item[1] === 'RESUME');
    if (resumeIndex >= 0) list[resumeIndex] = resumePrompt;
    else list.splice(1, 0, resumePrompt);
  }
  return list;
}

export default function App() {
  const [screen, setScreen] = useState('home');
  const [progress, setProgress] = useState(defaults);
  const [overview, setOverview] = useState(null);
  const [setup, setSetup] = useState({ level: 'SDE-1', role: 'Backend Engineer', type: 'General', topic: 'Computer Fundamentals', difficulty: 'Adaptive', durationMinutes: 30, resume: '' });
  const [session, setSession] = useState(null);
  const [report, setReport] = useState(null);
  const [room, setRoom] = useState(false);
  const [toast, setToast] = useState('');
  const [preparing, setPreparing] = useState(null);

  useEffect(() => {
    supabase.auth.signInAnonymously().catch(() => null);
    api.getProgress().then(setProgress).catch(() => null);
    api.getPerformanceOverview('ALL').then(setOverview).catch(() => null);
  }, []);

  async function begin() {
    const questions = buildQuestions(setup.level, setup.type, setup.resume, setup.topic);
    let data = { id: crypto.randomUUID(), status: 'IN_PROGRESS', interviewType: setup.type, difficulty: setup.difficulty, durationMinutes: setup.durationMinutes };
    setPreparing({ stage: 0, startedAt: Date.now(), localData: data, questions });
    setScreen('preparing');
    let remoteQuestions = [];
    try {
      const category = setup.type === 'System Design' ? 'System Design' : setup.type === 'DSA' ? 'DSA' : setup.type === 'Database' ? 'DBMS' : '';
      remoteQuestions = await api.getCatalog({ category, difficulty: setup.difficulty === 'Adaptive' ? '' : setup.difficulty.toUpperCase() });
      data = await api.startInterview({ experienceLevel: setup.level, role: setup.role, interviewType: setup.type, difficulty: setup.difficulty, durationMinutes: setup.durationMinutes, consent: true });
      if (remoteQuestions.length) questions.push(...remoteQuestions.slice(0, 2).map(q => [q.prompt, setup.type === 'Database' ? 'DB_SCHEMA' : 'TECHNICAL']));
    } catch {
      data = { ...data, local: true };
    }
    const setupData = { ...data, ...setup, questions, resumeContext: setup.resume };
    const stageMs = 2400;
    let stage = 0;
    const tick = setInterval(() => {
      stage += 1;
      if (stage < preparationStages.length) setPreparing(value => value ? { ...value, stage } : value);
      else {
        clearInterval(tick);
        setPreparing(null);
        setSession(setupData);
        setScreen('interview');
      }
    }, stageMs);
  }

  return <div className="app">
    <aside className="sidebar">
      <button className="brand" onClick={() => setScreen('home')}><span>O</span>orbite</button>
      <div className="sidebar-label">INTERVIEW GYM</div>
      <nav>
        <button className={screen === 'home' ? 'active' : ''} onClick={() => setScreen('home')}>⌂ <span>Practice home</span></button>
        <button className={screen === 'setup' ? 'active' : ''} onClick={() => setScreen('setup')}>◉ <span>Start interview</span></button>
        <button className={screen === 'interviews' ? 'active' : ''} onClick={() => setScreen('interviews')}>▤ <span>Interview history</span></button>
        <button className={screen === 'practice' ? 'active' : ''} onClick={() => setScreen('practice')}>◇ <span>Practice problems</span></button>
        <button className={screen === 'roadmap' ? 'active' : ''} onClick={() => setScreen('roadmap')}>◈ <span>My roadmap</span></button>
        <button className={screen === 'progress' ? 'active' : ''} onClick={() => setScreen('progress')}>◔ <span>My progress</span></button>
      </nav>
      <div className="privacy"><b>Private by design</b><small>Audio is processed in the browser. Raw recordings are not stored.</small></div>
      <div className="profile"><i>AS</i><span><b>Alex Singh</b><small>Candidate</small></span><button>•••</button></div>
    </aside>
    <main>
      <header className="dashboardHeader"><div><small>INTERVIEW GYM</small><h3>Practice the interview, not just the answer.</h3></div><div className="ready">READINESS <b>{overview?.overallScore || 0}<small>/100</small></b></div></header>
      {screen === 'home' && <HomeLanding start={() => setScreen('setup')} progress={() => setScreen('progress')} rooms={() => setRoom(true)} />}
      {screen === 'progress' && <Home progress={progress} overview={overview} start={() => setScreen('setup')} rooms={() => setRoom(true)} />}
      {screen === 'interviews' && <InterviewHistoryView start={() => setScreen('setup')} />}
      {screen === 'practice' && <PracticeView />}
      {screen === 'setup' && <Setup data={setup} change={setSetup} begin={begin} />}
      {screen === 'preparing' && preparing && <InterviewPreparation stage={preparing.stage} startedAt={preparing.startedAt} />}
      {screen === 'interview' && <Interview session={session} close={() => setScreen('home')} showReport={value => { setReport(value); setScreen('report'); }} toast={setToast} />}
      {screen === 'report' && <Report data={report || reportFallback} again={() => setScreen('setup')} home={() => setScreen('home')} />}
      {screen === 'roadmap' && <Roadmap start={() => setScreen('setup')} latestReport={report} />}
    </main>
    {room && <LiveRoom close={() => setRoom(false)} type={setup.type} />}
    {toast && <div className="toast">{toast}<button onClick={() => setToast('')}>×</button></div>}
  </div>;
}

function HomeLanding({ start, progress, rooms }) {
  return <div className="page homePage"><section className="homeHero"><div><p className="eyebrow">REALISTIC MOCK INTERVIEWS</p><h1>Make the room feel<br /><em>like the real thing.</em></h1><p>Warm-up questions, resume deep-dives, real coding problems, and adaptive follow-ups in one focused interview room.</p><button className="primary" onClick={start}>Configure interview <b>→</b></button><button className="textButton" onClick={progress}>View performance <b>→</b></button></div><div className="heroPreview"><div className="previewTop"><span className="liveDot" /> ORBITE INTERVIEW ROOM <b>LIVE</b></div><div className="previewCaption">“Before we jump into the technical part, tell me about yourself.”</div></div></section><section className="grid"><article className="panel"><p className="eyebrow">LEARNING LOOP</p><h2>Interview, practice, improve.</h2><div className="featureLine"><b>01</b><span>Complete a realistic interview with targeted follow-ups.</span></div><div className="featureLine"><b>02</b><span>Open your Progress page to see evidence-based trends.</span></div><div className="featureLine"><b>03</b><span>Practice the weakest skill with real coding problems.</span></div></article><article className="panel recommended"><p className="eyebrow">PRIVATE PRACTICE</p><h2>Build signal over time.</h2><p>Orbite keeps your interview answers and practice results connected so the next session can adapt to the work you have already done.</p><button className="textButton" onClick={rooms}>Find a human practice partner →</button></article></section></div>;
}

function Home({ overview, start, rooms }) {
  const [range, setRange] = useState('ALL');
  const [data, setData] = useState(overview);
  useEffect(() => { if (range !== 'ALL') api.getPerformanceOverview(range).then(setData).catch(() => null); }, [range]);
  const metrics = data?.skills || [];
  const points = data?.trend || [];
  const chart = points.length > 1 ? points.map((point, index) => `${(index / (points.length - 1)) * 100},${100 - point.score}`).join(' ') : '';
  return <div className="page homePage performancePage">
    <section className="performanceIntro"><div><p className="eyebrow">YOUR INTERVIEW PROGRESS</p><h1>Turn every answer<br /><em>into a better next round.</em></h1><p>Orbite evaluates your completed interviews, remembers the skills that need work, and turns them into focused practice.</p><button className="primary" onClick={start}>Start an interview <b>→</b></button><button className="textButton" onClick={rooms}>Find a practice partner</button></div><div className="overallScore"><small>OVERALL SCORE</small><b>{data?.overallScore || 0}<span>/100</span></b><em>{data?.previousScore == null ? (data?.totalInterviews ? 'Baseline established' : 'Complete an interview to establish your baseline') : `${data.improvementPercent >= 0 ? '↑' : '↓'} ${Math.abs(data.improvementPercent)}% from previous`}</em></div></section>
    <section className="metrics performanceMetrics">{[["Average", data?.averageScore || 0], ["Best", data?.bestScore || 0], ["Interviews", data?.totalInterviews || 0], ["Readiness", data?.readiness || 'No data']].map(([name, value]) => <article key={name}><small>{name}</small><b>{value}</b></article>)}</section>
    <section className="performanceGrid"><article className="panel trendPanel"><div className="sectionHead"><div><p className="eyebrow">PERFORMANCE TREND</p><h2>History, not guesses.</h2></div><select value={range} onChange={event => setRange(event.target.value)}><option value="LAST_5">Last 5</option><option value="LAST_10">Last 10</option><option value="LAST_30">Last 30 days</option><option value="LAST_90">Last 90 days</option><option value="ALL">All interviews</option></select></div>{points.length > 1 ? <div className="trendChart"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points={chart} /></svg><div className="chartLabels">{points.slice(-5).map(point => <span key={point.date}>{point.label.slice(5)}</span>)}</div></div> : <div className="emptyState">Complete more interviews to unlock performance trends.</div>}</article><article className="panel"><p className="eyebrow">SKILL PERFORMANCE</p><h2>Where your signal is strongest.</h2>{metrics.slice(0, 7).map(item => <div className="skill" key={item.key}><span>{item.name}</span><div><i style={{ width: `${item.current}%` }} /></div><b>{item.current}</b></div>)}{!metrics.length && <div className="emptyState">Your skill profile will appear after your first completed interview.</div>}</article></section>
    <section className="performanceGrid lowerGrid"><article className="panel"><p className="eyebrow">BIGGEST IMPROVEMENTS</p><h2>Progress worth keeping.</h2>{data?.improvements?.length ? data.improvements.map(item => <div className="insightRow" key={item.key}><span><b>{item.name}</b><small>{item.previous} → {item.current}</small></span><strong className="positive">+{item.change}</strong></div>) : <div className="emptyState">Complete a second interview to compare improvements.</div>}</article><article className="panel"><p className="eyebrow">NEEDS ATTENTION</p><h2>Focus next.</h2>{data?.attention?.length ? data.attention.map(item => <div className="insightRow" key={item.key}><span><b>{item.name}</b><small>{item.current} / 100</small></span><strong>{item.current}</strong></div>) : <div className="emptyState">No weak areas yet. Your baseline will guide recommendations.</div>}</article><article className="panel recommendationsPanel"><p className="eyebrow">RECOMMENDED FOR YOU</p><h2>Practice with purpose.</h2>{data?.recommendations?.length ? data.recommendations.slice(0, 3).map(item => <div className="recommendationRow" key={item.id}><span>{item.difficulty}</span><div><b>{item.title}</b><small>{item.topic} · {item.focus}</small></div></div>) : <div className="emptyState">Recommendations appear after performance data is available.</div>}<button className="textButton" onClick={start}>Open practice plan →</button></article></section>
    <section className="panel historyPanel"><div className="sectionHead"><div><p className="eyebrow">RECENT INTERVIEWS</p><h2>Keep the trajectory visible.</h2></div><span className="consistency">Consistency {data?.consistencyScore || 0}%</span></div>{data?.recentInterviews?.length ? <div className="historyTable">{data.recentInterviews.map(item => <div className="historyRow" key={item.id}><span>{item.date}</span><b>{item.interviewType}</b><small>{item.difficulty} · {item.durationMinutes || 0} min</small><strong>{item.overallScore}</strong><em className={item.change >= 0 ? 'positive' : 'negative'}>{item.change == null ? 'Baseline' : `${item.change >= 0 ? '+' : ''}${item.change}`}</em></div>)}</div> : <div className="emptyState">Your completed interviews will appear here with score changes.</div>}</section>
  </div>;
}

function InterviewHistoryView({ start }) {
  const [history, setHistory] = useState(null);
  const [detail, setDetail] = useState(null);
  useEffect(() => { api.getInterviewHistory('ALL').then(setHistory).catch(() => setHistory([])); }, []);
  async function open(item) { try { setDetail(await api.getInterviewResults(item.id)); } catch { setDetail(null); } }
  if (detail) return <div className="page detailPage"><button className="textButton" onClick={() => setDetail(null)}>← Back to history</button><p className="eyebrow">INTERVIEW RESULT</p><h1>{detail.interview.interviewType}<br /><em>{detail.interview.overallScore} / 100</em></h1><div className="detailGrid"><section className="panel"><p className="eyebrow">SKILL SIGNALS</p>{detail.skills.map(item => <div className="skill" key={item.key}><span>{item.name}</span><div><i style={{ width: `${item.current}%` }} /></div><b>{item.current}</b></div>)}</section><section className="panel"><p className="eyebrow">STRENGTHS</p>{detail.strengths.map(item => <p className="detailText" key={item}>{item}</p>)}<p className="eyebrow detailKicker">NEXT FOCUS</p>{detail.improvements.map(item => <p className="detailText" key={item}>{item}</p>)}</section></div><section className="panel answerHistory"><p className="eyebrow">ANSWER RECORD</p>{detail.answers.map(item => <article key={item.id}><small>{item.answerKind} · {item.durationSeconds}s</small><b>{item.prompt}</b><p>{item.transcript}</p></article>)}</section></div>;
  return <div className="page historyPage"><p className="eyebrow">INTERVIEW HISTORY</p><div className="pageTitleLine"><div><h1>Every round leaves<br /><em>a useful trace.</em></h1><p className="intro">Open a completed session to inspect the answers and evidence behind its score.</p></div><button className="primary" onClick={start}>Start interview <b>→</b></button></div>{history?.length ? <section className="panel historyPanel">{history.map(item => <button className="historyRow historyButton" key={item.id} onClick={() => open(item)}><span>{item.date}</span><b>{item.interviewType}</b><small>{item.difficulty} · {item.durationMinutes || 0} min</small><strong>{item.overallScore}</strong><em className={item.change >= 0 ? 'positive' : 'negative'}>{item.change == null ? 'Baseline' : `${item.change >= 0 ? '+' : ''}${item.change}`}</em></button>)}</section> : <section className="panel emptyState largeEmpty">Complete your first interview to create a performance history.</section>}</div>;
}

function PracticeView() {
  const [problems, setProblems] = useState(null);
  const [category, setCategory] = useState('DSA');
  const [attempt, setAttempt] = useState(null);
  const [practiceCode, setPracticeCode] = useState('');
  const [runStatus, setRunStatus] = useState('');
  const [form, setForm] = useState({ correct: true, performanceScore: 70, confidence: 70, attempts: 1, hintsUsed: 0, timeSeconds: 0, solutionViewed: false, mistakes: '' });
  useEffect(() => { api.getRecommendedPractice(category).then(setProblems).catch(() => setProblems([])); }, [category]);
  async function begin(problem) { try { setAttempt({ ...(await api.startPracticeAttempt(problem.id)), problemStatement: problem.problemStatement, testCases: problem.testCases, starterCode: problem.starterCode }); setPracticeCode(problem.starterCode || '// Write your solution here'); setRunStatus(''); } catch { setAttempt(null); } }
  async function complete() { if (!attempt) return; await api.completePracticeAttempt(attempt.id, form).catch(() => null); setAttempt(null); setProblems(items => items ? items.filter(item => item.id !== attempt.questionId) : items); }
  async function runCode() { setRunStatus('Compiling and running visible tests…'); const result = await api.runPracticeCode({ language: 'cpp', source: practiceCode, stdin: '' }).catch(error => ({ error: error.message })); setRunStatus(result.error || result.output || result.errorMessage || (result.compiled ? 'Program passed compilation.' : 'Compilation failed.')); }
  if (attempt) return <div className="page practicePage"><p className="eyebrow">PRACTICE SESSION</p><h1>Work the weak signal.<br /><em>Then record what changed.</em></h1><div className="practiceWorkspace"><section className="panel problemPanel"><p className="eyebrow">{attempt.topic} · {attempt.difficulty}</p><h2>{attempt.title}</h2><p>{attempt.problemStatement}</p><h3>Test cases</h3><pre>{attempt.testCases}</pre></section><section className="panel practiceEditor"><div className="codeToolbar"><span>solution.cpp · C++17</span><button onClick={runCode}>Compile & run ▷</button></div><textarea className="codeEditor" value={practiceCode} onChange={event => setPracticeCode(event.target.value)} spellCheck="false" /><p className="runStatus">{runStatus || 'Compile and run your implementation before recording your result.'}</p><div className="practiceInputs"><label>Result<select value={String(form.correct)} onChange={event => setForm({ ...form, correct: event.target.value === 'true' })}><option value="true">Correct</option><option value="false">Needs another attempt</option></select></label><label>Score<input type="number" min="0" max="100" value={form.performanceScore} onChange={event => setForm({ ...form, performanceScore: Number(event.target.value) })} /></label><label>Confidence<input type="number" min="0" max="100" value={form.confidence} onChange={event => setForm({ ...form, confidence: Number(event.target.value) })} /></label><label>Time<input type="number" min="0" value={form.timeSeconds} onChange={event => setForm({ ...form, timeSeconds: Number(event.target.value) })} /></label></div><textarea placeholder="What mistake should you remember?" value={form.mistakes} onChange={event => setForm({ ...form, mistakes: event.target.value })} /><button className="primary" onClick={complete}>Save practice result <b>→</b></button></section></div></div>;
  return <div className="page practicePage"><p className="eyebrow">PRACTICE LIBRARY</p><h1>Practice the next<br /><em>highest-leverage skill.</em></h1><p className="intro">Choose a discipline, then work through real problems with statements, constraints, test cases, and an editor.</p><div className="practiceCategories">{[['DSA','DSA'],['DBMS','DATABASE'],['OOP','OOP'],['Operating Systems','OS'],['Backend','BACKEND'],['System Design','System Design']].map(([label, value]) => <button className={category === value ? 'chosen' : ''} key={value} onClick={() => setCategory(value)}>{label}</button>)}</div><section className="practiceList">{problems?.length ? problems.map(problem => <article className="panel practiceCard" key={problem.id}><div><span>{problem.difficulty}</span><h2>{problem.title}</h2><small>{problem.category} · {problem.topic}</small><p>{problem.explanation}</p></div><button className="primary" onClick={() => begin(problem)}>Start <b>→</b></button></article>) : <div className="panel emptyState largeEmpty">No {category} problems are seeded yet. Add questions to the catalog to make this section available.</div>}</section></div>;
}

function InterviewPreparation({ stage, startedAt }) {
  const [elapsed, setElapsed] = useState(Math.floor((Date.now() - startedAt) / 1000));
  useEffect(() => { const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 250); return () => clearInterval(timer); }, [startedAt]);
  const remaining = Math.max(0, 12 - elapsed);
  const current = preparationStages[Math.min(stage, preparationStages.length - 1)];
  return <div className="page preparationPage"><div className="preparationCard"><span className="eyebrow">SETTING UP YOUR INTERVIEW</span><div className="prepOrb">O</div><h1>Give us a moment.<br /><em>We are preparing your room.</em></h1><p className="prepLead">A real interview does not begin the instant you click a button. We are using this setup window to build your interview plan and calibrate Maya's follow-ups.</p><div className="prepStage"><div><b>{current[0]}</b><small>{current[1]}</small></div><span>{Math.min(100, Math.round(((elapsed) / 12) * 100))}%</span></div><div className="prepTrack"><i style={{ width: `${Math.min(100, Math.round((elapsed / 12) * 100))}%` }} /></div><div className="prepGrid">{preparationStages.map(([name], i) => <div className={i <= stage ? 'done' : ''} key={name}><span>{i < stage ? '✓' : String(i + 1).padStart(2, '0')}</span><small>{name}</small></div>)}</div><div className="prepCountdown">Opening room in <b>{remaining}s</b></div></div></div>;
}

function Setup({ data, change, begin }) {
  const update = (key, value) => change({ ...data, [key]: value });
  const typeNeedsTopic = data.type === 'General' || data.type === 'Backend';
  return <div className="page setupPage">
    <div className="setupIntro"><div><p className="eyebrow">CREATE A FOCUSED SESSION</p><h1>Choose the room.<br /><em>We will run it like an interview.</em></h1><p className="intro">The selected level changes the depth of DSA, system design and follow-up questions. Add a little resume context and Maya can use it during the warm-up.</p></div><div className="setupSummary"><span>SESSION PLAN</span><b>{data.level} · {data.type}</b><small>{data.role} · {data.durationMinutes} min</small></div></div>
    <div className="setupGrid">
      <section className="setupCard"><label>Target level</label><div className="choices">{levels.map(value => <button key={value} className={data.level === value ? 'chosen' : ''} onClick={() => update('level', value)}>{value}</button>)}</div></section>
      <section className="setupCard"><label>Role</label><div className="choices">{roles.map(value => <button key={value} className={data.role === value ? 'chosen' : ''} onClick={() => update('role', value)}>{value}</button>)}</div></section>
      <section className="setupCard wide"><label>Interview type</label><div className="typeChoices">{types.map(value => <button key={value} className={data.type === value ? 'chosen' : ''} onClick={() => update('type', value)}><b>{value === 'System Design' ? 'SD' : value === 'DSA' ? 'DS' : value === 'Backend' ? 'BE' : 'GE'}</b><span>{value}</span></button>)}</div></section>
      {typeNeedsTopic && <section className="setupCard wide"><label>Topic</label><div className="choices">{topics.map(value => <button key={value} className={data.topic === value ? 'chosen' : ''} onClick={() => update('topic', value)}>{value}</button>)}</div></section>}
      <section className="setupCard"><label>Difficulty</label><div className="choices">{difficulties.map(value => <button key={value} className={data.difficulty === value ? 'chosen' : ''} onClick={() => update('difficulty', value)}>{value}</button>)}</div></section>
      <section className="setupCard"><label>Duration</label><div className="choices">{durations.map(value => <button key={value} className={data.durationMinutes === value ? 'chosen' : ''} onClick={() => update('durationMinutes', value)}>{value} min</button>)}</div></section>
      <section className="setupCard wide resumeCard"><div><label>Resume context <span>optional</span></label><p>Upload a text resume or paste project bullets. General questions will be generated from this context.</p><input type="file" accept=".txt,.md,.pdf" onChange={event => { const file = event.target.files?.[0]; if (file && file.type !== 'application/pdf') file.text().then(value => update('resume', value)); }} /></div><textarea value={data.resume} onChange={event => update('resume', event.target.value)} placeholder="Example: Built a Spring Boot order service with PostgreSQL, Redis caching and JWT authentication…" /></section>
    </div>
    <div className="startLine"><span><b>Interview flow</b><small>Introduction → resume/project questions → {data.type === 'System Design' ? 'requirements → capacity → architecture → reliability → security → monitoring' : data.type === 'DSA' ? 'clarify → brute force → optimize → code → mandatory dry run → complexity' : data.type === 'Database' ? 'requirements → schema → ER diagram → indexes → transactions → scale' : 'technical follow-ups'}</small></span><button className="primary" onClick={begin}>Enter interview room <b>→</b></button></div>
  </div>;
}


const adaptiveFollowUps = {
  INTRO: [
    ['What would you say is the strongest engineering signal in that answer?', 'FOLLOW_UP'],
    ['You mentioned that briefly. Can you give me one concrete example from your work?', 'CHALLENGE']
  ],
  RESUME: [
    ['Why did you choose that approach instead of the obvious alternative?', 'FOLLOW_UP'],
    ['What was the main failure mode or trade-off you had to manage?', 'TRADE_OFF'],
    ['If I gave this problem to another engineer, what would you want them to understand first?', 'CHALLENGE']
  ],
  BEHAVIORAL: [
    ['What was your specific contribution, rather than the team outcome?', 'FOLLOW_UP'],
    ['What would you do differently if you faced the same situation today?', 'TRADE_OFF']
  ],
  TECHNICAL: [
    ['What is the key trade-off in that approach?', 'TRADE_OFF'],
    ['What edge case would you test first, and why?', 'CHALLENGE']
  ],
  DSA_CLARIFY: [
    ['Good. Before we solve it, what assumption would you verify if the interviewer gave you more constraints?', 'CHALLENGE']
  ],
  DSA_BRUTE: [
    ['Before optimizing, tell me exactly where the current approach spends most of its time.', 'FOLLOW_UP'],
    ['What is one edge case that would expose a weakness in the brute-force approach?', 'CHALLENGE']
  ],
  DSA_OPTIMIZE: [
    ['Hold on—why is that lookup safe to treat as O(1) on average?', 'CHALLENGE'],
    ['What invariant tells you the optimized scan does not miss a valid sequence?', 'TRADE_OFF']
  ],
  DSA_CODE: [
    ['Pause there. Walk me through the most important invariant in the code you just wrote.', 'CHALLENGE'],
    ['What test case would make you least confident in this implementation?', 'FOLLOW_UP']
  ],
  DSA_DRYRUN: [
    ['Now change one constraint: duplicates are extremely common. What changes?', 'TRADE_OFF'],
    ['Give me the exact time and space complexity of the implementation you just dry-ran.', 'FOLLOW_UP']
  ],
  DB_CLARIFY: [
    ['What read and write queries are most important to this workload?', 'FOLLOW_UP'],
    ['What consistency requirement would change your schema or transaction design?', 'CHALLENGE']
  ],
  DB_SCHEMA: [
    ['Why did you normalize or denormalize that relationship?', 'TRADE_OFF'],
    ['What constraint prevents invalid data from entering the system?', 'CHALLENGE']
  ],
  DB_ER: [
    ['Explain the cardinality of this relationship and why it is not the alternative.', 'CHALLENGE'],
    ['Where is the ownership boundary in this model?', 'FOLLOW_UP']
  ],
  DB_INDEX: [
    ['Give me a concrete query that justifies each index you proposed.', 'FOLLOW_UP'],
    ['What is the write cost of adding this index?', 'TRADE_OFF']
  ],
  DB_TXN: [
    ['Which isolation level do you need and which anomaly are you preventing?', 'CHALLENGE'],
    ['What happens when the transaction fails halfway through?', 'FOLLOW_UP']
  ],
  DB_SCALE: [
    ['What becomes the first bottleneck at 100x scale?', 'TRADE_OFF'],
    ['Would you partition, shard, replicate, archive or change the workload first? Why?', 'CHALLENGE']
  ],
  SD_PROBLEM: [
    ['Before you design it, what is explicitly out of scope for this first version?', 'CHALLENGE']
  ],
  SD_FR: [
    ['Which requirement would you cut first if we had half the engineering time?', 'TRADE_OFF'],
    ['Which user behavior is most likely to break your assumptions?', 'CHALLENGE']
  ],
  SD_NFR: [
    ['You chose that latency target. What user experience or business constraint justifies it?', 'FOLLOW_UP'],
    ['Which requirement are you willing to weaken under load?', 'TRADE_OFF']
  ],
  SD_ARCH: [
    ['Wait—assume the cache is stale for five minutes. What does the user see?', 'CHALLENGE'],
    ['Which component is your first scaling bottleneck, and why?', 'TRADE_OFF']
  ],
  SD_DATA: [
    ['Now one region is unavailable. Walk me through recovery without hand-waving.', 'CHALLENGE'],
    ['Why this data store instead of a relational database?', 'TRADE_OFF']
  ],
  SD_TRADEOFF: [
    ['Make the trade-off explicit: what are we giving up to get that reliability?', 'FOLLOW_UP'],
    ['How would you monitor this in production and know the design is degrading?', 'CHALLENGE']
  ],
  SD_CAPACITY: [
    ['Check your estimate: which number contributes most to the final capacity requirement?', 'FOLLOW_UP']
  ],
  SD_SECURITY: [
    ['What is the most important abuse or data-security threat in this system?', 'CHALLENGE']
  ],
  SD_OBSERVABILITY: [
    ['Which three metrics would page the on-call engineer first?', 'FOLLOW_UP']
  ],
  BACKEND_SCALE: [
    ['What would you instrument first so you could prove the service is healthy?', 'FOLLOW_UP'],
    ['What changes when traffic grows 10x but the database does not?', 'TRADE_OFF']
  ]
};

function answerSignals(text) {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
  const words = normalized ? normalized.split(' ') : [];
  const fillers = (normalized.match(/\b(um+|uh+|like|you know|basically)\b/g) || []).length;
  const hasExample = /\b(for example|for instance|in my project|we had|i saw)\b/.test(normalized);
  const hasTradeoff = /\b(trade[- ]?off|however|but|versus|instead|downside|cost|benefit)\b/.test(normalized);
  const hasDirect = words.length >= 4 && words.slice(0, 12).some(word => ['because','use','would','the','i\'d','i would','my'].includes(word));
  const hasEdgeCase = /\b(edge case|duplicate|empty|null|failure|timeout|race|retry|scale|latency)\b/.test(normalized);
  const structured = /\b(first|second|third|then|finally|overall|in summary)\b/.test(normalized);
  return { words: words.length, fillers, hasExample, hasTradeoff, hasDirect, hasEdgeCase, structured };
}

function selectAdaptiveTurn(stage, signals, history, level) {
  const bank = adaptiveFollowUps[stage] || adaptiveFollowUps.TECHNICAL;
  const alreadyAsked = new Set(history.map(item => item.prompt));
  let candidates = bank.filter(([prompt]) => !alreadyAsked.has(prompt));
  if (!candidates.length) return null;
  if (signals.hasTradeoff && stage.includes('TRADE')) { const filtered = candidates.filter(([_, kind]) => kind !== 'TRADE_OFF'); if (filtered.length) candidates = filtered; }
  const priority = signals.fillers >= 3 ? 'FOLLOW_UP' : !signals.hasTradeoff ? 'TRADE_OFF' : !signals.hasEdgeCase ? 'CHALLENGE' : null;
  if (priority) {
    const preferred = candidates.find(([, kind]) => kind === priority);
    if (preferred) return { prompt: preferred[0], stage, kind: preferred[1], adaptive: true };
  }
  const [prompt, kind] = candidates[Math.min(history.length % candidates.length, candidates.length - 1)];
  return { prompt, stage, kind, adaptive: true };
}

function maybeInterruption(stage, signals, level) {
  if (signals.words < 35) return null;
  if (signals.fillers >= 3) return 'Let me stop you for a second. You have the right direction—give me the core answer in one sentence first.';
  if (!signals.hasTradeoff && ['RESUME','TECHNICAL','DSA_OPTIMIZE','SD_ARCH','SD_DATA','BACKEND_SCALE'].includes(stage)) return 'One quick interruption: what is the main trade-off you are making here?';
  if (!signals.hasEdgeCase && level !== 'SDE-1' && ['DSA_CODE','DSA_DRYRUN','SD_ARCH','SD_TRADEOFF'].includes(stage)) return 'Let me challenge that with an edge case. What breaks first?';
  return null;
}

function answerRelevance(stage, text, code) {
  const normalized = text.toLowerCase();
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  if (wordCount < 5 || /^(?:i don't know|idk|no idea|yes|no|okay|ok)[.! ]*$/.test(normalized)) return 'Please give me a complete answer with your reasoning.';
  if (['DSA_CLARIFY', 'DSA_BRUTE', 'DSA_OPTIMIZE', 'DSA_CODE', 'DSA_DRYRUN'].includes(stage)) {
    const technicalSignals = ['array', 'string', 'map', 'set', 'hash', 'stack', 'queue', 'tree', 'graph', 'loop', 'sort', 'search', 'complexity', 'runtime', 'space', 'invariant', 'edge', 'case', 'algorithm', 'pointer', 'window', 'recursion', 'dp', 'dynamic', 'code', 'implement'];
    if (!technicalSignals.some(signal => normalized.includes(signal))) return 'That does not address the coding problem. Explain the data structure, algorithm, or constraint you are reasoning about.';
  }
  if (stage.startsWith('SD_')) {
    const designSignals = ['requirement', 'scale', 'latency', 'availability', 'database', 'cache', 'queue', 'api', 'storage', 'replica', 'consistency', 'failure', 'traffic', 'request'];
    if (!designSignals.some(signal => normalized.includes(signal))) return 'That does not address the design problem. Explain a requirement, constraint, component, data flow, or trade-off.';
  }
  if (stage.startsWith('DB_')) {
    const databaseSignals = ['table', 'row', 'column', 'index', 'query', 'schema', 'foreign key', 'transaction', 'lock', 'consistency', 'join', 'normaliz'];
    if (!databaseSignals.some(signal => normalized.includes(signal))) return 'That does not address the database problem. Explain the schema, query, index, transaction, or consistency decision.';
  }
  if (stage === 'BACKEND_SCALE' || stage === 'TECHNICAL') {
    const engineeringSignals = ['api', 'service', 'database', 'cache', 'queue', 'error', 'retry', 'scale', 'test', 'request', 'security', 'log', 'monitor'];
    if (!engineeringSignals.some(signal => normalized.includes(signal))) return 'That does not address the engineering question. Tie your answer to the service, request path, data, reliability, or trade-off.';
  }
  if (stage === 'DSA_CODE') {
    const implementation = code.replace(/^\/\/.*$/gm, '').trim();
    if (implementation.length < 25) return 'Please move to the code editor and write the implementation before we continue.';
    if (!/(approach|algorithm|complexity|invariant|time|space)/.test(normalized)) return 'Before I review the implementation, state the approach, invariant, and time and space complexity.';
  }
  return null;
}

function Interview({ session, close, showReport, toast }) {
  const [queue, setQueue] = useState(() => { const base = session.questions.map((item) => ({ prompt: item[0], stage: item[1], kind: 'PRIMARY', adaptive: false })); base.push({ prompt: 'Before we wrap up, what questions do you have for me about the role, team or engineering work?', stage: 'CANDIDATE_QA', kind: 'CLOSING', adaptive: false }); return base; });
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [state, setState] = useState('ready');
  const [time, setTime] = useState(session.durationMinutes * 60);
  const [tab, setTab] = useState('chat');
  const [chat, setChat] = useState([
    { from: 'Maya', text: 'Hi Alex. Thanks for joining. I will keep this close to a real interview: warm-up first, then deeper questions and follow-ups based on what you actually say.' },
    { from: 'You', text: 'Ready when you are.', self: true }
  ]);
  const [code, setCode] = useState('// Write your solution here\n\n');
  const [notes, setNotes] = useState('');
  const [problemOpen, setProblemOpen] = useState(false);
  const [turnHistory, setTurnHistory] = useState([]);
  const [interruption, setInterruption] = useState('');
  const [metrics, setMetrics] = useState({ followUps: 0, interruptions: 0, clarifications: 0, pasteEvents: 0, pastedChars: 0 });
  const [pasteMeta, setPasteMeta] = useState({ events: 0, chars: 0 });
  const [ending, setEnding] = useState(false);
  const [quitPrompt, setQuitPrompt] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const recognizer = useRef(null);
  const finishingRef = useRef(false);
  const lastCodePromptRef = useRef(0);

  const question = queue[index];
  const doc = session.type === 'System Design' ? designDocs[session.level] : session.type === 'DSA' ? dsaDocs[session.level] : session.type === 'Database' ? databaseDocs[session.level] : null;
  const stage = question?.stage || 'TECHNICAL';
  const prompt = question?.prompt || 'Take your time and talk me through your reasoning.';
  const isAdaptiveTurn = Boolean(question?.adaptive);
  const problemStageIndex = queue.findIndex(item => ['SD_PROBLEM','DSA_CLARIFY','DB_CLARIFY'].includes(item.stage));
  const showDoc = Boolean(doc && problemStageIndex >= 0 && index >= problemStageIndex);
  const diagramStage = queue.some(item => item.stage === 'DB_ER') && index >= queue.findIndex(item => item.stage === 'DB_ER');

  useEffect(() => {
    const timer = setInterval(() => setTime(value => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (time === 0 && !finishingRef.current) submit(true);
  }, [time]);
  useEffect(() => { say(prompt); }, [prompt]);
  useEffect(() => {
    if (stage === 'DSA_CODE') {
      setTab('code');
      if (index === queue.findIndex(item => item.stage === 'DSA_CODE')) addChat('Before you implement, tell me the approach, invariant, and complexity. When you are ready, move to the code editor.');
    }
  }, [stage, index]);
  useEffect(() => {
    if (stage !== 'DSA_CODE' || code.length < 120 || code.length - lastCodePromptRef.current < 120) return;
    lastCodePromptRef.current = code.length;
    const prompt = code.includes('for') && code.includes('while')
      ? 'I can see nested iteration in the editor. What is the current time complexity, and is that intentional?'
      : 'Pause for a code review: what invariant should remain true after this block, and which edge case should we test next?';
    setInterruption(prompt);
    addChat(prompt);
    setMetrics(value => ({ ...value, interruptions: value.interruptions + 1 }));
  }, [code, stage]);
  useEffect(() => {
    if (showDoc && index === problemStageIndex) {
      setTab('problem');
      addChat(`I’ve dropped the problem document here. Please read it before proposing a solution: ${doc.title}`);
    }
  }, [showDoc, index, problemStageIndex]);
  useEffect(() => () => recognizer.current?.stop(), []);
  useEffect(() => {
    const onFullScreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setFullScreen(active);
      if (!active && !finishingRef.current) toast('You left full screen. Return to the interview window; tab switching is recorded.');
    };
    const onVisibility = () => { if (document.hidden && !finishingRef.current) toast('Interview paused: switching tabs or windows is recorded.'); };
    document.addEventListener('fullscreenchange', onFullScreenChange);
    document.addEventListener('visibilitychange', onVisibility);
    document.documentElement.requestFullscreen?.().catch(() => null);
    return () => { document.removeEventListener('fullscreenchange', onFullScreenChange); document.removeEventListener('visibilitychange', onVisibility); if (document.fullscreenElement) document.exitFullscreen?.().catch(() => null); };
  }, [toast]);

  async function toggleFullScreen() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen?.().catch(() => null);
  }

  const phaseLabel = useMemo(() => ({
    INTRO: 'Warm-up', RESUME: 'Resume deep dive', BEHAVIORAL: 'Behavioral',
    FOLLOW_UP: 'Follow-up', CHALLENGE: 'Challenge', TRADE_OFF: 'Trade-off probe',
    SD_PROBLEM: 'Problem framing', SD_FR: 'Functional requirements', SD_NFR: 'Non-functional requirements', SD_CAPACITY: 'Capacity estimation', SD_SECURITY: 'Security', SD_OBSERVABILITY: 'Observability', DB_CLARIFY: 'Database requirements', DB_SCHEMA: 'Schema design', DB_ER: 'ER diagram', DB_INDEX: 'Index strategy', DB_TXN: 'Transactions', DB_SCALE: 'Database scaling', CANDIDATE_QA: 'Candidate questions',
    SD_ARCH: 'Architecture', SD_DATA: 'Deep dive', SD_TRADEOFF: 'Trade-offs',
    DSA_CLARIFY: 'Clarification', DSA_BRUTE: 'Brute force', DSA_OPTIMIZE: 'Optimization',
    DSA_CODE: 'Coding', DSA_DRYRUN: 'Dry run', BACKEND_SCALE: 'Backend deep dive',
    TECHNICAL: 'Technical'
  }[stage] || 'Technical'), [stage]);

  function addChat(text, self = false) {
    setChat(items => [...items, { from: self ? 'You' : 'Maya', text, self }]);
  }

  function record() {
    if (state === 'listening') {
      recognizer.current?.stop();
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      toast('Speech recognition is unavailable in this browser. You can type your answer instead.');
      return;
    }
    const instance = new Recognition();
    instance.continuous = true;
    instance.interimResults = true;
    instance.onresult = event => {
      const text = Array.from(event.results).map(result => result[0].transcript).join(' ');
      setAnswer(text);
      const signals = answerSignals(text);
      if (!interruption && signals.words >= 55) {
        const interrupt = maybeInterruption(stage, signals, session.level);
        if (interrupt) {
          setInterruption(interrupt);
          setMetrics(value => ({ ...value, interruptions: value.interruptions + 1 }));
        }
      }
    };
    instance.onend = () => setState('captured');
    instance.onerror = () => {
      setState('ready');
      toast('Microphone access was unavailable. Check browser permission.');
    };
    recognizer.current = instance;
    instance.start();
    setState('listening');
  }

  async function submit(skip = false) {
    if (finishingRef.current) return;
    const transcript = skip ? 'Candidate ended the interview at this point.' : answer.trim();
    if (stage === 'CANDIDATE_QA') {
      finishingRef.current = true;
      setEnding(true);
      addChat('Thanks for the question. That is everything I wanted to cover today. I appreciate your time. We can stop here.');
      if (!session.local && session.id) await api.saveInterviewAnswer(session.id, { questionId: null, questionPrompt: prompt, transcript: transcript || 'Candidate had no questions.', durationSeconds: Math.max(1, session.durationMinutes * 60 - time), answerKind: 'CLOSING', pasteDetected: pasteMeta.events > 0, pasteEventCount: pasteMeta.events, pastedCharacters: pasteMeta.chars }).catch(() => null);
      const qaTurn = { prompt, stage, transcript: transcript || 'Candidate had no questions.', signals: answerSignals(transcript || ''), kind: 'CLOSING' };
      setTurnHistory(history => [...history, qaTurn]);
      setTimeout(async () => {
        const finalHistory = [...turnHistory, qaTurn];
        const result = session.local ? buildLocalReport(finalHistory, { ...metrics, pasteEvents: pasteMeta.events, pastedChars: pasteMeta.chars }) : await api.finishInterview(session.id).catch(() => buildLocalReport(finalHistory, { ...metrics, pasteEvents: pasteMeta.events, pastedChars: pasteMeta.chars }));
        showReport({ ...result, interactionMetrics: { ...metrics, pasteEvents: pasteMeta.events, pastedChars: pasteMeta.chars } });
      }, 1400);
      return;
    }
    if (!transcript) {
      toast('Give a spoken or typed answer before continuing.');
      return;
    }

    if (!skip) {
      const relevanceError = answerRelevance(stage, transcript, code);
      if (relevanceError) {
        addChat(relevanceError);
        setInterruption(relevanceError);
        setState('ready');
        return;
      }
    }

    const signals = answerSignals(transcript);
    const turn = { prompt, stage, transcript, signals, kind: question?.kind || 'PRIMARY' };
    setState('processing');
    addChat(transcript, true);
    if (interruption) addChat(interruption);
    setTurnHistory(history => [...history, turn]);

    if (!session.local && session.id) {
      await api.saveInterviewAnswer(session.id, {
        questionId: null,
        questionPrompt: prompt,
        transcript,
        durationSeconds: Math.max(1, session.durationMinutes * 60 - time),
        answerKind: question?.kind || stage,
        pasteDetected: pasteMeta.events > 0,
        pasteEventCount: pasteMeta.events,
        pastedCharacters: pasteMeta.chars,
        code: stage === 'DSA_CODE' ? code : null,
        codeLanguage: stage === 'DSA_CODE' ? 'cpp' : null
      }).catch(() => null);
    }

    let adaptive = null;
    if (!skip) {
      try {
        if (!session.local && session.id) {
          const remote = await api.nextInterviewTurn(session.id, {
            interviewType: session.type, stage, transcript, experienceLevel: session.level,
            askedPrompts: [...queue].map(item => item.prompt),
            recentStages: turnHistory.slice(-5).map(item => item.stage)
          });
          adaptive = remote?.prompt ? remote : null;
          if (remote?.interruption) {
            setInterruption(remote.interruption);
            setMetrics(value => ({ ...value, interruptions: value.interruptions + 1 }));
          }
        }
      } catch {
        const fallback = selectAdaptiveTurn(stage, signals, [...turnHistory, turn], session.level);
        adaptive = fallback ? { ...fallback, reason: 'Local adaptive fallback' } : null;
      }
    }
    const shouldInject = Boolean(adaptive && !question?.adaptive && !queue.some(item => item.prompt === adaptive.prompt) && (
      question?.kind === 'PRIMARY' || signals.fillers >= 3 || !signals.hasTradeoff || !signals.hasEdgeCase
    ));

    if (!adaptive?.interruption) setInterruption('');
    setAnswer('');
    setPasteMeta({ events: 0, chars: 0 });

    if (shouldInject) {
      const next = { prompt: adaptive.prompt, stage: adaptive.stage || stage, kind: adaptive.kind || 'FOLLOW_UP', adaptive: true, reason: adaptive.reason || 'Adaptive probe' };
      const nextQueue = [...queue.slice(0, index + 1), next, ...queue.slice(index + 1)];
      setQueue(nextQueue);
      setMetrics(value => ({
        ...value,
        followUps: value.followUps + 1,
        clarifications: value.clarifications + (stage === 'DSA_CLARIFY' ? 1 : 0)
      }));
      addChat(adaptive.reason ? `Thanks. I want to stay on that point. ${adaptive.reason}` : 'Thanks. I want to stay on that point for one follow-up.');
      setTimeout(() => {
        setIndex(index + 1);
        setState('ready');
        addChat(next.prompt);
      }, 300);
      return;
    }

    const next = index + 1;
    if (next < queue.length) {
      const transition = stage === 'RESUME'
        ? 'Thanks. Let’s move from your experience into the technical part.'
        : stage === 'SD_ARCH'
          ? 'Good. I want to pressure-test that architecture next.'
          : stage === 'DSA_OPTIMIZE'
            ? 'Good. Now let’s turn that reasoning into code.'
            : question?.kind !== 'PRIMARY'
              ? 'That answers the follow-up. Let’s keep moving.'
              : 'Thanks. Let’s build on that answer.';
      addChat(transition);
      setTimeout(() => {
        setIndex(next);
        setState('ready');
        addChat(queue[next].prompt);
      }, 300);
      return;
    }

    const history = [...turnHistory, turn];
    finishingRef.current = true;
    setEnding(true);
    addChat('I think I have enough signal to wrap up. Thank you for your time.');
    const result = session.local
      ? buildLocalReport(history, metrics)
      : await api.finishInterview(session.id).catch(() => buildLocalReport(history, metrics));
    showReport({ ...result, interactionMetrics: metrics });
  }

  function replay() {
    say(prompt);
    addChat(`I will repeat that: “${prompt}”`);
  }

  const minutes = String(Math.floor(time / 60)).padStart(2, '0');
  const seconds = String(time % 60).padStart(2, '0');

  return (
    <div className="interviewRoom">
      <header className="roomTop">
        <div className="roomBrand">
          <button className="brand light" onClick={() => setQuitPrompt(true)}><span>O</span>orbite</button>
          <div className="roomName"><b>Orbite Interview Room</b><small>{session.level} · {session.role} · {session.type}</small></div>
        </div>
        <div className="roomTimer"><i /> LIVE <b>{minutes}:{seconds}</b></div>
        <div className="roomActions"><button className="fullScreenButton" onClick={toggleFullScreen}>{fullScreen ? 'Minimize' : 'Full screen'}</button><button className="leaveRoom" onClick={() => setQuitPrompt(true)}>Leave</button></div>
      </header>

      <div className="videoStrip">
        <div className="videoTile aiTile"><div className="videoAvatar">M</div><div className="videoMeta"><b>Maya</b><small>AI interviewer · {isAdaptiveTurn ? 'adapting to your answer' : 'ready'}</small></div><span className="tileBadge">AI</span></div>
        <div className="videoTile candidateTile"><div className="videoAvatar candidate">AS</div><div className="videoMeta"><b>You</b><small>Camera off · microphone {state === 'listening' ? 'on' : 'ready'}</small></div><span className="tileBadge mutedBadge">CAM OFF</span></div>
      </div>

      <div className="roomBody">
        <aside className="chatPanel">
          <div className="panelHeader"><div><b>Interview chat</b><small>Private session notes & documents</small></div><span>{chat.length}</span></div>
          <div className="chatScroll">
            {chat.map((item, i) => <div className={`chatMessage ${item.self ? 'self' : ''}`} key={`${item.from}-${i}`}><div className="chatAvatar">{item.self ? 'AS' : 'M'}</div><div><small>{item.from}</small><p>{item.text}</p></div></div>)}
            {showDoc && <button className="docCard" onClick={() => { setProblemOpen(true); setTab('problem'); }}><div className="docIcon">DOC</div><div><b>{doc.title}</b><small>Problem statement · Open document</small></div><span>↗</span></button>}
          </div>
          <div className="chatComposer"><input placeholder="Message interviewer…" onKeyDown={event => { if (event.key === 'Enter' && event.currentTarget.value.trim()) { addChat(event.currentTarget.value.trim(), true); event.currentTarget.value = ''; } }} /><button onClick={() => setProblemOpen(true)} disabled={!showDoc}>＋</button></div>
        </aside>

        <section className="interviewerColumn">
          <div className="interviewerCard">
            <div className="interviewerHeader"><div><span className="eyebrow">MAYA · AI INTERVIEWER</span><div className="stagePill">{phaseLabel}{isAdaptiveTurn ? ' · adaptive' : ''}</div></div><span className="questionNo">TURN {String(index + 1).padStart(2, '0')}</span></div>
            <h1>{prompt}</h1>
            <p className="interviewerHint">I am evaluating your reasoning, not just the final answer. I may interrupt, challenge an assumption, or change a constraint based on what you say.</p>
            {interruption && <div className="interruptionBanner"><b>Interruption</b><span>{interruption}</span><button onClick={() => setInterruption('')}>Continue</button></div>}
            <div className="voiceState"><span className={state === 'listening' ? 'pulse' : ''}>{state === 'listening' ? '●' : '◉'}</span><div><b>{state === 'listening' ? 'Listening' : state === 'processing' ? 'Evaluating answer' : isAdaptiveTurn ? 'Follow-up' : 'Your turn'}</b><small>{state === 'listening' ? 'Speak naturally. I am listening.' : 'You can type instead if you prefer.'}</small></div></div>
            <div className="answerArea"><textarea value={answer} onChange={event => setAnswer(event.target.value)} onPaste={event => { const text = event.clipboardData?.getData('text') || ''; if (text.length) { const next = { events: pasteMeta.events + 1, chars: pasteMeta.chars + text.length }; setPasteMeta(next); setMetrics(value => ({ ...value, pasteEvents: value.pasteEvents + 1, pastedChars: value.pastedChars + text.length })); toast('Paste detected in the answer box. This is recorded as an integrity signal, not proof of copying.'); } }} placeholder="Speak using the microphone, or type your answer here…" /><div className="answerControls"><button className={`micControl ${state === 'listening' ? 'active' : ''}`} onClick={record}>{state === 'listening' ? '■ Stop' : '● Speak'}</button><button className="primary submitAnswer" disabled={state === 'processing'} onClick={() => submit()}>{stage === 'CANDIDATE_QA' ? 'Finish interview' : 'Submit answer'} <b>→</b></button></div></div>
            <div className="interviewerFooter"><button onClick={replay}>↻ Repeat question</button><span>Follow-ups generated: {metrics.followUps} · interruptions: {metrics.interruptions}</span></div>
          </div>
        </section>

        <aside className="workspacePanel">
          <div className="workspaceTabs">{(showDoc ? (session.type === 'Database' ? ['problem', 'schema', 'er', 'whiteboard'] : ['problem', 'code', 'whiteboard']) : ['chat', 'code', 'whiteboard']).map(value => <button key={value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{value === 'problem' ? 'Problem' : value === 'chat' ? 'Chat' : value === 'code' ? 'Code' : value === 'schema' ? 'Schema' : value === 'er' ? 'ER diagram' : 'Whiteboard'}</button>)}</div>
          {tab === 'problem' && doc && <ProblemDoc doc={doc} />}
          {tab === 'chat' && <ChatMirror chat={chat} />}
          {tab === 'code' && <CodeWorkspace code={code} setCode={setCode} notes={notes} setNotes={setNotes} language={session.type === 'Database' ? 'solution.sql' : 'solution.cpp'} />}
          {tab === 'whiteboard' && <Whiteboard notes={notes} setNotes={setNotes} />}{tab === 'schema' && <SchemaWorkspace notes={notes} setNotes={setNotes} />}{tab === 'er' && <ErDiagramWorkspace notes={notes} setNotes={setNotes} />}
        </aside>
      </div>

      {ending && <div className="endingOverlay"><div><span className="eyebrow">INTERVIEW COMPLETE</span><h2>Thanks for your time.</h2><p>Maya is wrapping the session and preparing your feedback.</p></div></div>}

      <footer className="roomControls">
        <button title="Mute microphone" onClick={record}>{state === 'listening' ? '🎙 Mic on' : '🎙 Mic off'}</button>
        <button title="Camera is disabled">▣ Camera off</button>
        <button onClick={() => setTab(showDoc ? 'problem' : 'chat')}>▤ {doc ? 'Problem' : 'Chat'}</button>
        <button onClick={() => setTab('code')}>⌘ Code</button>
        <button onClick={() => setTab('whiteboard')}>✎ Whiteboard</button>{session.type === 'Database' && <button onClick={() => setTab('er')}>⌗ ER diagram</button>}
        {stage === 'CANDIDATE_QA' ? <button className="danger" onClick={() => submit(true)}>Finish interview</button> : <button className="danger" onClick={() => setQuitPrompt(true)}>Leave room</button>}
      </footer>

      {problemOpen && showDoc && <div className="docOverlay"><div className="docModal"><button className="docClose" onClick={() => setProblemOpen(false)}>×</button><div className="docTop"><span>PROBLEM DOCUMENT</span><b>{session.level} · {session.type}</b></div><h2>{doc.title}</h2><p>{doc.body}</p><h4>What you should clarify</h4><ul>{doc.bullets.map(item => <li key={item}>{item}</li>)}</ul><div className="docHint">{session.type === 'Database' ? 'You will be asked to design the schema, explain the ER diagram, choose indexes, and reason about transactions and scale.' : session.type === 'DSA' ? 'You will be asked to clarify the problem, derive the solution, implement it, and then dry-run the actual code on the sample and an edge case.' : 'Maya will challenge your assumptions after the first answer. Start with what you understood, not the final solution.'}</div><button className="primary" onClick={() => { setProblemOpen(false); setTab('problem'); }}>Back to interview <b>→</b></button></div></div>}
      {quitPrompt && <div className="modalWrap"><section className="modal quitModal"><p className="eyebrow">LEAVE INTERVIEW</p><h1>Quit this interview?</h1><p>Your current answers may be incomplete and the session will not continue. Are you sure you want to leave?</p><div className="quitActions"><button className="textButton" onClick={() => setQuitPrompt(false)}>Continue interview</button><button className="danger" onClick={close}>Quit interview</button></div></section></div>}
    </div>
  );
}

function buildLocalReport(history, metrics) {
  const all = history.map(item => item.signals || answerSignals(item.transcript || ''));
  const answers = Math.max(1, all.length);
  const avg = key => Math.round(all.reduce((sum, item) => sum + (item[key] ? 1 : 0), 0) / answers * 100);
  const communication = Math.max(55, Math.min(96, 62 + avg('hasDirect') * 0.12 + avg('structured') * 0.1 + avg('hasExample') * 0.08 - Math.min(18, all.reduce((sum, item) => sum + item.fillers * 2, 0))));
  const technicalKnowledge = Math.min(96, 64 + answers * 2 + avg('hasExample') * 0.08 + avg('hasEdgeCase') * 0.08);
  const problemSolving = Math.min(96, 62 + answers * 2 + avg('hasTradeoff') * 0.12 + avg('hasEdgeCase') * 0.1);
  const followUpHandling = Math.min(96, 58 + metrics.followUps * 8 + Math.min(18, metrics.interruptions * 4));
  const systemDesign = Math.min(96, 60 + (history.some(item => /SD_|BACKEND|TRADE_OFF/.test(item.stage)) ? avg('hasTradeoff') * 0.2 : 8));
  const overallScore = Math.round((technicalKnowledge + problemSolving + communication + systemDesign + followUpHandling) / 5);
  const strengths = [avg('hasDirect') > 50 ? 'You usually established a clear direction instead of wandering into implementation.' : 'You kept engaging with the interviewer rather than abandoning difficult prompts.', metrics.followUps > 0 ? `You handled ${metrics.followUps} adaptive follow-up${metrics.followUps === 1 ? '' : 's'} instead of only answering the original prompts.` : 'You completed the primary interview flow.'];
  const improvements = [avg('hasTradeoff') < 50 ? 'Make the trade-off explicit instead of leaving the interviewer to infer it.' : 'Keep making trade-offs explicit, especially when the interviewer changes a constraint.', avg('hasEdgeCase') < 50 ? 'Name an edge case or failure mode before the interviewer has to ask for it.' : 'Bring edge cases into your first answer when the problem is ambiguous.', all.reduce((sum, item) => sum + item.fillers, 0) > 4 ? 'Replace filler words with a short pause when you need thinking time.' : 'Keep answers front-loaded: direct answer, reasoning, example, trade-off.'];
  const recommendedPractice = [followUpHandling < 75 ? 'Practice handling two consecutive follow-up questions' : 'Practice defending a decision under changing constraints', communication < 75 ? 'Explain one concept in 90 seconds without filler words' : 'Practice concise senior-level explanations'];
  const pasteSignal = (metrics.pasteEvents || 0) > 0 ? { detected: true, events: metrics.pasteEvents || 0, characters: metrics.pastedChars || 0, message: 'Paste activity was detected in the answer box. This is an integrity signal only and should be reviewed with the full context.' } : { detected: false, events: 0, characters: 0, message: 'No paste event was detected in the answer box during this session.' };
  const roadmap = [
    ...(communication < 75 ? [{ area: 'Communication', action: 'Practice answering technical questions in a 5-step structure', frequency: '3x/week' }] : []),
    ...(problemSolving < 75 ? [{ area: 'Problem solving', action: 'Do one problem with explicit brute force → optimization → proof → dry run', frequency: '4x/week' }] : []),
    ...(systemDesign < 75 ? [{ area: 'System design', action: 'Practice capacity estimation, failure modes, observability and trade-offs', frequency: '3x/week' }] : []),
    ...(metrics.pasteEvents > 0 ? [{ area: 'Interview integrity', action: 'Practice answering without external text and use thinking pauses instead of copy/paste', frequency: 'Every mock' }] : [])
  ];
  const communicationCoach = communication < 75 ? 'Lead with the answer. Then explain why, give one example, and finish with the trade-off.' : 'Your communication is strongest when you state the answer first. Keep the same structure when the interviewer interrupts.';
  const evidence = [
    avg('hasDirect') > 50 ? { stage: 'overall', signal: 'Directness', evidence: 'Your answers usually established a direction before expanding.', coaching: 'Keep the first sentence decisive.' } : { stage: 'overall', signal: 'Directness', evidence: 'Several answers needed more structure before the main point became clear.', coaching: 'Lead with the answer, then explain.' },
    avg('hasTradeoff') > 35 ? { stage: 'technical', signal: 'Trade-off reasoning', evidence: 'You explicitly compared alternatives or costs in multiple answers.', coaching: 'Keep naming what you gain and give up.' } : { stage: 'technical', signal: 'Trade-off reasoning', evidence: 'Trade-offs were rarely stated explicitly.', coaching: 'Add one explicit trade-off to important decisions.' },
    avg('hasEdgeCase') > 35 ? { stage: 'technical', signal: 'Robustness', evidence: 'You mentioned edge cases or failure modes.', coaching: 'Continue pressure-testing the boundary cases.' } : { stage: 'technical', signal: 'Robustness', evidence: 'Edge cases usually appeared only after prompting.', coaching: 'Volunteer one failure mode before being asked.' }
  ];
  return { overallScore, technicalKnowledge, problemSolving, communication: Math.round(communication), systemDesign, followUpHandling, strengths, improvements, recommendedPractice, communicationCoach, comparison: { previousScore: null, scoreDelta: null, previous: null, message: 'Comparison becomes available after you complete another interview.' }, pasteSignal, personalizedRoadmap: roadmap, evidence, calibration: { interviewerStyle: 'Professional · adaptive', adaptationSummary: `${metrics.followUps} adaptive follow-up(s) and ${metrics.interruptions} interruption(s) were used.`, hintsUsed: 0, interruptions: metrics.interruptions, adaptiveFollowUps: metrics.followUps } };
}

function SchemaWorkspace({ notes, setNotes }) { return <div className="workspaceContent schemaView"><div className="codeToolbar"><span>schema.sql</span><span>Design on paper first</span></div><textarea className="schemaEditor" value={notes} onChange={event => setNotes(event.target.value)} placeholder={'CREATE TABLE users (\n  id BIGINT PRIMARY KEY,\n  ...\n);\n\nExplain keys, foreign keys, constraints and indexes as you design.'} /></div> }
function ErDiagramWorkspace({ notes, setNotes }) {
  const [entities, setEntities] = useState([
    { name: 'CUSTOMER', fields: ['id PK', 'name', 'email'], left: 30, top: 35 },
    { name: 'ORDER', fields: ['id PK', 'customer_id FK', 'status'], left: 320, top: 150 },
    { name: 'PRODUCT', fields: ['id PK', 'name', 'price'], left: 610, top: 35 }
  ]);
  return <div className="workspaceContent erView"><div className="boardToolbar"><span>ER DIAGRAM</span><button onClick={() => setEntities(value => [...value, { name: `TABLE_${value.length + 1}`, fields: ['id PK'], left: 120 + (value.length % 3) * 250, top: 280 + Math.floor(value.length / 3) * 170 }])}>+ Entity</button></div><div className="erCanvas">{entities.length >= 3 && <svg className="erLines" viewBox="0 0 900 560" preserveAspectRatio="none"><line x1="190" y1="115" x2="320" y2="210" /><line x1="510" y1="210" x2="610" y2="115" /><text x="215" y="155">1:N</text><text x="535" y="155">N:N</text></svg>}{entities.map((entity, i) => <div className="erEntity" key={`${entity.name}-${i}`} style={{ left: `${entity.left}px`, top: `${entity.top}px` }}><b>{entity.name}</b>{entity.fields.map(field => <span key={field}>{field}</span>)}</div>)}<div className="erHint">Use the diagram to explain cardinality, ownership and foreign-key direction. Then record your relationship notes below.</div></div><textarea className="erNotes" value={notes} onChange={event => setNotes(event.target.value)} placeholder="Relationship notes, cardinality and ownership…" /></div> }

function ProblemDoc({ doc }) { return <div className="workspaceContent documentView"><div className="documentToolbar"><span>problem.md</span><span>Read-only</span></div><article><span className="docKicker">INTERVIEW PROBLEM</span><h2>{doc.title}</h2><p>{doc.body}</p><h4>Scope for this round</h4><ul>{doc.bullets.map(item => <li key={item}>{item}</li>)}</ul><div className="documentCallout"><b>Interviewer instruction</b><p>First explain what you understood. Then state functional requirements, non-functional requirements and assumptions before proposing an architecture.</p></div></article></div> }
function ChatMirror({ chat }) { return <div className="workspaceContent chatMirror">{chat.map((item, i) => <div className={`mirrorLine ${item.self ? 'self' : ''}`} key={i}><b>{item.from}</b><p>{item.text}</p></div>)}</div> }
function CodeWorkspace({ code, setCode, notes, setNotes, language = 'solution.cpp' }) {
  const [runStatus, setRunStatus] = useState('');
  async function run() { setRunStatus('Compiling and running…'); const result = await api.runPracticeCode({ language: language.endsWith('.sql') ? 'sql' : 'cpp', source: code, stdin: '' }).catch(error => ({ error: error.message })); setRunStatus(result.error || result.output || (result.compiled ? 'Compilation passed.' : 'Compilation failed.')); }
  return <div className="workspaceContent codeView"><div className="codeToolbar"><span>{language}</span><button onClick={run}>Compile & run ▷</button></div><textarea className="codeEditor" value={code} onChange={event => setCode(event.target.value)} spellCheck="false" /><p className="runStatus">{runStatus || 'Use the local C++17 compiler to check the implementation.'}</p><div className="explainPanel"><div><b>Explanation / dry run</b><small>Keep your reasoning here while you code.</small></div><textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Example: i points to the left edge, j expands the window…" /></div></div>
}
function Whiteboard({ notes, setNotes }) { return <div className="workspaceContent whiteboardView"><div className="boardToolbar"><span>WHITEBOARD</span><button onClick={() => setNotes('')}>Clear</button></div><div className="board"><div className="boardHint">Use this space for boxes, arrows, data flow and trade-offs.</div><textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="[Client] → [API] → [Service] → [DB]\n\nWrite your architecture notes here…" /></div></div> }

function Report({ data, again, home }) {
  const scores = [['Technical knowledge', data.technicalKnowledge], ['Problem solving', data.problemSolving], ['Communication', data.communication], ['System design', data.systemDesign], ['Follow-up handling', data.followUpHandling]];
  const metrics = data.interactionMetrics;
  const comparison = data.comparison;
  const paste = data.pasteSignal;
  const roadmap = data.personalizedRoadmap || [];
  const evidence = data.evidence || [];
  const calibration = data.calibration;
  return <div className="page report"><p className="eyebrow">INTERVIEW REPORT</p><section className="reportHero"><div><h1>Interview complete.<br /><em>Now turn it into progress.</em></h1><p>This report compares today's performance with your previous interviews and turns the gaps into a concrete practice plan.</p></div><div className="score"><b>{data.overallScore}</b><span>/100</span><small>INTERVIEW SCORE</small></div></section>{comparison && <section className="comparisonCard panel"><p className="eyebrow">YOUR TRAJECTORY</p><div className="comparisonMain"><div><small>Previous score</small><b>{comparison.previousScore ?? '—'}</b></div><div><small>Change</small><b className={comparison.scoreDelta > 0 ? 'positive' : comparison.scoreDelta < 0 ? 'negative' : ''}>{comparison.scoreDelta == null ? 'First completed mock' : `${comparison.scoreDelta > 0 ? '+' : ''}${comparison.scoreDelta}`}</b></div><div><small>Signal</small><b>{comparison.message}</b></div></div>{comparison.previous && <div className="deltaGrid">{Object.entries(comparison.previous).map(([label, delta]) => <span key={label}><small>{label}</small><b className={delta >= 0 ? 'positive' : 'negative'}>{delta >= 0 ? '+' : ''}{delta}</b></span>)}</div>}{comparison.previousAdvice?.length ? <div className="previousAdvice"><small>WHAT YOU WERE ASKED TO IMPROVE LAST TIME</small>{comparison.previousAdvice.map(item => <p key={item}>{item}</p>)}</div> : null}</section>}<section className="metrics">{metrics && [['Adaptive follow-ups', metrics.followUps], ['Interruptions', metrics.interruptions], ['Clarification checks', metrics.clarifications], ['Paste events', metrics.pasteEvents || 0]].map(([label, value]) => <article key={label}><small>{label}</small><b>{value}</b></article>)}</section><section className="grid"><article className="panel"><p className="eyebrow">SCORE BREAKDOWN</p>{scores.map(([label, value]) => <div className="scoreRow" key={label}><span>{label}</span><div><i style={{ width: `${value}%` }} /></div><b>{value}</b></div>)}</article><article className="panel coach"><p className="eyebrow">NEXT-INTERVIEW COACH</p><h2>{data.communicationCoach}</h2><ol><li>Direct answer</li><li>Reasoning</li><li>Example / evidence</li><li>Trade-off or risk</li><li>Conclusion</li></ol></article></section>{calibration && <section className="panel calibrationCard"><p className="eyebrow">INTERVIEWER CALIBRATION</p><div className="calibrationGrid"><div><small>Style</small><b>{calibration.interviewerStyle}</b></div><div><small>Adaptive follow-ups</small><b>{calibration.adaptiveFollowUps}</b></div><div><small>Interruptions</small><b>{calibration.interruptions}</b></div><div><small>Hints</small><b>{calibration.hintsUsed}</b></div></div><p>{calibration.adaptationSummary}</p></section>}{evidence.length > 0 && <section className="panel evidencePanel"><p className="eyebrow">EVIDENCE FROM YOUR ANSWERS</p>{evidence.map((item, i) => <article className="evidenceRow" key={`${item.signal}-${i}`}><div><span>{item.stage}</span><b>{item.signal}</b></div><p>{item.evidence}</p><small>{item.coaching}</small></article>)}</section>}<section className="feedback">{[['What you did well', data.strengths], ['What held you back', data.improvements], ['Next repetitions', data.recommendedPractice]].map(([title, list]) => <article className="panel" key={title}><p className="eyebrow">{title}</p>{list.map(item => <p className="feedbackItem" key={item}>{item}</p>)}</article>)}</section>{paste && <section className={`panel integrityCard ${paste.detected ? 'flagged' : ''}`}><p className="eyebrow">INTERVIEW INTEGRITY SIGNAL</p><h2>{paste.detected ? 'Paste activity detected' : 'No paste activity detected'}</h2><p>{paste.message}</p>{paste.detected && <small>{paste.events} paste event(s), approximately {paste.characters} pasted characters.</small>}</section>}<section className="panel roadmapPanel"><p className="eyebrow">YOUR PERSONAL ROADMAP</p>{roadmap.length ? roadmap.map((item, i) => <div className="roadmapRow" key={`${item.area}-${i}`}><span>{i + 1}</span><div><b>{item.area}</b><p>{item.action}</p></div><small>{item.frequency}</small></div>) : <p className="feedbackItem">You are performing consistently across the main signals. Keep alternating full mocks with targeted practice.</p>}</section><div className="actions"><button className="textButton" onClick={home}>Back to dashboard</button><button className="primary" onClick={again}>Practice again <b>→</b></button></div></div> }

function Roadmap({ start, latestReport }) { const items = latestReport?.personalizedRoadmap?.length ? latestReport.personalizedRoadmap : [
  { area: 'Core fundamentals', action: 'Rotate through OS, networking, DBMS and OOP with short explanation drills.', frequency: '3x/week' },
  { area: 'DSA interview flow', action: 'Practice brute force → optimize → proof → dry run → complexity.', frequency: '4x/week' },
  { area: 'System design', action: 'Practice requirements, capacity estimates, architecture, failure modes and observability.', frequency: '3x/week' },
  { area: 'Communication', action: 'Keep answers direct, structured and supported by a concrete example.', frequency: 'Every mock' }
]; return <div className="page roadmap"><p className="eyebrow">PERSONALIZED ROADMAP</p><h1>Build your interview<br /><em>muscle memory.</em></h1><p className="intro">Your plan is based on the signals from your latest interview. Repeat the exact behaviors that need work instead of following a generic study list.</p><section className="weeks">{items.map((item, i) => <article key={`${item.area}-${i}`}><span>0{i + 1}</span><b>{item.area}</b><p>{item.action}</p><small>{item.frequency}</small></article>)}</section><button className="primary" onClick={start}>Start another interview <b>→</b></button></div> }

function LiveRoom({ close, type }) { const [consent, setConsent] = useState(false); const [role, setRole] = useState('Candidate'); const [status, setStatus] = useState(''); async function match() { setStatus('Finding a compatible partner…'); try { const room = await api.createRoom({ topic: type, consent: true }); setStatus(`Room ${room.joinCode} is ready. You will join as ${role.toLowerCase()}.`); } catch { setStatus('Your local practice room request is ready.'); } } return <div className="modalWrap"><section className="modal"><button className="close" onClick={close}>×</button><p className="eyebrow">LIVE 1:1 PRACTICE</p><h1>Practice with care.</h1><p>Both people confirm the session rules before entering. No calls are recorded.</p><div className="roles">{['Candidate', 'Interviewer', 'Alternate roles'].map(value => <button key={value} className={role === value ? 'chosen' : ''} onClick={() => setRole(value)}>{value === 'Candidate' ? 'I want to be interviewed' : value === 'Interviewer' ? 'I want to interview someone' : value}</button>)}</div><div className="safe"><p>Mutual consent before entry</p><p>No recording or personal questions</p><p>Leave or report at any time</p></div><label className="consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /> I agree to the community guidelines.</label><button className="primary match" disabled={!consent} onClick={match}>Find a practice partner <b>→</b></button>{status && <p className="matchStatus">{status}</p>}</section></div> }
