import { defineConfig } from "tinacms";

export default defineConfig({
  branch: process.env.GITHUB_BRANCH ?? "main",
  clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID ?? "",
  token: process.env.TINA_TOKEN ?? "",

  build: {
    outputFolder: "admin",
    publicFolder: ".",
  },

  media: {
    tina: {
      mediaRoot: "assets/images",
      publicFolder: ".",
    },
  },

  schema: {
    collections: [
      {
        name: "site",
        label: "Site Content",
        path: "content",
        format: "json",
        ui: {
          allowedActions: { create: false, delete: false },
          router: () => "/",
        },
        match: { include: "site" },
        fields: [
          // ── Nav ──────────────────────────────────────────────────────────
          {
            type: "object",
            name: "nav",
            label: "Navigation",
            fields: [
              { type: "string", name: "cta_label", label: "CTA Button Label" },
            ],
          },

          // ── Hero ─────────────────────────────────────────────────────────
          {
            type: "object",
            name: "hero",
            label: "Hero Section",
            fields: [
              { type: "string", name: "location_label", label: "Location Label" },
              { type: "string", name: "heading", label: "Heading", ui: { component: "textarea" } },
              { type: "string", name: "subheading", label: "Subheading" },
              { type: "string", name: "subheading_emphasis", label: "Subheading Emphasis (bold red text)" },
              { type: "string", name: "cta_primary_label", label: "Primary CTA Label" },
              { type: "string", name: "cta_secondary_label", label: "Secondary CTA Label" },
              { type: "string", name: "location_note", label: "Location Note (below buttons)" },
            ],
          },

          // ── Social Proof ──────────────────────────────────────────────────
          {
            type: "object",
            name: "social_proof",
            label: "Social Proof Strip",
            fields: [
              { type: "string", name: "label", label: "Strip Label" },
              {
                type: "object",
                name: "clients",
                label: "Client Names",
                list: true,
                ui: { itemProps: (item) => ({ label: item?.name }) },
                fields: [{ type: "string", name: "name", label: "Name" }],
              },
            ],
          },

          // ── Problems ─────────────────────────────────────────────────────
          {
            type: "object",
            name: "problems",
            label: "Problems Section",
            fields: [
              { type: "string", name: "section_label", label: "Section Label" },
              { type: "string", name: "heading", label: "Heading", ui: { component: "textarea" } },
              {
                type: "object",
                name: "problem_1",
                label: "Problem 1 — Software Under-use",
                fields: [
                  { type: "string", name: "heading", label: "Card Heading" },
                  { type: "string", name: "body", label: "Body Text", ui: { component: "textarea" } },
                  { type: "string", name: "checklist_label", label: "Checklist Label" },
                  { type: "string", name: "checklist", label: "Checklist Items", list: true },
                ],
              },
              {
                type: "object",
                name: "problem_2",
                label: "Problem 2 — No Accountability",
                fields: [
                  { type: "string", name: "heading", label: "Card Heading" },
                  { type: "string", name: "body", label: "Body Text", ui: { component: "textarea" } },
                  { type: "string", name: "checklist_label", label: "Checklist Label" },
                  { type: "string", name: "checklist", label: "Checklist Items", list: true },
                ],
              },
            ],
          },

          // ── How It Works ─────────────────────────────────────────────────
          {
            type: "object",
            name: "how_it_works",
            label: "How It Works / Proof Loop",
            fields: [
              { type: "string", name: "section_label", label: "Section Label" },
              { type: "string", name: "heading", label: "Heading" },
              { type: "string", name: "intro", label: "Intro", ui: { component: "textarea" } },
              {
                type: "object",
                name: "phase_1",
                label: "Phase 1 — Make Numbers Trustworthy",
                fields: [
                  { type: "string", name: "label", label: "Phase Label" },
                  { type: "string", name: "intro", label: "Phase Intro" },
                  {
                    type: "object",
                    name: "steps",
                    label: "Steps",
                    list: true,
                    ui: { itemProps: (item) => ({ label: item?.title }) },
                    fields: [
                      { type: "string", name: "title", label: "Step Title" },
                      { type: "string", name: "body", label: "Step Body", ui: { component: "textarea" } },
                    ],
                  },
                ],
              },
              {
                type: "object",
                name: "phase_2",
                label: "Phase 2 — The Proof Loop",
                fields: [
                  { type: "string", name: "label", label: "Phase Label" },
                  { type: "string", name: "intro", label: "Phase Intro" },
                  {
                    type: "object",
                    name: "steps",
                    label: "Steps (Decide / Act / Measure / Prove)",
                    list: true,
                    ui: { itemProps: (item) => ({ label: item?.title }) },
                    fields: [
                      { type: "string", name: "title", label: "Step Title" },
                      { type: "string", name: "body", label: "Step Body", ui: { component: "textarea" } },
                    ],
                  },
                ],
              },
              { type: "string", name: "outcomes_label", label: "Outcomes Label" },
              { type: "string", name: "outcomes", label: "Outcome Items", list: true },
            ],
          },

          // ── Differentiators ───────────────────────────────────────────────
          {
            type: "object",
            name: "differentiators",
            label: "Why Toolproof (Three Differentiators)",
            fields: [
              { type: "string", name: "section_label", label: "Section Label" },
              { type: "string", name: "heading", label: "Heading" },
              {
                type: "object",
                name: "items",
                label: "Items",
                list: true,
                ui: { itemProps: (item) => ({ label: item?.heading }) },
                fields: [
                  { type: "string", name: "heading", label: "Card Heading" },
                  { type: "string", name: "body", label: "Card Body", ui: { component: "textarea" } },
                ],
              },
            ],
          },

          // ── Offers ───────────────────────────────────────────────────────
          {
            type: "object",
            name: "offers",
            label: "Offers / Pricing",
            fields: [
              { type: "string", name: "section_label", label: "Section Label" },
              { type: "string", name: "heading", label: "Heading" },
              { type: "string", name: "intro", label: "Intro" },
              {
                type: "object",
                name: "free_offer",
                label: "Free Offer (Initial Inspection)",
                fields: [
                  { type: "string", name: "label", label: "Badge Label" },
                  { type: "string", name: "heading", label: "Heading" },
                  { type: "string", name: "body", label: "Body", ui: { component: "textarea" } },
                  { type: "string", name: "cta_label", label: "CTA Label" },
                ],
              },
              {
                type: "object",
                name: "core_offers",
                label: "Core Offer Cards",
                list: true,
                ui: { itemProps: (item) => ({ label: item?.heading }) },
                fields: [
                  { type: "string", name: "type_label", label: "Type Badge" },
                  { type: "string", name: "heading", label: "Offer Name" },
                  { type: "string", name: "price", label: "Price" },
                  { type: "string", name: "price_note", label: "Price Note (optional)" },
                  { type: "string", name: "features", label: "Features", list: true },
                  { type: "string", name: "cta_label", label: "CTA Label" },
                  { type: "boolean", name: "featured", label: "Featured (teal border)" },
                ],
              },
              { type: "string", name: "addons", label: "Add-ons Strip Text" },
            ],
          },

          // ── Who It's For ─────────────────────────────────────────────────
          {
            type: "object",
            name: "who_its_for",
            label: "Who It's For",
            fields: [
              { type: "string", name: "section_label", label: "Section Label" },
              { type: "string", name: "heading", label: "Heading" },
              {
                type: "object",
                name: "segments",
                label: "Segments",
                list: true,
                ui: { itemProps: (item) => ({ label: item?.heading }) },
                fields: [
                  { type: "string", name: "heading", label: "Card Heading" },
                  { type: "string", name: "body_1", label: "First Paragraph", ui: { component: "textarea" } },
                  { type: "string", name: "body_2", label: "Second Paragraph", ui: { component: "textarea" } },
                ],
              },
              {
                type: "object",
                name: "testimonials",
                label: "Testimonials",
                list: true,
                fields: [
                  { type: "string", name: "text", label: "Quote Text", ui: { component: "textarea" } },
                  { type: "string", name: "author", label: "Author Name" },
                  { type: "string", name: "business", label: "Business Name" },
                ],
              },
            ],
          },

          // ── Guarantee ────────────────────────────────────────────────────
          {
            type: "object",
            name: "guarantee",
            label: "Guarantee Section",
            fields: [
              { type: "string", name: "section_label", label: "Section Label" },
              { type: "string", name: "heading", label: "Heading" },
              { type: "string", name: "body", label: "Guarantee Text", ui: { component: "textarea" } },
              { type: "string", name: "footnote", label: "Footnote" },
              { type: "string", name: "cta_label", label: "CTA Label" },
            ],
          },

          // ── About ────────────────────────────────────────────────────────
          {
            type: "object",
            name: "about",
            label: "About Section",
            fields: [
              { type: "string", name: "section_label", label: "Section Label" },
              { type: "string", name: "heading", label: "Heading" },
              { type: "string", name: "bio_1", label: "Bio Paragraph 1", ui: { component: "textarea" } },
              { type: "string", name: "bio_2", label: "Bio Paragraph 2", ui: { component: "textarea" } },
              { type: "string", name: "bio_3", label: "Bio Paragraph 3", ui: { component: "textarea" } },
              { type: "string", name: "footnote", label: "Footnote" },
              { type: "string", name: "how_we_work_heading", label: "How We Work Heading" },
              { type: "string", name: "how_we_work", label: "How We Work Items", list: true },
            ],
          },

          // ── FAQ ──────────────────────────────────────────────────────────
          {
            type: "object",
            name: "faq",
            label: "FAQ",
            fields: [
              { type: "string", name: "section_label", label: "Section Label" },
              { type: "string", name: "heading", label: "Heading" },
              {
                type: "object",
                name: "items",
                label: "FAQ Items",
                list: true,
                ui: { itemProps: (item) => ({ label: item?.question }) },
                fields: [
                  { type: "string", name: "question", label: "Question" },
                  { type: "string", name: "answer", label: "Answer", ui: { component: "textarea" } },
                ],
              },
            ],
          },

          // ── Contact ──────────────────────────────────────────────────────
          {
            type: "object",
            name: "contact",
            label: "Contact Section",
            fields: [
              { type: "string", name: "section_label", label: "Section Label" },
              { type: "string", name: "heading", label: "Heading" },
              { type: "string", name: "intro", label: "Intro", ui: { component: "textarea" } },
              { type: "string", name: "calendar_label", label: "Calendar Link Label" },
              { type: "string", name: "calendar_url", label: "Calendar URL" },
              { type: "string", name: "calendar_note", label: "Calendar Note" },
              { type: "string", name: "email_label", label: "Email Link Label" },
              { type: "string", name: "email_address", label: "Email Address" },
              { type: "string", name: "form_name_label", label: "Form: Name Label" },
              { type: "string", name: "form_business_label", label: "Form: Business Label" },
              { type: "string", name: "form_email_label", label: "Form: Email Label" },
              { type: "string", name: "form_phone_label", label: "Form: Phone Label" },
              { type: "string", name: "form_message_label", label: "Form: Message Label" },
              { type: "string", name: "form_message_placeholder", label: "Form: Message Placeholder" },
              { type: "string", name: "form_submit_label", label: "Form: Submit Button" },
              { type: "string", name: "form_thanks_heading", label: "Thank You Heading" },
              { type: "string", name: "form_thanks_body", label: "Thank You Body" },
            ],
          },

          // ── Footer ───────────────────────────────────────────────────────
          {
            type: "object",
            name: "footer",
            label: "Footer",
            fields: [
              { type: "string", name: "abn", label: "ABN" },
              { type: "string", name: "location", label: "Location" },
              { type: "string", name: "tagline", label: "Tagline" },
              { type: "string", name: "copyright_year", label: "Copyright Year" },
            ],
          },
        ],
      },
    ],
  },
});
