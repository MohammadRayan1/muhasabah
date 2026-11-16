# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: one teacher (the admin).** Runs Islamic classes (Quran, Arabic, Islamic studies) and uses Muhasabah to keep track of who has paid monthly tuition, who is due soon and who is overdue. Typically checks it around the 1st of the month and whenever a payment comes in or a new student joins.
- **Secondary: students.** Invited by the teacher by email; they log in to a read-only portal to see their own payment status.

## Product Purpose

A simple tuition tracker for a single teacher. It replaces remembering, notebooks or spreadsheets for: who is enrolled in which program, what each student pays, when they're due, and what was collected each month. Success means the teacher can tell at a glance who owes what, record a payment in one click, and trust the monthly revenue numbers.

## Positioning

Built for one teacher running Islamic classes, not a school-management suite: one billing day, a handful of programs, payments recorded by hand. The name, Muhasabah (محاسبة), means self-accounting, taking stock, in the Islamic tradition.

## Operating Context

- Everyone is billed on the **1st of every month**.
- A student who joins mid-month has their leftover days for that month (prorated by day) added onto their first 1st-of-month bill, on top of the regular monthly amount. Joining exactly on the 1st means a normal monthly bill due that day.
- Programs have days, a time, a location and a monthly price; a student's tuition defaults to the sum of their programs and can be set to a custom rate with a reason (financial aid, sibling discount).
- Payments are recorded by the teacher ("Mark paid"); there is no online payment processing.
- Monthly revenue reports, with the ability to reset a month's payments.

## Capabilities and Constraints

- React Router app with a Postgres (Neon) database, deployed on Netlify.
- Two roles: TEACHER (full access) and MEMBER (student portal, read-only).
- Light and dark themes; a theme toggle is available on every page, including before sign-in.
- Currency is USD.

## Brand Commitments

- Name: **Muhasabah**, shown with its Arabic **محاسبة**.
- Setting is faith-centered (Islamic classes); a warm, welcoming tone fits. The user asked for the sign-in page and dashboard to feel "warm and welcoming".

## Evidence on Hand

No testimonials, logos, or photography exist. Don't invent student names, figures or claims in UI copy.

## Product Principles

1. At a glance, money owed is unmistakable: overdue, due soon, and on track must never be confused.
2. Recording a payment or adding a student should take seconds, not a form-filling session.
3. Numbers are explained, not just shown: when the app computes an amount (like a prorated first bill), it shows how.
4. Respectful and calm: a ledger kept with care, not a collections tool.
