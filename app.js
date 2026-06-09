const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

let flashcards = [];
let currentCardIndex = 0;
let isFlipped = false;

// ─── Tab switching ───────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector(`.tab[onclick="switchTab('${tab}')"]`).classList.add('active');
  document.getElementById(tab).classList.add('active');
}

// ─── Course management ───────────────────────────────────────────
function addCourse() {
  const list = document.getElementById('courses-list');
  const entry = document.createElement('div');
  entry.className = 'course-entry';
  entry.innerHTML = `
    <input type="text" placeholder="Course name (e.g. CSC 300)" class="course-name" />
    <input type="date" class="exam-date" />
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
  const entries = document.querySelectorAll('.course-entry');
  const courses = [];
  entries.forEach(entry => {
    const name = entry.querySelector('.course-name').value.trim();
    const date = entry.querySelector('.exam-date').value;
    const difficulty = entry.querySelector('.difficulty').value;
    if (name && date) courses.push({ name, date, difficulty });
  });
  return courses;
}

// ─── Study Schedule ──────────────────────────────────────────────
async function generateSchedule() {
  const courses = getCourses();
  if (courses.length === 0) {
    alert('Please add at least one course with a name and exam date.');
    return;
  }

  const hoursPerDay = parseInt(document.getElementById('hours-per-day').value) || 3;
  const today = new Date().toISOString().split('T')[0];

  const courseList = courses.map(c =>
    `- ${c.name} | Exam: ${c.date} | Difficulty: ${c.difficulty}`
  ).join('\n');

  const prompt = `You are a study schedule assistant. Today is ${today}.

A student has the following courses and exam dates:
${courseList}

They can study ${hoursPerDay} hours per day.

Build a week-by-week study schedule from today until their last exam. For each week:
- Give the week a label (e.g. "Week 1: June 9–15")
- List specific daily study tasks with estimated hours
- Prioritize harder courses and closer exams
- Be realistic and encouraging

Respond ONLY in this JSON format (no markdown, no explanation):
{
  "weeks": [
    {
      "label": "Week 1: June 9–15",
      "tasks": [
        "Mon: CSC 300 – Review linked lists (1.5 hrs)",
        "Tue: Discrete Math – Practice graph theory (1 hr)",
        "Wed: CSC 300 – Binary search trees (2 hrs)"
      ]
    }
  ]
}`;

  showLoading('Building your study schedule...');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const text = data.content.map(i => i.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    renderSchedule(parsed.weeks);
  } catch (err) {
    console.error(err);
    alert('Something went wrong generating the schedule. Check your API key in app.js.');
  } finally {
    hideLoading();
  }
}

function renderSchedule(weeks) {
  const output = document.getElementById('schedule-output');
  const content = document.getElementById('schedule-content');
  content.innerHTML = '';

  weeks.forEach(week => {
    const block = document.createElement('div');
    block.className = 'week-block';
    block.innerHTML = `<h3>${week.label}</h3><ul>${week.tasks.map(t => `<li>${t}</li>`).join('')}</ul>`;
    content.appendChild(block);
  });

  output.classList.remove('hidden');
  output.scrollIntoView({ behavior: 'smooth' });
}

// ─── Flashcards ──────────────────────────────────────────────────
async function generateFlashcards() {
  const notes = document.getElementById('notes-input').value.trim();
  const subject = document.getElementById('flashcard-subject').value.trim() || 'this subject';

  if (!notes) {
    alert('Please paste some notes first.');
    return;
  }

  const prompt = `You are a flashcard generator. A student has pasted their notes for: ${subject}

Notes:
"""
${notes}
"""

Generate 8 high-quality Q&A flashcards based on the most important concepts in these notes.
Each question should test understanding, not just recall.

Respond ONLY in this JSON format (no markdown, no explanation):
{
  "flashcards": [
    { "question": "What is a binary search tree?", "answer": "A BST is a tree where each node's left child is smaller and right child is larger than the node itself." }
  ]
}`;

  showLoading('Generating flashcards from your notes...');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const text = data.content.map(i => i.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    flashcards = parsed.flashcards;
    currentCardIndex = 0;
    isFlipped = false;
    renderFlashcards();
  } catch (err) {
    console.error(err);
    alert('Something went wrong generating flashcards. Check your API key in app.js.');
  } finally {
    hideLoading();
  }
}

function renderFlashcards() {
  const output = document.getElementById('flashcard-output');
  output.classList.remove('hidden');

  updateCard();

  const list = document.getElementById('all-cards-list');
  list.innerHTML = flashcards.map((card, i) => `
    <div class="card-list-item">
      <div class="q">Q${i + 1}: ${card.question}</div>
      <div class="a">A: ${card.answer}</div>
    </div>
  `).join('');

  output.scrollIntoView({ behavior: 'smooth' });
}

function updateCard() {
  const card = flashcards[currentCardIndex];
  document.getElementById('card-question').textContent = card.question;
  document.getElementById('card-answer').textContent = card.answer;
  document.getElementById('card-counter').textContent = `${currentCardIndex + 1} / ${flashcards.length}`;

  const fc = document.getElementById('flashcard-display');
  fc.classList.remove('flipped');
  isFlipped = false;
}

function flipCard() {
  const fc = document.getElementById('flashcard-display');
  fc.classList.toggle('flipped');
  isFlipped = !isFlipped;
}

function nextCard() {
  if (currentCardIndex < flashcards.length - 1) {
    currentCardIndex++;
    updateCard();
  }
}

function prevCard() {
  if (currentCardIndex > 0) {
    currentCardIndex--;
    updateCard();
  }
}

// ─── Loading helpers ─────────────────────────────────────────────
function showLoading(msg) {
  document.getElementById('loading-msg').textContent = msg;
  document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loading').classList.add('hidden');
}
