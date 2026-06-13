/**
 * build.js — Toolproof site builder
 * Reads content/site.json and outputs index.html from template.html
 * Run: node build.js
 */

const fs = require("fs");
const path = require("path");

const content = JSON.parse(fs.readFileSync("content/site.json", "utf8"));
let html = fs.readFileSync("template.html", "utf8");

// ─── Helper: escape HTML special chars ───────────────────────────────────────
function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Helper: replace a single placeholder ────────────────────────────────────
function replace(key, value) {
  const rx = new RegExp(`{{\\s*${key}\\s*}}`, "g");
  html = html.replace(rx, value ?? "");
}

// ─── Flat scalar replacements ─────────────────────────────────────────────────
const flat = {
  // Nav
  nav_cta_label: content.nav.cta_label,

  // Hero
  hero_location_label: content.hero.location_label,
  hero_heading: content.hero.heading,
  hero_subheading: content.hero.subheading,
  hero_subheading_emphasis: content.hero.subheading_emphasis,
  hero_cta_primary_label: content.hero.cta_primary_label,
  hero_cta_secondary_label: content.hero.cta_secondary_label,
  hero_location_note: content.hero.location_note,

  // Social proof
  social_proof_label: content.social_proof.label,

  // Problems
  problems_section_label: content.problems.section_label,
  problems_heading: content.problems.heading,
  problems_p1_heading: content.problems.problem_1.heading,
  problems_p1_body: content.problems.problem_1.body,
  problems_p1_checklist_label: content.problems.problem_1.checklist_label,
  problems_p2_heading: content.problems.problem_2.heading,
  problems_p2_body: content.problems.problem_2.body,
  problems_p2_checklist_label: content.problems.problem_2.checklist_label,

  // How it works
  hiw_section_label: content.how_it_works.section_label,
  hiw_heading: content.how_it_works.heading,
  hiw_intro: content.how_it_works.intro,
  hiw_phase1_label: content.how_it_works.phase_1.label,
  hiw_phase1_intro: content.how_it_works.phase_1.intro,
  hiw_phase2_label: content.how_it_works.phase_2.label,
  hiw_phase2_intro: content.how_it_works.phase_2.intro,
  hiw_outcomes_label: content.how_it_works.outcomes_label,

  // Differentiators
  diff_section_label: content.differentiators.section_label,
  diff_heading: content.differentiators.heading,

  // Offers
  offers_section_label: content.offers.section_label,
  offers_heading: content.offers.heading,
  offers_intro: content.offers.intro,
  offers_free_label: content.offers.free_offer.label,
  offers_free_heading: content.offers.free_offer.heading,
  offers_free_body: content.offers.free_offer.body,
  offers_free_cta: content.offers.free_offer.cta_label,
  offers_addons: content.offers.addons,

  // Who it's for
  wit_section_label: content.who_its_for.section_label,
  wit_heading: content.who_its_for.heading,

  // Guarantee
  guarantee_section_label: content.guarantee.section_label,
  guarantee_heading: content.guarantee.heading,
  guarantee_body: content.guarantee.body,
  guarantee_footnote: content.guarantee.footnote,
  guarantee_cta_label: content.guarantee.cta_label,

  // About
  about_section_label: content.about.section_label,
  about_heading: content.about.heading,
  about_bio_1: content.about.bio_1,
  about_bio_2: content.about.bio_2,
  about_bio_3: content.about.bio_3,
  about_footnote: content.about.footnote,
  about_how_we_work_heading: content.about.how_we_work_heading,

  // FAQ
  faq_section_label: content.faq.section_label,
  faq_heading: content.faq.heading,

  // Contact
  contact_section_label: content.contact.section_label,
  contact_heading: content.contact.heading,
  contact_intro: content.contact.intro,
  contact_calendar_label: content.contact.calendar_label,
  contact_calendar_url: content.contact.calendar_url,
  contact_calendar_note: content.contact.calendar_note,
  contact_email_label: content.contact.email_label,
  contact_email_address: content.contact.email_address,
  contact_form_name_label: content.contact.form_name_label,
  contact_form_business_label: content.contact.form_business_label,
  contact_form_email_label: content.contact.form_email_label,
  contact_form_phone_label: content.contact.form_phone_label,
  contact_form_message_label: content.contact.form_message_label,
  contact_form_message_placeholder: content.contact.form_message_placeholder,
  contact_form_submit_label: content.contact.form_submit_label,
  contact_form_thanks_heading: content.contact.form_thanks_heading,
  contact_form_thanks_body: content.contact.form_thanks_body,

  // Footer
  footer_abn: content.footer.abn,
  footer_location: content.footer.location,
  footer_tagline: content.footer.tagline,
  footer_copyright_year: content.footer.copyright_year,
};

