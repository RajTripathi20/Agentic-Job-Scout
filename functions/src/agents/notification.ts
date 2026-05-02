import { db, listingsCollection, loadConfig } from '../utils';
import { buildDigestHtml, DigestJob, DigestStats } from '../config/newsletter';
import { google } from 'googleapis';

export async function sendNewsletter() {
    const config = loadConfig();
    const digestConfig = config?.digest || { high_match_threshold: 75, min_jobs_to_show: 3 };
    const threshold = digestConfig.high_match_threshold;
    const minJobs = digestConfig.min_jobs_to_show;

    // Query all processed jobs
    const snapshot = await listingsCollection.where('status', '==', 'processed').get();

    if (snapshot.empty) {
        console.log("No processed jobs to send.");
        return { sent: false, reason: "No jobs" };
    }

    const allJobs: DigestJob[] = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
            title: d.title,
            company: d.company,
            location: d.location || 'Unknown',
            url: d.url,
            score: d.score || 0,
            recommendation: d.recommendation || 'CONSIDER',
            why_you_fit: d.why_you_fit || '',
            why_role_fits_you: d.why_role_fits_you || '',
            watch_out: d.watch_out || '',
            yoe_gap: d.yoe_gap || '',
        };
    });

    // Sort by score descending (League of Listings)
    allJobs.sort((a, b) => b.score - a.score);

    // Select jobs to include in the digest
    const highMatches = allJobs.filter(j => j.score >= threshold);
    const isLowMatchWeek = highMatches.length < minJobs;
    const jobsToShow = isLowMatchWeek
        ? allJobs.slice(0, minJobs) // Fallback: show top N regardless of threshold
        : highMatches;

    // Collect unique companies from all analyzed jobs
    const uniqueCompanies = new Set(allJobs.map(j => j.company));

    const stats: DigestStats = {
        totalAnalyzed: allJobs.length,
        highMatches: highMatches.length,
        companiesSearched: uniqueCompanies.size,
        dateRange: 'Past 7 days',
    };

    console.log(`Digest: ${allJobs.length} analyzed, ${highMatches.length} high matches, showing ${jobsToShow.length}`);

    // Build HTML
    const html = buildDigestHtml(jobsToShow, stats, isLowMatchWeek);

    // Send via Gmail
    return await sendViaGmail(html, snapshot);
}

/**
 * Sends the HTML digest via Gmail OAuth and marks jobs as notified.
 */
async function sendViaGmail(
    html: string,
    snapshot: FirebaseFirestore.QuerySnapshot
) {
    const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
    const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
    const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;

    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
        console.warn("Gmail OAuth variables missing. Dumping HTML to console instead:");
        console.log("================ NEWSLETTER HTML ================");
        console.log(html);
        console.log("=================================================");
        return { sent: false, reason: "Missing credentials", html };
    }

    try {
        const oAuth2Client = new google.auth.OAuth2(
            CLIENT_ID, CLIENT_SECRET, 'https://developers.google.com/oauthplayground'
        );
        oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
        const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

        const userEmail = process.env.GMAIL_USER_EMAIL || 'tripathiraj01@gmail.com';
        const utf8Subject = `=?utf-8?B?${Buffer.from("Your Weekly AI Job Scout Digest 🚀").toString('base64')}?=`;
        const messageParts = [
            `From: ${userEmail}`,
            `To: ${userEmail}`,
            'Content-Type: text/html; charset=utf-8',
            'MIME-Version: 1.0',
            `Subject: ${utf8Subject}`,
            '',
            html,
        ];
        const message = messageParts.join('\n');
        const encodedMessage = Buffer.from(message)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw: encodedMessage },
        });

        console.log("Newsletter sent successfully!");

        // Mark all processed jobs as notified
        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
            batch.update(doc.ref, { status: 'notified' });
        });
        await batch.commit();

        return { sent: true };
    } catch (error) {
        console.error("Failed to send email:", error);
        return { sent: false, error: String(error) };
    }
}
