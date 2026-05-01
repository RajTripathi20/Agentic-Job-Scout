/**
 * One-time script to generate a Gmail OAuth2 refresh token.
 *
 * Prerequisites:
 *   - In GCP Console, your OAuth Client ID must be of type "Desktop app"
 *     (Desktop apps automatically allow http://localhost as a redirect URI)
 *   - GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be in your .env.local
 *
 * Usage:
 *   npx ts-node scripts/generate-gmail-token.ts
 *
 * What happens:
 *   1. Opens your browser to Google's consent page.
 *   2. After you authorize, Google redirects to http://localhost:3333
 *   3. This script catches the code, exchanges it for tokens, and prints the refresh_token.
 *   4. Copy the refresh_token into .env.local as GMAIL_REFRESH_TOKEN.
 */

import * as http from 'http';
import * as url from 'url';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local from project root
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const PORT = 3333;
const REDIRECT_URI = `http://localhost:${PORT}`;

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set in .env.local');
    process.exit(1);
}

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force consent to guarantee a refresh_token
});

// Start a temporary local server to receive the callback
const server = http.createServer(async (req, res) => {
    const queryParams = url.parse(req.url || '', true).query;
    const code = queryParams.code as string | undefined;

    if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>❌ No authorization code received.</h1>');
        return;
    }

    try {
        const { tokens } = await oAuth2Client.getToken(code);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>✅ Success! You can close this tab.</h1><p>Check your terminal for the refresh token.</p>');

        console.log('\n✅ Success! Here is your refresh token:\n');
        console.log(tokens.refresh_token);
        console.log('\n👉 Paste this value into your .env.local as GMAIL_REFRESH_TOKEN\n');
    } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<h1>❌ Failed to exchange code for token.</h1>');
        console.error('❌ Error exchanging code for token:', err);
    }

    // Shut down the server after handling
    server.close();
});

server.listen(PORT, () => {
    console.log(`\n🔗 Open this URL in your browser to authorize:\n`);
    console.log(authUrl);
    console.log(`\n⏳ Waiting for callback on http://localhost:${PORT} ...\n`);

    // Try to open the browser automatically
    const start = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    require('child_process').exec(`${start} "${authUrl}"`);
});
