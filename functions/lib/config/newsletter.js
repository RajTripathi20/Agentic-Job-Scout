"use strict";
/**
 * Newsletter HTML template builder.
 * Generates a clean, scannable digest inspired by TLDR AI.
 *
 * Design principles:
 * - Reads in under 60 seconds
 * - Each job is 4 lines max: score badge + title, why you fit, why role fits you, watch out
 * - Stats header for context
 * - Only high matches shown (with a top-N fallback)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDigestHtml = void 0;
function scoreBadge(score) {
    if (score >= 90)
        return `<span style="background:#0d652d;color:#fff;padding:3px 10px;border-radius:12px;font-size:13px;font-weight:600;">🟢 ${score}% — Apply Now</span>`;
    if (score >= 75)
        return `<span style="background:#1a73e8;color:#fff;padding:3px 10px;border-radius:12px;font-size:13px;font-weight:600;">🔵 ${score}% — Strong Match</span>`;
    if (score >= 50)
        return `<span style="background:#e8a317;color:#fff;padding:3px 10px;border-radius:12px;font-size:13px;font-weight:600;">🟡 ${score}% — Consider</span>`;
    return `<span style="background:#888;color:#fff;padding:3px 10px;border-radius:12px;font-size:13px;font-weight:600;">⚪ ${score}%</span>`;
}
function jobCard(job) {
    return `
    <div style="margin-bottom:24px;padding:20px;border:1px solid #e2e8f0;border-radius:12px;border-left:4px solid ${job.score >= 90 ? '#0d652d' : job.score >= 75 ? '#1a73e8' : '#e8a317'};">
        <!-- Title Row -->
        <div style="margin-bottom:8px;">
            <a href="${job.url}" style="color:#1a1a2e;font-size:17px;font-weight:700;text-decoration:none;">${job.title}</a>
            <span style="color:#666;font-size:14px;"> @ ${job.company}</span>
        </div>
        <div style="margin-bottom:12px;">
            <span style="color:#888;font-size:13px;">📍 ${job.location}</span>
            <span style="margin-left:12px;">${scoreBadge(job.score)}</span>
        </div>

        <!-- Insights — one line each -->
        <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.6;">
            <tr>
                <td style="color:#0d652d;font-weight:600;padding:2px 8px 2px 0;vertical-align:top;white-space:nowrap;">Why you fit →</td>
                <td style="color:#333;">${job.why_you_fit}</td>
            </tr>
            <tr>
                <td style="color:#1a73e8;font-weight:600;padding:2px 8px 2px 0;vertical-align:top;white-space:nowrap;">Why it fits you →</td>
                <td style="color:#333;">${job.why_role_fits_you}</td>
            </tr>
            <tr>
                <td style="color:#b31412;font-weight:600;padding:2px 8px 2px 0;vertical-align:top;white-space:nowrap;">⚠️ Watch out →</td>
                <td style="color:#333;">${job.watch_out}</td>
            </tr>
        </table>

        <!-- Apply link -->
        <div style="margin-top:12px;">
            <a href="${job.url}" style="color:#1a73e8;font-size:13px;font-weight:600;text-decoration:none;">View Full Posting →</a>
        </div>
    </div>`;
}
function buildDigestHtml(jobs, stats, isLowMatchWeek) {
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    let html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:620px;margin:0 auto;color:#1a1a2e;padding:20px;">
        <!-- Header -->
        <div style="text-align:center;margin-bottom:24px;">
            <h1 style="margin:0;font-size:24px;font-weight:800;color:#1a1a2e;">AI Job Scout 🚀</h1>
            <p style="margin:4px 0 0;font-size:14px;color:#888;">Weekly Opportunity Digest — ${dateStr}</p>
        </div>

        <!-- Stats Bar -->
        <div style="background:#f8f9fa;border-radius:10px;padding:14px 20px;margin-bottom:24px;text-align:center;">
            <span style="font-size:14px;color:#555;">
                Analyzed <strong>${stats.totalAnalyzed}</strong> roles across <strong>${stats.companiesSearched}</strong> companies
                ${stats.highMatches > 0
        ? ` · Found <strong style="color:#0d652d;">${stats.highMatches} high match${stats.highMatches > 1 ? 'es' : ''}</strong>`
        : ''}
            </span>
        </div>`;
    if (isLowMatchWeek) {
        html += `
        <div style="background:#fff8e1;border:1px solid #ffecb3;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0;font-size:14px;color:#7a6200;">
                <strong>📊 Slim pickings this week.</strong> No roles crossed the high-match threshold.
                Here are your top ${jobs.length} for reference:
            </p>
        </div>`;
    }
    else {
        html += `
        <div style="margin-bottom:8px;">
            <h2 style="margin:0;font-size:16px;font-weight:700;color:#1a1a2e;text-transform:uppercase;letter-spacing:0.5px;">🏆 Top Matches</h2>
        </div>`;
    }
    // Job cards
    for (const job of jobs) {
        html += jobCard(job);
    }
    // Footer
    html += `
        <div style="text-align:center;margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#aaa;">Generated by your AI Job Scout Multi-Agent System</p>
        </div>
    </div>`;
    return html;
}
exports.buildDigestHtml = buildDigestHtml;
//# sourceMappingURL=newsletter.js.map