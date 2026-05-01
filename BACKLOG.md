# AI Job Scout — Backlog & Opportunity Areas

Running list of pending items, improvement opportunities, and known issues.

---

## 🔴 Phase 1 — Complete the Walking Skeleton
- [x] Research Agent — Gemini + Google Search grounding ✅
- [x] Research Agent — Firestore writes ✅
- [x] Matching Agent — Scoring + self-reflection ✅
- [x] Notification Agent — Email delivery via Gmail OAuth ✅
- [x] End-to-end pipeline run (Research → Match → Notify) ✅

---

## 🟡 Phase 2 — Expand Search & Deepen Match

### Research Agent
- [ ] **Location filtering:** Most results came back US-based. Add location constraints to the prompt (e.g., "India only" or "remote-friendly") OR add a post-search filter that drops listings not matching target locations before writing to Firestore.
- [ ] **Keyword dealbreaker pre-filter:** Apply dealbreakers (e.g., "no crypto") as a quick filter at the Research Agent level itself, before the listing even hits Firestore. This saves Matching Agent API calls on obviously bad fits.
- [ ] **Expand to all 13 target companies:** PayPal, Cisco, DB, Barclays, Walmart, Microsoft, Google, Atlassian, Adobe, SAP, McKinsey, Uber, Nvidia.
- [ ] **Time-scoping:** Ensure only jobs from the past 7 days are returned (currently best-effort via prompt).
- [ ] **Pagination / rate limiting:** Handle Google Search API quotas gracefully.

### Matching Agent
- [ ] **Full self-reflection loop:** Explicitly force "argue against" step as a separate LLM call (currently single-pass).
- [ ] **Deduplication across weeks:** Don't re-process or re-notify the same job URL if it was already seen in a prior run.

---

## 🟢 Phase 3 — TLDR AI Digest & League of Listings
- [ ] **League of Listings ranking:** Sort by score, tier them (Top / Mid / Low).
- [ ] **Beautiful HTML newsletter:** Styled like TLDR AI with clean cards, stats header, tier sections.
- [ ] **Run stats in digest:** "Scanned X roles across Y companies, Z top matches."

---

## 🔵 Phase 4 — Automation & Future Intelligence
- [ ] Deploy scheduled functions to Firebase Cloud Scheduler.
- [ ] Gmail OAuth token auto-refresh in production.
- [ ] **Sentiment analysis (future):** Search Reddit, Leetcode, Levels.fyi for company sentiment and WLB signals. Feed into the Matching Agent as additional context.
- [ ] **Config UI (future):** Lightweight web UI to edit config instead of YAML.
