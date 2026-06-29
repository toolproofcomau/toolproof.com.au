const ALLOWED_ORIGINS = [
    'https://www.toolproof.com.au',
    'https://toolproof.com.au',
    'http://localhost:8080',
    'http://localhost:3000',
];

function corsHeaders(origin) {
    const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    return {
        'Access-Control-Allow-Origin': allowed,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
    };
}

// Notion select options cannot contain commas — map to safe versions
const SPEND_MAP = {
    '$500-$1,000':   '$500-$1000',
    '$1,000-$2,500': '$1000-$2500',
    '$2,500+':       '$2500+',
};

const SCORED_MAP = {
    'Yes, and I can provide evidence': 'Yes with evidence',
    'Sort of / not sure':             'Sort of',
    'No':                             'No',
};

const BAND_MAP = {
    'Flying blind.':          'Flying blind',
    'Confident but guessing.': 'Confident but guessing',
    'Measured but leaking.':   'Measured but leaking',
    'Proof-ready.':            'Proof-ready',
};

function safeSpend(val) { return SPEND_MAP[val] || val || null; }
function safeScored(val) { return SCORED_MAP[val] || val || null; }
function safeBand(val) { return BAND_MAP[val] || val || null; }

function computeLeadPriority(monthlySpend, statedWin, proofScore) {
    const highSpend = ['$1,000-$2,500', '$2,500+'].includes(monthlySpend);
    const outcomeMinded = statedWin === 'More enquiries and sales';
    const lowScoreWithBudget = proofScore <= 30 && highSpend;
    if (highSpend && (outcomeMinded || lowScoreWithBudget)) return 'Priority';
    if (highSpend || outcomeMinded || proofScore <= 60) return 'Nurture';
    return 'Not a fit';
}

function richText(str) {
    return [{ text: { content: String(str || '').slice(0, 2000) } }];
}

function multiSelect(arr) {
    return (arr || [])
        .filter(Boolean)
        .map(name => ({ name: String(name).slice(0, 100) }));
}

async function verifyTurnstile(token, ip, secret) {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, response: token, remoteip: ip }),
    });
    const data = await res.json();
    return data.success === true;
}

async function checkRateLimit(env, ip) {
    const window = Math.floor(Date.now() / 3600000); // 1-hour fixed bucket
    const key = `rl:${ip}:${window}`;
    const current = await env.RATE_LIMIT.get(key);
    const count = current ? parseInt(current, 10) : 0;
    if (count >= 5) return false;
    await env.RATE_LIMIT.put(key, String(count + 1), { expirationTtl: 3600 });
    return true;
}

async function handleSubmitLead(request, env) {
    let body;
    try {
        body = await request.json();
    } catch {
        return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), { status: 400 });
    }

    // Honeypot check — bots fill hidden fields, humans don't
    if (body.hp) {
        return new Response(JSON.stringify({ success: true, leadPriority: 'Not a fit' }), { status: 200 });
    }

    // Required field presence check — reject empty submissions before they touch the rate limiter
    if (!body.email || !body.firstName) {
        return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), { status: 400 });
    }

    // Turnstile verification
    const ip = request.headers.get('CF-Connecting-IP') || '';
    const turnstileOk = await verifyTurnstile(body.turnstileToken, ip, env.TURNSTILE_SECRET);
    if (!turnstileOk) {
        return new Response(JSON.stringify({ success: false, error: 'Bot verification failed' }), { status: 403 });
    }

    // Rate limiting — 5 submissions per IP per hour
    const withinLimit = await checkRateLimit(env, ip);
    if (!withinLimit) {
        return new Response(JSON.stringify({ success: false, error: 'Too many submissions' }), { status: 429 });
    }

    const {
        firstName, email, phone, company, website, consent,
        proofScore, band, monthlySpend, traceableSpend,
        platforms, platformsOther, toolGaps, toolGapsOther,
        whoRunsMarketing, statedWin,
        q1Answer, q4Answer, q6Answer, q8Answer, q10Answer,
    } = body;

    const leadPriority = computeLeadPriority(monthlySpend, statedWin, proofScore);

    const notionBody = {
        parent: { database_id: env.NOTION_DATABASE_ID },
        properties: {
            'Name': {
                title: richText(`${firstName || ''} — ${company || ''}`.trim()),
            },
            'Email': {
                email: email || null,
            },
            'Phone': {
                phone_number: phone || null,
            },
            'Company': {
                rich_text: richText(company),
            },
            'Website': {
                url: website || null,
            },
            'Proof Score': {
                number: typeof proofScore === 'number' ? proofScore : null,
            },
            'Score Band': {
                select: safeBand(band) ? { name: safeBand(band) } : null,
            },
            'Monthly Spend': {
                select: safeSpend(monthlySpend) ? { name: safeSpend(monthlySpend) } : null,
            },
            'Traceable Spend': {
                rich_text: richText(traceableSpend),
            },
            'Platforms': {
                multi_select: multiSelect((platforms || []).filter(p => p !== 'Other')),
            },
            'Platforms Other': {
                rich_text: richText(platformsOther),
            },
            'Tool Gaps': {
                multi_select: multiSelect((toolGaps || []).filter(g => g !== 'Other')),
            },
            'Tool Gaps Other': {
                rich_text: richText(toolGapsOther),
            },
            'Who Runs Marketing': {
                select: whoRunsMarketing ? { name: whoRunsMarketing } : null,
            },
            'Stated Win': {
                select: statedWin ? { name: statedWin } : null,
            },
            'Lead Priority': {
                select: { name: leadPriority },
            },
            'Q1 Answer': {
                select: safeScored(q1Answer) ? { name: safeScored(q1Answer) } : null,
            },
            'Q4 Answer': {
                select: safeScored(q4Answer) ? { name: safeScored(q4Answer) } : null,
            },
            'Q6 Answer': {
                select: safeScored(q6Answer) ? { name: safeScored(q6Answer) } : null,
            },
            'Q8 Answer': {
                select: safeScored(q8Answer) ? { name: safeScored(q8Answer) } : null,
            },
            'Q10 Answer': {
                select: safeScored(q10Answer) ? { name: safeScored(q10Answer) } : null,
            },
            'Consent Given': {
                checkbox: consent === true,
            },
            'Submitted At': {
                date: { start: new Date().toISOString() },
            },
        },
    };

    const notionRes = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${env.NOTION_TOKEN}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify(notionBody),
    });

    if (!notionRes.ok) {
        const err = await notionRes.text();
        console.error('Notion error:', notionRes.status, err);
        return new Response(JSON.stringify({ success: false, error: 'Notion write failed' }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, leadPriority }), { status: 200 });
}

export default {
    async fetch(request, env) {
        const origin = request.headers.get('Origin') || '';
        const headers = { ...corsHeaders(origin), 'Content-Type': 'application/json' };

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers });
        }

        const url = new URL(request.url);

        if (request.method === 'POST' && url.pathname === '/submit-lead') {
            const res = await handleSubmitLead(request, env);
            Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
            return res;
        }

        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
    },
};
