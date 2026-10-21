import { buildUrl, cleanValue, cleanSource, SOURCES } from '../../links/utm.js';

const ALLOWED_ORIGINS = [
    'https://www.toolproof.com.au',
    'https://toolproof.com.au',
    'http://localhost:8080',
    'http://localhost:3000',
];

const APP_URL = 'https://www.toolproof.com.au/links/';
const PRESET_SOURCES = SOURCES.flatMap(g => g.values);
const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // no 0/o/1/l/i

function corsHeaders(origin) {
    const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    return {
        'Access-Control-Allow-Origin': allowed,
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
    };
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function randomString(length, alphabet = CODE_ALPHABET) {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
}

async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
}

function bearer(request) {
    const h = request.headers.get('Authorization') || '';
    return h.startsWith('Bearer ') ? h.slice(7).trim() : '';
}

// Workspace token = "<workspace id>.<secret>"; only the secret's hash is stored.
async function authWorkspace(request, env) {
    const [id, secret] = bearer(request).split('.');
    if (!id || !secret) return null;
    const ws = await env.DB.prepare('SELECT id, name, domains, key_hash FROM workspaces WHERE id = ?').bind(id).first();
    if (!ws || ws.key_hash !== await sha256(secret)) return null;
    return ws;
}

function isAdmin(request, env) {
    return Boolean(env.ADMIN_TOKEN) && bearer(request) === env.ADMIN_TOKEN;
}

async function newShortCode(env) {
    for (let i = 0; i < 5; i++) {
        const code = randomString(6);
        const taken = await env.DB.prepare('SELECT 1 FROM links WHERE short_code = ?').bind(code).first();
        if (!taken) return code;
    }
    throw new Error('Could not allocate short code');
}

function shapeLink(row, env) {
    return { ...row, short_url: row.short_code ? `${env.SHORT_BASE}/${row.short_code}` : '' };
}

// --- Short link redirect -------------------------------------------------

async function handleRedirect(code, request, env, ctx) {
    const row = await env.DB.prepare('SELECT final_url FROM links WHERE short_code = ?').bind(code).first();
    if (!row) return new Response('Link not found', { status: 404 });
    ctx.waitUntil(env.DB.prepare('INSERT INTO clicks (short_code, referrer, country) VALUES (?, ?, ?)')
        .bind(code, (request.headers.get('Referer') || '').slice(0, 300), request.cf?.country || '').run());
    return Response.redirect(row.final_url, 301);
}

// --- Admin (Rob) ---------------------------------------------------------

