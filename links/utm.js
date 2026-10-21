// Toolproof UTM Standard: the single source of truth for naming rules,
// approved mediums/sources and recipes. Shared by the link builder page
// (links/index.html) and the links-api worker (workers/links-api).

// GA4 default channel each approved medium lands in. Order = dropdown order.
export const MEDIUMS = [
    { value: 'social',      label: 'Social (organic post)',  channel: 'Organic Social' },
    { value: 'paid_social', label: 'Paid social (ads)',      channel: 'Paid Social' },
    { value: 'email',       label: 'Email',                  channel: 'Email' },
    { value: 'cpc',         label: 'Paid search (cpc)',      channel: 'Paid Search' },
    { value: 'organic',     label: 'Organic (e.g. Google Business Profile)', channel: 'Organic Search' },
    { value: 'referral',    label: 'Referral (other website)', channel: 'Referral' },
    { value: 'display',     label: 'Display / banner ads',   channel: 'Display' },
    { value: 'video',       label: 'Video',                  channel: 'Organic Video' },
    { value: 'sms',         label: 'SMS',                    channel: 'SMS' },
    { value: 'affiliate',   label: 'Affiliate / partner',    channel: 'Affiliates' },
    { value: 'print',       label: 'Print (flyer, poster, ad)', channel: 'Offline / Print*' },
    { value: 'qr',          label: 'QR code',                channel: 'Offline / Print*' },
];

// Preset sources, grouped for the dropdown. Clients can add their own.
export const SOURCES = [
    { group: 'Social',  values: ['facebook', 'instagram', 'linkedin', 'youtube', 'tiktok', 'x', 'pinterest'] },
    { group: 'Search',  values: ['google', 'bing'] },
    { group: 'Email',   values: ['newsletter', 'mailchimp', 'hubspot', 'outlook', 'gmail'] },
    { group: 'Google',  values: ['google_business_profile'] },
    { group: 'Events',  values: ['humanitix', 'eventbrite'] },
    { group: 'Offline', values: ['flyer', 'poster', 'business_card', 'newspaper', 'radio', 'signage'] },
];

// One-click presets for everyday jobs. Fill source/medium/content.
export const RECIPES = [
    { id: 'fb_post',      label: 'Facebook post',           source: 'facebook',  medium: 'social',      content: 'post' },
    { id: 'fb_ad',        label: 'Facebook / Instagram ad', source: 'facebook',  medium: 'paid_social', content: 'ad' },
    { id: 'ig_bio',       label: 'Instagram bio link',      source: 'instagram', medium: 'social',      content: 'bio_link' },
    { id: 'li_post',      label: 'LinkedIn post',           source: 'linkedin',  medium: 'social',      content: 'post' },
    { id: 'newsletter',   label: 'Email newsletter',        source: 'newsletter', medium: 'email',      content: 'newsletter_link' },
    { id: 'signature',    label: 'Email signature',         source: 'outlook',   medium: 'email',       content: 'email_signature' },
    { id: 'gbp_post',     label: 'Google Business Profile post', source: 'google_business_profile', medium: 'organic', content: 'gbp_post' },
    { id: 'gbp_website',  label: 'Google Business Profile website button', source: 'google_business_profile', medium: 'organic', content: 'website_button' },
    { id: 'google_ads',   label: 'Google Ads',              source: 'google',    medium: 'cpc',         content: '' },
    { id: 'flyer_qr',     label: 'QR code on a flyer',      source: 'flyer',     medium: 'qr',          content: 'flyer_qr' },
    { id: 'event',        label: 'Event listing (Humanitix)', source: 'humanitix', medium: 'referral',  content: 'event_listing' },
    { id: 'partner',      label: 'Partner website',         source: '',          medium: 'referral',    content: '' },
];

export const PARAM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

