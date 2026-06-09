# AI Study Planner 📅🃏

A web app that builds a personalized week-by-week study schedule from your courses and exam dates, with AI-generated flashcards from your notes. Built with the Anthropic API for CSC 299 – AI-Assisted Software Development.

## Features

- **Study Planner** – Input your courses, exam dates, and difficulty level. AI builds a realistic week-by-week study schedule based on your availability.
- **Flashcard Generator** – Paste in your notes for any subject and AI generates Q&A flashcards you can flip through interactively.

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/sadeenhmeidan/ai-study-planner.git
   cd ai-study-planner
   ```

2. Open `index.html` in your browser (no build step needed).

3. Add your Anthropic API key — open `app.js` and the app uses the Anthropic API at `https://api.anthropic.com/v1/messages`.

> **Note:** For a production app, API keys should never be exposed in frontend code. This is a demo/lab project.

## Tech Stack

- HTML, CSS, JavaScript (vanilla — no frameworks)
- [Anthropic API](https://www.anthropic.com) (`claude-sonnet-4-20250514`)

## Project Structure

```
ai-study-planner/
├── index.html   # App structure and UI
├── style.css    # All styling
├── app.js       # Logic + Anthropic API calls
└── README.md
```

## Course

CSC 299 – AI-Assisted Software Development  
Sophomore Lab
