/**
 * Standalone test: Run the Research Agent locally against live Firestore.
 *
 * Usage:
 *   npx ts-node scripts/test-research.ts
 *
 * Prerequisites:
 *   - .env.local populated at the project root
 *   - Firebase project created (agentic-ai-scout)
 *   - Firestore enabled in the Firebase console (create a database if not done)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env FIRST before any other imports
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

// Verify env loaded
console.log('🔑 GEMINI_API_KEY loaded:', process.env.GEMINI_API_KEY ? '✅' : '❌ MISSING');
console.log('📦 FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID || '❌ MISSING');

import * as admin from 'firebase-admin';

// Initialize Firebase Admin with the project ID
admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
});

// Now import and run the research agent
import { runResearchPhase } from '../src/agents/research';

async function main() {
    console.log('\n🚀 Starting Research Agent test run...\n');

    try {
        const result = await runResearchPhase();
        console.log('\n✅ Research Agent completed!');
        console.log(`   Jobs found: ${result.jobsFound}`);

        // Read back what was written to Firestore
        const db = admin.firestore();
        const snapshot = await db.collection('listings').where('status', '==', 'unprocessed').get();
        console.log(`   Listings in Firestore (unprocessed): ${snapshot.size}`);

        if (!snapshot.empty) {
            console.log('\n📋 Sample listings:');
            snapshot.docs.slice(0, 3).forEach((doc) => {
                const data = doc.data();
                console.log(`   - ${data.title} @ ${data.company}`);
                console.log(`     URL: ${data.url}`);
                console.log(`     Snippet: ${data.description_snippet?.substring(0, 100)}...`);
                console.log('');
            });
        }
    } catch (err) {
        console.error('❌ Error:', err);
    }

    process.exit(0);
}

main();
