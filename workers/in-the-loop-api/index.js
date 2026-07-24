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

function richText(str) {
    return [{ text: { content: String(str || '').slice(0, 2000) } }];
}

const SOURCE_MAP = {
    bar: 'In The Loop (homepage)',
    footer: 'Footer',
};

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

async function handleSubscribe(request, env) {
    let body;
    try {
        body = await request.json();
    } catch {
        return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), { status: 400 });
    }

    // Honeypot check — bots fill hidden fields, humans don't
    if (body.hp) {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (!body.email || !body.consentWording) {
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

    const { email, name, source, consentWording } = body;
    const signupSource = SOURCE_MAP[source] || 'Other';

    const notionBody = {
        parent: { database_id: env.NOTION_DATABASE_ID },
        properties: {
            'Email': {
                title: richText(email),
            },
            'Name': {
                rich_text: richText(name),
            },
            'Status': {
                status: { name: 'Subscribed' },
            },
            'Consent timestamp': {
                date: { start: new Date().toISOString() },
            },
            'Consent wording': {
                rich_text: richText(consentWording),
            },
            'Signup source': {
                select: { name: signupSource },
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

    return new Response(JSON.stringify({ success: true }), { status: 200 });
}

export default {
    async fetch(request, env) {
        const origin = request.headers.get('Origin') || '';
        const headers = { ...corsHeaders(origin), 'Content-Type': 'application/json' };

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers });
        }

        const url = new URL(request.url);

        if (request.method === 'POST' && url.pathname === '/subscribe') {
            const res = await handleSubscribe(request, env);
            Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
            return res;
        }

        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
    },
};
