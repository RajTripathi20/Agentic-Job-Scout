import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local (for local dev / emulator)
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

// Import agents (we put this after initializeApp so utils load db properly)
import { runResearchPhase } from './agents/research';
import { processListing } from './agents/matching';
import { sendNewsletter } from './agents/notification';

// 1. Orchestrator: Triggered Weekly. Only triggers Research Agent in this design.
export const orchestrator = functions.pubsub.schedule("every sunday 09:00").onRun(async (context) => {
    console.log("Orchestrator triggered: Running Research Phase");
    await runResearchPhase();
});

// Manual HTTP trigger for Research Agent (for testing Phase 1)
export const triggerResearch = functions.https.onRequest(async (req, res) => {
    try {
        const result = await runResearchPhase();
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Matching Agent: Triggered automatically when Research Agent writes a new 'unprocessed' listing
export const matchingAgent = functions.firestore.document("listings/{listingId}").onCreate(async (snap, context) => {
    await processListing(snap);
});

// 3. Notification Agent: Triggered on a separate schedule to send the compiled results
export const scheduledNotification = functions.pubsub.schedule("every sunday 17:00").onRun(async (context) => {
    console.log("Scheduled Notification triggered");
    await sendNewsletter();
});

// Manual HTTP trigger for Notification Agent (for testing Phase 1)
export const triggerNotification = functions.https.onRequest(async (req, res) => {
    try {
        const result = await sendNewsletter();
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});