async function handleAdmin(request, env, parts) {
    if (!isAdmin(request, env)) return json({ success: false, error: 'Unauthorised' }, 401);

    if (request.method === 'GET' && parts.length === 1) {
        const { results } = await env.DB.prepare(`
            SELECT w.id, w.name, w.domains, w.created_at,
                   (SELECT COUNT(*) FROM links l WHERE l.workspace_id = w.id) AS link_count,
                   (SELECT MAX(created_at) FROM links l WHERE l.workspace_id = w.id) AS last_link_at,
                   (SELECT COUNT(*) FROM clicks k JOIN links l ON l.short_code = k.short_code WHERE l.workspace_id = w.id) AS click_count
            FROM workspaces w ORDER BY w.created_at DESC`).all();
        return json({ success: true, workspaces: results });
    }

    if (request.method === 'POST' && parts.length === 1) {
        const body = await request.json().catch(() => ({}));
        const name = String(body.name || '').trim().slice(0, 120);
        if (!name) return json({ success: false, error: 'Name is required' }, 400);
        const id = randomString(6);
        const secret = randomString(24);
        await env.DB.prepare('INSERT INTO workspaces (id, name, domains, key_hash) VALUES (?, ?, ?, ?)')
            .bind(id, name, String(body.domains || '').trim().slice(0, 300), await sha256(secret)).run();
        return json({ success: true, id, link: `${APP_URL}#${id}.${secret}` }, 201);
    }

    if (request.method === 'PATCH' && parts.length === 2) {
        const body = await request.json().catch(() => ({}));
        const name = String(body.name || '').trim().slice(0, 120);
        if (!name) return json({ success: false, error: 'Name is required' }, 400);
        const row = await env.DB.prepare('UPDATE workspaces SET name = ?, domains = ? WHERE id = ? RETURNING id, name, domains')
            .bind(name, String(body.domains || '').trim().slice(0, 300), parts[1]).first();
        if (!row) return json({ success: false, error: 'Not found' }, 404);
        return json({ success: true, workspace: row });
    }

    // Removes the workspace and everything in it; its short links stop working.
    if (request.method === 'DELETE' && parts.length === 2) {
        const id = parts[1];
        const results = await env.DB.batch([
            env.DB.prepare('DELETE FROM clicks WHERE short_code IN (SELECT short_code FROM links WHERE workspace_id = ? AND short_code IS NOT NULL)').bind(id),
            env.DB.prepare('DELETE FROM links WHERE workspace_id = ?').bind(id),
            env.DB.prepare('DELETE FROM campaigns WHERE workspace_id = ?').bind(id),
            env.DB.prepare('DELETE FROM sources WHERE workspace_id = ?').bind(id),
            env.DB.prepare('DELETE FROM workspaces WHERE id = ?').bind(id),
        ]);
        if (!results[4].meta.changes) return json({ success: false, error: 'Not found' }, 404);
        return json({ success: true });
    }

    if (request.method === 'POST' && parts.length === 3 && parts[2] === 'reset-key') {
        const secret = randomString(24);
        const res = await env.DB.prepare('UPDATE workspaces SET key_hash = ? WHERE id = ?')
            .bind(await sha256(secret), parts[1]).run();
        if (!res.meta.changes) return json({ success: false, error: 'Not found' }, 404);
        return json({ success: true, link: `${APP_URL}#${parts[1]}.${secret}` });
    }

    return json({ success: false, error: 'Not found' }, 404);
}

// --- Client workspace API ------------------------------------------------

async function getWorkspace(ws, env) {
    const [sources, campaigns, links] = await env.DB.batch([
        env.DB.prepare('SELECT value FROM sources WHERE workspace_id = ? ORDER BY value').bind(ws.id),
        env.DB.prepare(`
            SELECT c.*, (SELECT COUNT(*) FROM links l WHERE l.workspace_id = c.workspace_id AND l.campaign = c.name) AS link_count
            FROM campaigns c WHERE c.workspace_id = ? ORDER BY c.created_at DESC`).bind(ws.id),
        env.DB.prepare(`
            SELECT l.*, (SELECT COUNT(*) FROM clicks k WHERE k.short_code = l.short_code) AS clicks
            FROM links l WHERE l.workspace_id = ? ORDER BY l.created_at DESC, l.id DESC`).bind(ws.id),
    ]);
    return json({
        success: true,
        workspace: { id: ws.id, name: ws.name, domains: ws.domains },
        sources: sources.results.map(r => r.value),
        campaigns: campaigns.results,
        links: links.results.map(r => shapeLink(r, env)),
    });
}

async function createLink(ws, request, env) {
    const body = await request.json().catch(() => ({}));
    const built = buildUrl(body.base_url, body);
    if (!built.ok) return json({ success: false, error: built.errors.join(' ') }, 400);
    const c = built.clean;

    const dupe = await env.DB.prepare('SELECT * FROM links WHERE workspace_id = ? AND final_url = ?')
        .bind(ws.id, built.url).first();
    if (dupe) return json({ success: true, duplicate: true, link: shapeLink(dupe, env) });

    const shortCode = body.shorten ? await newShortCode(env) : null;
    const stmts = [
        env.DB.prepare('INSERT OR IGNORE INTO campaigns (workspace_id, name) VALUES (?, ?)').bind(ws.id, c.utm_campaign),
        env.DB.prepare(`INSERT INTO links (workspace_id, base_url, source, medium, campaign, term, content, final_url, short_code, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`)
            .bind(ws.id, String(body.base_url).trim().slice(0, 2000), c.utm_source, c.utm_medium, c.utm_campaign,
                c.utm_term, c.utm_content, built.url, shortCode, String(body.notes || '').slice(0, 1000)),
    ];
    if (!PRESET_SOURCES.includes(c.utm_source)) {
        stmts.push(env.DB.prepare('INSERT OR IGNORE INTO sources (workspace_id, value) VALUES (?, ?)').bind(ws.id, c.utm_source));
    }
    const results = await env.DB.batch(stmts);
    return json({ success: true, link: shapeLink({ ...results[1].results[0], clicks: 0 }, env) }, 201);
}

