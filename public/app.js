// ─── Auth & Settings ─────────────────────────────────────────────
const user = JSON.parse(localStorage.getItem('sp_user') || 'null');
const settings = JSON.parse(localStorage.getItem('sp_settings') || '{}');

if (!user) window.location.href = 'login.html';

if (user) {
  document.getElementById('welcome-msg').textContent = `Welcome back, ${settings.name || user.name}!`;
}

if (settings.darkMode) document.body.classList.add('dark');
if (settings.hours) document.getElementById('hours-per-day').value = settings.hours;

function logout() {
  localStorage.removeItem('sp_user');
  window.location.href = 'login.html';
}

function toggleDark() {
  document.body.classList.toggle('dark');
  const s = JSON.parse(localStorage.getItem('sp_settings') || '{}');
  s.darkMode = document.body.classList.contains('dark');
  localStorage.setItem('sp_settings', JSON.stringify(s));
}

// ─── Tab switching ───────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector(`.tab[onclick="switchTab('${tab}')"]`).classList.add('active');
  document.getElementById(tab).classList.add('active');
  if (tab === 'saved') renderSaved();
  if (tab === 'progress') renderProgress();
}

// ─── Course management ───────────────────────────────────────────
function addCourse() {
  const list = document.getElementById('courses-list');
  const entry = document.createElement('div');
  entry.className = 'course-entry';
  entry.innerHTML = `
    <input type="text" placeholder="Course name (e.g. CSC 300)" class="course-name"/>
    <input type="date" class="exam-date"/>
    <select class="difficulty">
      <option value="easy">Easy</option>
      <option value="medium" selected>Medium</option>
      <option value="hard">Hard</option>
    </select>
    <button class="btn-remove" onclick="removeCourse(this)">✕</button>
  `;
  list.appendChild(entry);
}

function removeCourse(btn) {
  const entries = document.querySelectorAll('.course-entry');
  if (entries.length > 1) btn.closest('.course-entry').remove();
}

function getCourses() {
  return [...document.querySelectorAll('.course-entry')].reduce((acc, entry) => {
    const name = entry.querySelector('.course-name').value.trim();
    const date = entry.querySelector('.exam-date').value;
    const difficulty = entry.querySelector('.difficulty').value;
    if (name && date) acc.push({ name, date, difficulty });
    return acc;
  }, []);
}

// ─── Schedule generation ─────────────────────────────────────────
async function generateSchedule() {
  const courses = getCourses();
  if (!courses.length) { alert('Please add at least one course with a name and exam date.'); return; }

  const hoursPerDay = parseInt(document.getElementById('hours-per-day').value) || 3;
  const today = new Date().toISOString().split('T')[0];
  const courseList = courses.map(c => `- ${c.name} | Exam: ${c.date} | Difficulty: ${c.difficulty}`).join('\n');

  const prompt = `You are a study schedule assistant. Today is ${today}.
A student has these courses and exam dates:
${courseList}
They can study ${hoursPerDay} hours per day.
Build a week-by-week study schedule from today until their last exam. For each week:
- Give the week a label (e.g. "Week 1: June 9–15")
- List specific daily study tasks with estimated hours
- Prioritize harder courses and closer exams
- Be realistic and encouraging
Respond ONLY in this JSON format (no markdown, no explanation):
{"weeks":[{"label":"Week 1: June 9–15","tasks":["Mon: CSC 300 – Review linked lists (1.5 hrs)"]}]}`;

  showLoading('Building your study schedule...');
  try {
    const data = await callAI(prompt);
    const text = data.content.map(i => i.text || '').join('');
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    renderSchedule(parsed.weeks);
  } catch (err) {
    console.error(err);
    alert('Something went wrong. Make sure the server is running with a valid API key.');
  } finally {
    hideLoading();
  }
}

function renderSchedule(weeks) {
  const output = document.getElementById('schedule-output');
  const content = document.getElementById('schedule-content');
  content.innerHTML = '';
  weeks.forEach((week, wi) => {
    const block = document.createElement('div');
    block.className = 'week-block';
    block.innerHTML = `<h3>${week.label}</h3><ul>${week.tasks.map((t, ti) => `
      <li>
        <label class="task-label">
          <input type="checkbox" onchange="trackProgress('${wi}-${ti}', this.checked)" ${getProgress(`${wi}-${ti}`) ? 'checked' : ''}/>
          <span class="${getProgress(`${wi}-${ti}`) ? 'done' : ''}">${t}</span>
        </label>
      </li>`).join('')}</ul>`;
    content.appendChild(block);
  });
  output.classList.remove('hidden');
  output.scrollIntoView({ behavior: 'smooth' });
  // store current schedule for saving
  window._currentSchedule = weeks;
}

// ─── Save schedules ──────────────────────────────────────────────
function saveSchedule() {
  if (!window._currentSchedule) return;
  const schedules = JSON.parse(localStorage.getItem('sp_schedules') || '[]');
  const label = prompt('Name this schedule:', `Schedule ${schedules.length + 1}`);
  if (!label) return;
  schedules.push({ label, weeks: window._currentSchedule, date: new Date().toLocaleDateString() });
  localStorage.setItem('sp_schedules', JSON.stringify(schedules));
  alert('Schedule saved!');
}

