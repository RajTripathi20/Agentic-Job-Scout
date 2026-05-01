"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerNotification = exports.scheduledNotification = exports.matchingAgent = exports.triggerResearch = exports.orchestrator = void 0;
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
// Load environment variables from .env.local (for local dev / emulator)
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
// Import agents (we put this after initializeApp so utils load db properly)
const research_1 = require("./agents/research");
const matching_1 = require("./agents/matching");
const notification_1 = require("./agents/notification");
// 1. Orchestrator: Triggered Weekly. Only triggers Research Agent in this design.
exports.orchestrator = functions.pubsub.schedule("every sunday 09:00").onRun(async (context) => {
    console.log("Orchestrator triggered: Running Research Phase");
    await (0, research_1.runResearchPhase)();
});
// Manual HTTP trigger for Research Agent (for testing Phase 1)
exports.triggerResearch = functions.https.onRequest(async (req, res) => {
    try {
        const result = await (0, research_1.runResearchPhase)();
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 2. Matching Agent: Triggered automatically when Research Agent writes a new 'unprocessed' listing
exports.matchingAgent = functions.firestore.document("listings/{listingId}").onCreate(async (snap, context) => {
    await (0, matching_1.processListing)(snap);
});
// 3. Notification Agent: Triggered on a separate schedule to send the compiled results
exports.scheduledNotification = functions.pubsub.schedule("every sunday 17:00").onRun(async (context) => {
    console.log("Scheduled Notification triggered");
    await (0, notification_1.sendNewsletter)();
});
// Manual HTTP trigger for Notification Agent (for testing Phase 1)
exports.triggerNotification = functions.https.onRequest(async (req, res) => {
    try {
        const result = await (0, notification_1.sendNewsletter)();
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
//# sourceMappingURL=index.js.map