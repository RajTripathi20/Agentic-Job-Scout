/**
 * Standalone test: Run the Matching Agent against existing unprocessed listings.
 *
 * Usage:
 *   npx ts-node scripts/test-matching.ts
 *
 * Prerequisites:
 *   - Research Agent has already run and populated Firestore with 'unprocessed' listings
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

console.log('🔑 GEMINI_API_KEY loaded:', process.env.GEMINI_API_KEY ? '✅' : '❌ MISSING');

import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
});

import { processListing } from '../src/agents/matching';

async function main() {
    const db = admin.firestore();
    console.log('\n🔍 Fetching unprocessed listings from Firestore...\n');

    const snapshot = await db.collection('listings').where('status', '==', 'unprocessed').get();

    if (snapshot.empty) {
        console.log('⚠️  No unprocessed listings found. Run the Research Agent first.');
        process.exit(0);
    }

    console.log(`Found ${snapshot.size} unprocessed listings. Processing...\n`);

    for (const doc of snapshot.docs) {
        const data = doc.data();
        console.log(`─── Processing: ${data.title} @ ${data.company} ───`);

        // processListing expects a QueryDocumentSnapshot — we pass the real one
        await processListing(doc as admin.firestore.QueryDocumentSnapshot);

        // Re-read the doc to show results
        const updated = (await doc.ref.get()).data();
        if (updated && updated.status === 'processed') {
            console.log(`   Score: ${updated.score}`);
            console.log(`   Pros: ${(updated.pros || []).join(', ')}`);
            console.log(`   Cons: ${(updated.cons || []).join(', ')}`);
            console.log(`   Gap: ${updated.gap_analysis}`);
        } else if (updated && updated.status === 'failed_processing') {
            console.log(`   ❌ Processing failed.`);
        }
        console.log('');
    }

    console.log('✅ Matching Agent test complete!');
    process.exit(0);
}

main();