async function handleLink(ws, request, env, id) {
    const link = await env.DB.prepare('SELECT * FROM links WHERE id = ? AND workspace_id = ?').bind(id, ws.id).first();
    if (!link) return json({ success: false, error: 'Not found' }, 404);

    if (request.method === 'DELETE') {
        await env.DB.prepare('DELETE FROM links WHERE id = ?').bind(id).run();
        return json({ success: true });
    }
    if (request.method === 'PATCH') {
        const body = await request.json().catch(() => ({}));
        if (typeof body.notes === 'string') link.notes = body.notes.slice(0, 1000);
        if (body.shorten && !link.short_code) link.short_code = await newShortCode(env);
        await env.DB.prepare('UPDATE links SET notes = ?, short_code = ? WHERE id = ?')
            .bind(link.notes, link.short_code, id).run();
        return json({ success: true, link: shapeLink(link, env) });
    }
    return json({ success: false, error: 'Method not allowed' }, 405);
}

async function upsertCampaign(ws, request, env) {
    const body = await request.json().catch(() => ({}));
    const name = cleanValue(body.name);
    if (!name) return json({ success: false, error: 'Campaign name is required' }, 400);
    const row = await env.DB.prepare(`
        INSERT INTO campaigns (workspace_id, name, starts_on, ends_on, notes) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT (workspace_id, name) DO UPDATE SET starts_on = excluded.starts_on, ends_on = excluded.ends_on, notes = excluded.notes
        RETURNING *`)
        .bind(ws.id, name, body.starts_on || null, body.ends_on || null, String(body.notes || '').slice(0, 1000)).first();
    return json({ success: true, campaign: row });
}

async function addSource(ws, request, env) {
    const body = await request.json().catch(() => ({}));
    const value = cleanSource(body.value);
    if (!value) return json({ success: false, error: 'Source is required' }, 400);
    await env.DB.prepare('INSERT OR IGNORE INTO sources (workspace_id, value) VALUES (?, ?)').bind(ws.id, value).run();
    return json({ success: true, value });
}

async function handleApi(request, env, parts) {
    const ws = await authWorkspace(request, env);
    if (!ws) return json({ success: false, error: 'This workspace link is invalid or has been reset.' }, 401);
    const [resource, id] = parts;

    if (resource === 'workspace' && request.method === 'GET') return getWorkspace(ws, env);
    if (resource === 'links' && !id && request.method === 'POST') return createLink(ws, request, env);
    if (resource === 'links' && id) return handleLink(ws, request, env, Number(id));
    if (resource === 'campaigns' && request.method === 'POST') return upsertCampaign(ws, request, env);
    if (resource === 'sources' && request.method === 'POST') return addSource(ws, request, env);
    return json({ success: false, error: 'Not found' }, 404);
}

export default {
    async fetch(request, env, ctx) {
        const origin = request.headers.get('Origin') || '';
        const url = new URL(request.url);
        const parts = url.pathname.split('/').filter(Boolean);

        if (parts[0] === 's' && parts[1] && request.method === 'GET') {
            return handleRedirect(parts[1], request, env, ctx);
        }

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders(origin) });
        }

        let response;
        try {
            if (parts[0] === 'api') response = await handleApi(request, env, parts.slice(1));
            else if (parts[0] === 'admin') response = await handleAdmin(request, env, parts.slice(1));
            else response = json({ success: false, error: 'Not found' }, 404);
        } catch (err) {
            console.error(err);
            response = json({ success: false, error: 'Server error' }, 500);
        }

        const headers = new Headers(response.headers);
        Object.entries(corsHeaders(origin)).forEach(([k, v]) => headers.set(k, v));
        return new Response(response.body, { status: response.status, headers });
    },
};
