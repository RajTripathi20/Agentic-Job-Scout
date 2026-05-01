/**
 * Standalone test: Run the Notification Agent to compile and send the digest.
 *
 * Usage:
 *   npx ts-node scripts/test-notification.ts
 *
 * Prerequisites:
 *   - Matching Agent has already processed listings (status: 'processed')
 *   - Gmail OAuth credentials are set in .env.local
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

console.log('🔑 GEMINI_API_KEY loaded:', process.env.GEMINI_API_KEY ? '✅' : '❌');
console.log('📧 GMAIL_CLIENT_ID loaded:', process.env.GMAIL_CLIENT_ID ? '✅' : '❌');
console.log('📧 GMAIL_REFRESH_TOKEN loaded:', process.env.GMAIL_REFRESH_TOKEN ? '✅' : '❌');

import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
});

import { sendNewsletter } from '../src/agents/notification';

async function main() {
    console.log('\n📬 Running Notification Agent...\n');

    try {
        const result = await sendNewsletter();

        if (result.sent) {
            console.log('✅ Newsletter sent successfully! Check your inbox.');
        } else {
            console.log(`⚠️  Newsletter not sent. Reason: ${result.reason || 'unknown'}`);
            if ((result as any).html) {
                console.log('\n📝 HTML preview saved below (credentials were missing, so email was not sent):\n');
                // Just show first 500 chars as preview
                console.log((result as any).html.substring(0, 500) + '...');
            }
        }
    } catch (err) {
        console.error('❌ Error:', err);
    }

    process.exit(0);
}

main();