function renderSaved() {
  const schedules = JSON.parse(localStorage.getItem('sp_schedules') || '[]');
  const container = document.getElementById('saved-list');
  if (!schedules.length) { container.innerHTML = '<p style="color:var(--muted)">No saved schedules yet. Generate one and save it!</p>'; return; }
  container.innerHTML = schedules.map((s, i) => `
    <div class="output-card" style="margin-bottom:1rem;">
      <div class="output-header">
        <div><h3>${s.label}</h3><p style="font-size:0.8rem;color:var(--muted)">Saved on ${s.date}</p></div>
        <button class="btn-remove" onclick="deleteSchedule(${i})">🗑 Delete</button>
      </div>
      ${s.weeks.map(w => `<div class="week-block"><h3>${w.label}</h3><ul>${w.tasks.map(t => `<li>${t}</li>`).join('')}</ul></div>`).join('')}
    </div>`).join('');
}

function deleteSchedule(i) {
  const schedules = JSON.parse(localStorage.getItem('sp_schedules') || '[]');
  schedules.splice(i, 1);
  localStorage.setItem('sp_schedules', JSON.stringify(schedules));
  renderSaved();
}

// ─── Progress tracking ───────────────────────────────────────────
function trackProgress(key, checked) {
  const progress = JSON.parse(localStorage.getItem('sp_progress') || '{}');
  progress[key] = checked;
  localStorage.setItem('sp_progress', JSON.stringify(progress));
}

function getProgress(key) {
  const progress = JSON.parse(localStorage.getItem('sp_progress') || '{}');
  return progress[key] || false;
}

function renderProgress() {
  const progress = JSON.parse(localStorage.getItem('sp_progress') || '{}');
  const total = Object.keys(progress).length;
  const done = Object.values(progress).filter(Boolean).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('progress-content').innerHTML = total ? `
    <div class="card">
      <h2>Overall Progress</h2>
      <div class="progress-bar-wrap"><div class="progress-bar" style="width:${pct}%"></div></div>
      <p style="margin-top:0.5rem;font-weight:600;">${done} / ${total} tasks completed (${pct}%)</p>
    </div>` : '<p style="color:var(--muted)">No progress tracked yet. Generate a schedule and check off tasks!</p>';
}

// ─── Flashcards ──────────────────────────────────────────────────
let flashcards = [], currentCardIndex = 0;

async function generateFlashcards() {
  const notes = document.getElementById('notes-input').value.trim();
  const subject = document.getElementById('flashcard-subject').value.trim() || 'this subject';
  if (!notes) { alert('Please paste some notes first.'); return; }

  const prompt = `You are a flashcard generator. A student pasted notes for: ${subject}
Notes:
"""
${notes}
"""
Generate 8 high-quality Q&A flashcards based on the most important concepts.
Respond ONLY in this JSON format (no markdown, no explanation):
{"flashcards":[{"question":"What is X?","answer":"X is..."}]}`;

  showLoading('Generating flashcards from your notes...');
  try {
    const data = await callAI(prompt);
    const text = data.content.map(i => i.text || '').join('');
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    flashcards = parsed.flashcards;
    currentCardIndex = 0;
    renderFlashcards();
  } catch (err) {
    console.error(err);
    alert('Something went wrong generating flashcards.');
  } finally {
    hideLoading();
  }
}

function renderFlashcards() {
  const output = document.getElementById('flashcard-output');
  output.classList.remove('hidden');
  updateCard();
  document.getElementById('all-cards-list').innerHTML = flashcards.map((c, i) => `
    <div class="card-list-item">
      <div class="q">Q${i+1}: ${c.question}</div>
      <div class="a">A: ${c.answer}</div>
    </div>`).join('');
  output.scrollIntoView({ behavior: 'smooth' });
}

function updateCard() {
  const card = flashcards[currentCardIndex];
  document.getElementById('card-question').textContent = card.question;
  document.getElementById('card-answer').textContent = card.answer;
  document.getElementById('card-counter').textContent = `${currentCardIndex + 1} / ${flashcards.length}`;
  document.getElementById('flashcard-display').classList.remove('flipped');
}

function flipCard() { document.getElementById('flashcard-display').classList.toggle('flipped'); }
function nextCard() { if (currentCardIndex < flashcards.length - 1) { currentCardIndex++; updateCard(); } }
function prevCard() { if (currentCardIndex > 0) { currentCardIndex--; updateCard(); } }

// ─── API call (goes to backend) ──────────────────────────────────
async function callAI(prompt) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  return res.json();
}

// ─── Loading ─────────────────────────────────────────────────────
function showLoading(msg) {
  document.getElementById('loading-msg').textContent = msg;
  document.getElementById('loading').classList.remove('hidden');
}
function hideLoading() { document.getElementById('loading').classList.add('hidden'); }
