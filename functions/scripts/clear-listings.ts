/**
 * Utility: Clear all listings from Firestore to start a fresh test run.
 *
 * Usage: npx ts-node scripts/clear-listings.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

import * as admin from 'firebase-admin';
admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });

async function main() {
    const db = admin.firestore();
    const snapshot = await db.collection('listings').get();

    if (snapshot.empty) {
        console.log('No listings to clear.');
        process.exit(0);
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    console.log(`🗑️  Cleared ${snapshot.size} listings from Firestore.`);
    process.exit(0);
}

main();
