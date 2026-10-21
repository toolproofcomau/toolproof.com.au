// Run: node --test links/
import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanValue, cleanSource, buildUrl, channelFor, nearMiss, cleanSlug, slugProblem } from './utm.js';

test('cleanValue enforces lowercase_underscore', () => {
    assert.equal(cleanValue('Funding Workshop June 26'), 'funding_workshop_june_26');
    assert.equal(cleanValue('  FB-Reel  '), 'fb_reel');
    assert.equal(cleanValue('Q&A night!'), 'q_and_a_night');
    assert.equal(cleanValue('a  --  b'), 'a_b');
    assert.equal(cleanValue('Café promo'), 'cafe_promo');
    assert.equal(cleanValue(''), '');
    assert.equal(cleanValue(undefined), '');
});

test('cleanSource collapses domain variants', () => {
    assert.equal(cleanSource('facebook.com'), 'facebook');
    assert.equal(cleanSource('https://www.facebook.com/page'), 'facebook');
    assert.equal(cleanSource('HubSpot.com'), 'hubspot');
    assert.equal(cleanSource('ipsau.com.au'), 'ipsau');
    assert.equal(cleanSource('pilbaranews'), 'pilbaranews');
    assert.equal(cleanSource('Google Business Profile'), 'google_business_profile');
});

test('buildUrl tags a plain URL', () => {
    const r = buildUrl('https://www.ipsbusinessadvisory.com.au/free-business-advice-pilbara.html',
        { source: 'facebook.com', medium: 'social', campaign: 'Grant Promo May 26', content: 'FB Reel' });
    assert.ok(r.ok);
    assert.equal(r.url, 'https://www.ipsbusinessadvisory.com.au/free-business-advice-pilbara.html'
        + '?utm_source=facebook&utm_medium=social&utm_campaign=grant_promo_may_26&utm_content=fb_reel');
});

test('buildUrl keeps existing query string (Humanitix hxchl)', () => {
    const r = buildUrl('https://events.humanitix.com/price-with-confidence-karratha-and-online?hxchl=hex-col',
        { source: 'hubspot', medium: 'email', campaign: 'workshop_promo' });
    assert.equal(r.url, 'https://events.humanitix.com/price-with-confidence-karratha-and-online'
        + '?hxchl=hex-col&utm_source=hubspot&utm_medium=email&utm_campaign=workshop_promo');
});

test('buildUrl puts tags before a #fragment', () => {
    const r = buildUrl('https://example.com.au/page#book', { source: 'x', medium: 'social', campaign: 'c' });
    assert.equal(r.url, 'https://example.com.au/page?utm_source=x&utm_medium=social&utm_campaign=c#book');
});

test('buildUrl replaces existing utm tags instead of duplicating', () => {
    const r = buildUrl('https://example.com.au/?utm_source=old&utm_medium=old&id=7',
        { source: 'google', medium: 'cpc', campaign: 'new' });
    assert.equal(r.url, 'https://example.com.au/?id=7&utm_source=google&utm_medium=cpc&utm_campaign=new');
    assert.ok(r.warnings.some(w => w.includes('already had UTM')));
});

test('buildUrl adds https:// when missing', () => {
    const r = buildUrl('example.com.au/contact', { source: 'flyer', medium: 'qr', campaign: 'expo_oct_26' });
    assert.equal(r.url, 'https://example.com.au/contact?utm_source=flyer&utm_medium=qr&utm_campaign=expo_oct_26');
});

test('buildUrl reports missing fields and bad URLs', () => {
    assert.deepEqual(buildUrl('not a url', { source: 'a', medium: 'email', campaign: 'c' }).ok, false);
    const r = buildUrl('https://example.com.au', { source: '', medium: '', campaign: '' });
    assert.equal(r.ok, false);
    assert.equal(r.errors.length, 3);
});

test('non-standard medium warns about Unassigned', () => {
    const r = buildUrl('https://example.com.au', { source: 'google', medium: 'appointments', campaign: 'c' });
    assert.ok(r.ok);
    assert.ok(r.warnings.some(w => w.includes('Unassigned')));
    assert.equal(channelFor('appointments'), 'Unassigned');
    assert.equal(channelFor('email'), 'Email');
});

test('channelFor follows GA4 source rules for paid mediums', () => {
    assert.equal(channelFor('paid_social', 'facebook'), 'Paid Social');
    assert.equal(channelFor('cpc', 'facebook'), 'Paid Social');
    assert.equal(channelFor('cpc', 'google'), 'Paid Search');
    assert.equal(channelFor('cpc', 'youtube'), 'Paid Video');
    assert.equal(channelFor('paid_social', 'pilbaranews'), 'Paid Other');
    assert.equal(channelFor('social', 'facebook'), 'Organic Social');
    assert.equal(channelFor('organic', 'google_business_profile'), 'Organic Search');
});

test('nearMiss catches campaign typos', () => {
    const existing = ['awareness_aug_2026', 'workshop_promo'];
    assert.equal(nearMiss('awarness_aug_2026', existing), 'awareness_aug_2026');
    assert.equal(nearMiss('awareness_aug_2027', existing), 'awareness_aug_2026');
    assert.equal(nearMiss('awareness_aug_2026', existing), null);
    assert.equal(nearMiss('black_friday_nov_26', existing), null);
});

test('cleanSlug makes readable lowercase-hyphen names', () => {
    assert.equal(cleanSlug('Onslow AI Workshop'), 'onslow-ai-workshop');
    assert.equal(cleanSlug('spring_sale.2026'), 'spring-sale-2026');
    assert.equal(cleanSlug('  --Q&A Night!-- '), 'q-and-a-night');
    assert.equal(cleanSlug('Café'), 'cafe');
    assert.equal(cleanSlug('a'.repeat(39) + '-bcd').length, 39);
});

test('slugProblem enforces length, reserved and blocked words', () => {
    assert.equal(slugProblem('spring-sale'), '');
    assert.equal(slugProblem(''), 'Enter a name.');
    assert.equal(slugProblem('ab'), 'Use at least 3 characters.');
    assert.equal(slugProblem('admin'), 'That name is reserved.');
    assert.match(slugProblem('westpac-login-help'), /westpac/);
    assert.match(slugProblem('ato-refund'), /ato/);
    assert.equal(slugProblem('potato-festival'), '');
    assert.equal(slugProblem('tomato-day'), '');
});
