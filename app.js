const overlay = document.getElementById('interviewOverlay');
const start = document.getElementById('startInterview');
const exit = document.getElementById('exitInterview');
const mic = document.getElementById('micButton');
const answer = document.getElementById('answerButton');
const label = document.getElementById('listenLabel');
const question = document.getElementById('interviewerText');
const count = document.getElementById('questionCount');
const timer = document.getElementById('timer');
const roomModal = document.getElementById('roomModal');
let activeTopic = 'Computer Fundamentals'; let minutes = 25 * 60; let interval; let questionIndex = 0;
const questions = {
  'Computer Fundamentals': [
    'In your own words, what happens from the moment you type a URL into a browser until a web page appears?',
    'What is the difference between a process and a thread? When might you prefer each?',
    'How does virtual memory help an operating system manage applications?',
    'Imagine an application feels slow. What layers would you investigate first?',
    'What is a database index, and what trade-off does it introduce?'
  ],
  'System Design': [
    'Let’s design a URL shortener. What would you clarify before proposing an architecture?',
    'How would you make a high-traffic feed reliable when one service becomes unavailable?',
    'Where would you introduce caching in an image-sharing application, and why?',
    'How would you approach rate limiting for a public API?',
    'What signals would tell you the system needs to scale, and how would you respond?'
  ]
};
function updateTimer(){ const m = Math.floor(minutes / 60); const s = minutes % 60; timer.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; if(minutes > 0) minutes--; }
function startSession(){ overlay.classList.add('show'); overlay.setAttribute('aria-hidden','false'); minutes = 25 * 60; updateTimer(); clearInterval(interval); interval = setInterval(updateTimer, 1000); updateQuestion(); }
function closeSession(){ overlay.classList.remove('show'); overlay.setAttribute('aria-hidden','true'); clearInterval(interval); }
function updateQuestion(){ question.textContent = questions[activeTopic][questionIndex]; count.textContent = `0${questionIndex+1} / 05`; document.querySelector('.question-type span').textContent = activeTopic.toUpperCase(); answer.innerHTML = 'Begin answering <span>→</span>'; label.textContent = 'Your interviewer is waiting'; }
document.querySelectorAll('.topic').forEach(btn => btn.addEventListener('click', () => { document.querySelector('.topic.selected').classList.remove('selected'); btn.classList.add('selected'); activeTopic = btn.dataset.topic; questionIndex = 0; }));
start.addEventListener('click', startSession); exit.addEventListener('click', closeSession);
mic.addEventListener('click', () => { mic.classList.toggle('muted'); label.textContent = mic.classList.contains('muted') ? 'Microphone is muted' : 'Listening to your answer'; });
answer.addEventListener('click', () => { if(answer.textContent.includes('Begin')) { answer.innerHTML = 'Finish answer <span>■</span>'; label.textContent = 'Listening to your answer'; mic.classList.remove('muted'); } else { questionIndex = (questionIndex + 1) % 5; updateQuestion(); } });
document.getElementById('replayQuestion').addEventListener('click', () => { label.textContent = 'Maya is repeating the question…'; setTimeout(() => label.textContent = 'Your interviewer is waiting', 1700); });
document.addEventListener('keydown', e => { if(e.code === 'Space' && overlay.classList.contains('show')) { e.preventDefault(); mic.click(); } if(e.key === 'Escape') { closeSession(); roomModal.classList.remove('show'); } });
document.getElementById('openRoom').addEventListener('click', () => roomModal.classList.add('show'));
document.getElementById('closeRoom').addEventListener('click', () => roomModal.classList.remove('show'));
document.getElementById('consent').addEventListener('change', e => document.getElementById('findMatch').disabled = !e.target.checked);
document.getElementById('findMatch').addEventListener('click', () => { const btn = document.getElementById('findMatch'); btn.innerHTML = 'Looking for a partner…'; setTimeout(() => { btn.innerHTML = 'Match found — join room <span>→</span>'; }, 1100); });
