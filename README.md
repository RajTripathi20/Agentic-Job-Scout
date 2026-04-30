# Agentic Job Scout

**Agentic Job Scout** is an automated, multi-agent career intelligence system built on Firebase and powered by Google's Gemini models. It orchestrates a weekly job scouting workflow that discovers, analyzes, and curates highly relevant job opportunities tailored strictly to your personal resume, "vibes", and non-negotiable dealbreakers.

## Architecture

The system utilizes three distinct agents acting within a robust Firebase ecosystem:

1. **Research Agent** (`functions/src/agents/research.ts`)
   - Triggered weekly via Firebase Pub/Sub (`every sunday 09:00`).
   - Scrapes or fetches job listings from external sources based on target companies and roles.
   - Dumps raw listings into Firestore with the status `unprocessed`.

2. **Matching Agent** (`functions/src/agents/matching.ts`)
   - An event-driven agent triggered automatically by Firestore `onCreate` events on the `listings` collection.
   - Leverages `gemini-2.5-pro` (via `@google/genai`) to semantically align each job listing against your profile.
   - Evaluates the job description using your resume summary, configured vibe, and dealbreakers.
   - Self-reflects on why you might *hate* the job based on your dealbreakers, and updates Firestore with a `score` (0-100), `pros`, `cons`, and a `gap_analysis`.

3. **Notification Agent** (`functions/src/agents/notification.ts`)
   - Triggered weekly via Firebase Pub/Sub (`every sunday 17:00`).
   - Compiles the highest-scoring job listings processed during the week.
   - Uses the Gmail API to send a personalized weekly digest directly to your inbox.

## Tech Stack

- **Serverless & Database**: Firebase Cloud Functions (Node.js/TypeScript), Firestore
- **AI/LLM**: Google Gemini (`gemini-2.5-pro`) via `@google/genai`
- **Integrations**: Google APIs (Gmail)
- **Configuration**: YAML-based user profiling

## Configuration

The system is highly personalized through the `config.yaml` file located in the root of the project. This config acts as the primary prompt context for the Matching Agent.

```yaml
vibe: "Anything CS, intellectually stimulating, and allows me to have a life"

target_companies:
  - Google
  - Atlassian
  - Adobe
  # ...

dealbreakers:
  - "poor work-life balance"
  - "toxic culture"
  - "non-technical roles"

resume_summary:
  name: "Your Name"
  location: "Your Location"
  education:
    - "Your Degrees"
  experience:
    - "Your Experience"
  projects:
    - "Your Projects"
  skills:
    - "Your Skills"
```

The Matching Agent will strictly evaluate every job against this configuration to determine fit and identify red flags.

## Setup & Deployment

1. **Prerequisites**
   - Node.js (v20)
   - Firebase CLI installed (`npm install -g firebase-tools`)
   - A Firebase project with Firestore and Cloud Functions (Blaze plan) enabled.
   - Google Cloud Project with the Gmail API enabled.
   - Gemini API Key.

2. **Installation**
   ```bash
   cd functions
   npm install
   ```

3. **Environment Variables**
   Ensure your Firebase environment has the necessary secrets configured (e.g., Gemini API Key, Gmail credentials). You can use Firebase Secret Manager to securely store them if you update the code to use them, or rely on Google Application Default Credentials.

4. **Local Testing**
   You can run the agents locally using the Firebase Emulator Suite:
   ```bash
   npm run serve
   ```
   Or trigger the manual HTTP endpoints configured in `index.ts` to test individual agents:
   - `/triggerResearch`
   - `/triggerNotification`

5. **Deployment**
   To deploy the multi-agent system to production:
   ```bash
   npm run deploy
   ```

## License

MIT License