for (const [key, val] of Object.entries(flat)) {
  replace(key, esc(val));
}

// ─── Dynamic: social proof client logos ──────────────────────────────────────
replace(
  "social_proof_clients",
  content.social_proof.clients
    .map(
      (c) => `
    <div style="display:flex;align-items:center;gap:10px;opacity:0.6;">
      <span style="font-family:'Cal Sans',sans-serif;font-size:15px;color:var(--ironstone);letter-spacing:-0.01em;">${esc(c.name)}</span>
    </div>`
    )
    .join("\n")
);

// ─── Dynamic: problem checklists ─────────────────────────────────────────────
function checklist(items) {
  return items
    .map(
      (item) => `
    <li class="flex gap-3 items-start">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;margin-top:3px;">
        <circle cx="8" cy="8" r="7" stroke="var(--oxblood)" stroke-width="1.2"/>
        <path d="M5 8L7 10L11 6" stroke="var(--oxblood)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>${esc(item)}</span>
    </li>`
    )
    .join("\n");
}
replace("problems_p1_checklist", checklist(content.problems.problem_1.checklist));
replace("problems_p2_checklist", checklist(content.problems.problem_2.checklist));

// ─── Dynamic: phase 1 steps ──────────────────────────────────────────────────
replace(
  "hiw_phase1_steps",
  content.how_it_works.phase_1.steps
    .map(
      (s) => `
    <div class="flex gap-3 items-start">
      <div style="width:32px;height:32px;border-radius:50%;background:var(--teal-light);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 7L5.5 10.5L12 4" stroke="var(--teal)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <p style="font-size:15px;color:var(--charcoal);"><strong>${esc(s.title)}.</strong> ${esc(s.body)}</p>
    </div>`
    )
    .join("\n")
);

// ─── Dynamic: phase 2 steps ──────────────────────────────────────────────────
replace(
  "hiw_phase2_steps",
  content.how_it_works.phase_2.steps
    .map(
      (s, i) => `
    <div class="flex gap-3 items-start">
      <div style="width:32px;height:32px;border-radius:50%;background:var(--oxblood);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">
        <span style="font-family:'Cal Sans',sans-serif;font-weight:700;font-size:13px;color:#fff;">${i + 1}</span>
      </div>
      <p style="font-size:15px;color:var(--charcoal);"><strong>${esc(s.title)}.</strong> ${esc(s.body)}</p>
    </div>`
    )
    .join("\n")
);

// ─── Dynamic: outcomes ───────────────────────────────────────────────────────
replace(
  "hiw_outcomes",
  content.how_it_works.outcomes
    .map(
      (o) => `
    <li class="flex gap-2 items-start">
      <span style="color:var(--teal);font-size:16px;line-height:1.4;flex-shrink:0;">&#10003;</span>
      <span>${esc(o)}</span>
    </li>`
    )
    .join("\n")
);

// ─── Dynamic: differentiators ────────────────────────────────────────────────
replace(
  "diff_items",
  content.differentiators.items
    .map(
      (d) => `
    <div class="card">
      <div class="mb-3" style="width:40px;height:4px;background:var(--oxblood);border-radius:2px;"></div>
      <h3 class="text-xl mb-3">${esc(d.heading)}</h3>
      <p style="color:var(--charcoal-light);font-size:16px;">${esc(d.body)}</p>
    </div>`
    )
    .join("\n")
);

