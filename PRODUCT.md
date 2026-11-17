# Product

<!-- impeccable:product-schema 1 -->

## Platform

web (responsive; phone-friendly for both teacher and parents)

## Users

- **Primary: one teacher (the admin).** Runs Islamic classes (Quran, Arabic, Islamic studies) and uses Muhasabah to keep track of who's enrolled, who has paid monthly tuition, who is due soon and who is overdue. Typically checks it around the 1st of the month, when a payment proof comes in, or when a new family registers.
- **Secondary: parents and adult students.** They register through a one-time link from the teacher, then use their own portal to see what's due, upload a payment screenshot, and download receipts. A parent can have several children in one family.

## Product Purpose

A calm tuition tracker for a single teacher. It replaces a notebook, memory or spreadsheet for: who is enrolled in which program and on which days, what each family pays, when they're due, what was collected each month. Success means the teacher can tell at a glance who owes what, confirm a payment in one tap, and trust the monthly numbers; and parents always know what they owe.

## Positioning

Built for one teacher running Islamic classes, not a school-management suite: one billing day, a handful of programs, families who pay the teacher directly. The name, Muhasabah (محاسبة), means self-accounting, taking stock, in the Islamic tradition.

## Operating Context

- Everyone is billed on the **1st of every month**. A student who joins mid-month has the leftover days of that month (prorated by day) added to their first 1st-of-month bill.
- Programs have days, a time, a location and a monthly price. A program can let families choose fewer days a week (e.g. 2 of a Mon–Thu class); the price is prorated from the full price. Tuition can be set to a custom rate with a reason (financial aid, sibling discount).
- **Registration:** the teacher makes a one-time link. A parent registers one or more children, which forms a family; or an adult registers themselves, which stays an individual student (no family), picking a program, days and start date. The teacher approves or declines.
- **Payments:** the app never handles money. Families pay the teacher directly (Zelle, cash, etc.) and upload a screenshot as proof. The teacher confirms it (records the payment and moves the due date) or marks it not accepted with a reason. Every payment, cash included, starts as a submission from the family (a screenshot for transfers; for cash or check the image is optional). The teacher never records a payment directly; "Record payment" only opens the family's submissions to confirm or reject.
- **Payment reminders:** one tap opens WhatsApp, a text or an email with a polite message already written; optional automatic emails before and after the 1st.
- **Receipts:** every payment gets a numbered receipt (MUH-00001) to print, save or email.
- **Students:** a spreadsheet-style table of every student (or every family) with contact details, programs, tuition, status, amounts due and paid, and portal access. Sortable, searchable, filterable, and downloadable as CSV for Excel. Family detail pages hang off it.
- **Revenue reports:** expected vs. collected per month, down to each payment, with the ability to reset a month's payments.

## Capabilities and Constraints

- React Router 7 (framework mode) with PostgreSQL (Neon) via Prisma, deployed on Netlify, plus a scheduled function for daily reminders.
- Two roles: TEACHER (full access) and MEMBER (parent/student portal, limited to their own family).
- English and Arabic, with Arabic laid out right to left (Arabic dates and surah names).
- Light and dark themes; the theme and language toggles are on every page, including sign-in.
- Gregorian dates only (Umm al-Qura is used just to detect Ramadan and Eid); greetings on Fridays, in Ramadan and on Eid.
- Currency is USD.

## Brand Commitments

- Name: **Muhasabah**, shown with its Arabic **محاسبة** (Amiri).
- Faith-centered and minimal: the dashboard opens with today's date as its heading ("Tuesday — 17 November 2026", no commas); "Assalamu alaikum" on sign-in and the parent portal; the eight-point star (khatam) as the recurring ornament. No ayah cards.
- Palette: Madinah green and gold on warm ivory. Light app shell (white sidebar with a hairline edge, quiet bordered cards), deep Madinah green panels for sign-in, registration and portal headers, gold for the one warm accent card and ornaments, green for actions. Type: Inter for the interface, Tajawal for Arabic interface text, Amiri for display Arabic.
- Layout reference: a calm, light productivity dashboard (big highlighted greeting with a gray second line, small labelled cards, compact lists with status pills).
- Motion is calm and brief (things settle in; nothing bounces) and fully off when the viewer prefers reduced motion.
- Any Quranic or Arabic religious text must be exact.

## Evidence on Hand

No testimonials, logos, or photography exist. Don't invent student names, figures or claims in UI copy. Screenshots use made-up test data.

## Product Principles

1. At a glance, money owed is unmistakable: overdue, due soon, and on track must never be confused.
2. Recording a payment or approving a registration should take seconds, not a form-filling session.
3. Numbers are explained, not just shown: when the app computes an amount (like a prorated first bill), it shows how.
4. Respectful and calm: a ledger kept with care, not a collections tool. Islamic touches stay minimal and add warmth, never clutter, and never push the money picture down the page.

## Naming

Feature and section names are plain, standard terms a school office would use: Registration, Students, Payments, Reminders, Revenue Reports. Overdue / Due this week / Upcoming for payment status everywhere (never "Paid" for a bill that isn't paid). Avoid casual or made-up phrases ("Paid up", "Needs attention", "Your links").

Navigation order: Dashboard, Programs, Registration, Students, Payments, Reminders, Revenue Reports.