// lowercase, spaces/hyphens/dots -> _, strip anything else, collapse _.
export function cleanValue(raw) {
    return String(raw ?? '')
        .normalize('NFKD').replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim()
        .replace(/&/g, '_and_')
        .replace(/[\s\-.\/]+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
}

// Strip "www." and ".com/.com.au" so "facebook.com" and "facebook" match.
export function cleanSource(raw) {
    let s = String(raw ?? '').toLowerCase().trim()
        .replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
    s = s.replace(/\.(com|net|org)(\.au)?$|\.com?\.au$|\.au$/, '');
    return cleanValue(s);
}

// Subsets of GA4's source categories; enough to predict the channel for the presets.
const SOCIAL_SITES = ['facebook', 'instagram', 'linkedin', 'x', 'twitter', 't_co', 'tiktok', 'pinterest', 'threads', 'reddit', 'snapchat'];
const SEARCH_SITES = ['google', 'bing', 'yahoo', 'duckduckgo', 'ecosia', 'baidu'];
const VIDEO_SITES = ['youtube', 'vimeo'];

// Approximates GA4's default channel rules, which look at source as well as medium.
export function channelFor(medium, source = '') {
    const m = MEDIUMS.find(x => x.value === medium);
    if (!m) return 'Unassigned';
    if (medium === 'cpc' || medium === 'paid_social') {
        if (SOCIAL_SITES.includes(source)) return 'Paid Social';
        if (SEARCH_SITES.includes(source)) return 'Paid Search';
        if (VIDEO_SITES.includes(source)) return 'Paid Video';
        return source ? 'Paid Other' : m.channel;
    }
    if (medium === 'video' && SOCIAL_SITES.includes(source)) return 'Organic Social';
    return m.channel;
}

// Returns { ok, url, errors[], warnings[] }.
export function buildUrl(baseUrl, params) {
    const errors = [];
    const warnings = [];
    const raw = String(baseUrl ?? '').trim();
    let url;
    try {
        url = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : 'https://' + raw);
    } catch {
        return { ok: false, url: '', errors: ['Enter a valid website address, e.g. https://example.com.au/page'], warnings };
    }
    if (!/^https?:$/.test(url.protocol) || !url.hostname.includes('.')) {
        return { ok: false, url: '', errors: ['Enter a valid website address, e.g. https://example.com.au/page'], warnings };
    }
    if (url.protocol === 'http:') warnings.push('This link uses http://. Use https:// if the site supports it.');

    const clean = {
        utm_source: cleanSource(params.source),
        utm_medium: cleanValue(params.medium),
        utm_campaign: cleanValue(params.campaign),
        utm_term: cleanValue(params.term),
        utm_content: cleanValue(params.content),
    };
    if (!clean.utm_source) errors.push('Source is required.');
    if (!clean.utm_medium) errors.push('Medium is required.');
    if (!clean.utm_campaign) errors.push('Campaign is required.');
    if (clean.utm_medium && !MEDIUMS.some(m => m.value === clean.utm_medium)) {
        warnings.push(`"${clean.utm_medium}" isn't a standard medium, so GA4 will file these visits under Unassigned.`);
    }

    const existing = PARAM_KEYS.filter(k => url.searchParams.has(k));
    if (existing.length) warnings.push('The address already had UTM tags. They have been replaced.');
    PARAM_KEYS.forEach(k => url.searchParams.delete(k));
    PARAM_KEYS.forEach(k => { if (clean[k]) url.searchParams.set(k, clean[k]); });

    return { ok: errors.length === 0, url: errors.length ? '' : url.toString(), errors, warnings, clean };
}

// Levenshtein distance, for "did you mean" campaign warnings.
function distance(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1,
                d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
    }
    return d[a.length][b.length];
}

// An existing name that's close to (but not the same as) the new one.
export function nearMiss(name, existing) {
    const n = cleanValue(name);
    if (!n || existing.includes(n)) return null;
    let best = null;
    for (const e of existing) {
        const dist = distance(n, e);
        if (dist > 0 && dist <= Math.max(2, Math.floor(n.length / 8)) && (!best || dist < best.dist)) {
            best = { name: e, dist };
        }
    }
    return best ? best.name : null;
}