// ─── Dynamic: core offers ────────────────────────────────────────────────────
replace(
  "offers_core",
  content.offers.core_offers
    .map((o) => {
      const border = o.featured
        ? `border-color:var(--teal);box-shadow:0 0 0 1px var(--teal);`
        : "";
      const cta = o.featured
        ? `<a href="#contact" class="btn-primary text-center">${esc(o.cta_label)}</a>`
        : `<a href="#contact" class="btn-outline-ochre text-center">${esc(o.cta_label)}</a>`;
      const priceNote = o.price_note
        ? `<div style="font-size:13px;color:var(--charcoal-light);margin-bottom:16px;">${esc(o.price_note)}</div>`
        : "";
      const features = o.features
        .map(
          (f) => `
        <li class="flex gap-2 items-start">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;margin-top:3px;">
            <circle cx="8" cy="8" r="7" stroke="var(--teal)" stroke-width="1.2"/>
            <path d="M5 8L7 10L11 6" stroke="var(--teal)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span style="color:var(--charcoal);">${esc(f)}</span>
        </li>`
        )
        .join("\n");

      return `
    <div class="card flex flex-col" style="${border}">
      <div style="font-family:'Cal Sans',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--teal);margin-bottom:10px;">${esc(o.type_label)}</div>
      <h3 class="text-2xl mb-1">${esc(o.heading)}</h3>
      <div style="font-family:'Cal Sans',sans-serif;font-size:14px;font-weight:600;color:var(--charcoal-light);margin-bottom:6px;">${esc(o.price)}</div>
      ${priceNote}
      <ul class="mb-6 space-y-2 flex-1" style="font-size:15px;">${features}</ul>
      ${cta}
    </div>`;
    })
    .join("\n")
);

// ─── Dynamic: who it's for ───────────────────────────────────────────────────
replace(
  "wit_segments",
  content.who_its_for.segments
    .map(
      (s) => `
    <div class="card">
      <h3 class="text-xl mb-3">${esc(s.heading)}</h3>
      <p style="color:var(--charcoal-light);font-size:16px;margin-bottom:12px;">${esc(s.body_1)}</p>
      <p style="color:var(--charcoal-light);font-size:16px;">${esc(s.body_2)}</p>
    </div>`
    )
    .join("\n")
);

// ─── Dynamic: testimonials ───────────────────────────────────────────────────
replace(
  "wit_testimonials",
  content.who_its_for.testimonials
    .map((t) =>
      t.text
        ? `<div class="card"><p style="font-style:italic;">"${esc(t.text)}"</p><p style="margin-top:8px;font-weight:600;">${esc(t.author)}${t.business ? `, ${esc(t.business)}` : ""}</p></div>`
        : `<div class="testimonial-slot">[Client testimonial placeholder. Rob to supply.]</div>`
    )
    .join("\n")
);

// ─── Dynamic: how we work list ───────────────────────────────────────────────
replace(
  "about_how_we_work",
  content.about.how_we_work
    .map(
      (item) => `
    <li class="flex gap-3 items-start">
      <div style="width:6px;height:6px;border-radius:50%;background:var(--teal);margin-top:7px;flex-shrink:0;"></div>
      <span style="color:var(--charcoal);">${esc(item)}</span>
    </li>`
    )
    .join("\n")
);

// ─── Dynamic: FAQ items ───────────────────────────────────────────────────────
replace(
  "faq_items",
  content.faq.items
    .map(
      (item) => `
    <div class="faq-item">
      <button class="faq-question" aria-expanded="false">
        ${esc(item.question)}
        <svg class="faq-icon flex-shrink-0" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M5 7L10 12L15 7" stroke="var(--ironstone)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="faq-answer">${esc(item.answer)}</div>
    </div>`
    )
    .join("\n")
);

// ─── Write output ─────────────────────────────────────────────────────────────
fs.writeFileSync("index.html", html, "utf8");
console.log("✓ Built index.html from content/site.json");
