# Muhasabah · محاسبة

A tuition tracker for one teacher running Islamic classes. It tracks who is enrolled, who
has paid, and what is due on the 1st of each month. Parents get a read-only portal.

**Live:** https://muhsabah.netlify.app

## What it does

- **Billing on the 1st.** Students who join mid-month get the rest of that month added to their first bill.
- **Families.** Siblings share one parent contact and one portal view, and can be marked paid together.
- **Reminders.** One tap opens WhatsApp, a text or an email with the message already written. There are also optional automatic emails a few days before and after the 1st.
- **Receipts.** Every payment gets a numbered receipt (MUH-00001) that can be printed, saved as a PDF, or emailed.
- **Quran progress.** Log sabaq, sabqi, manzil and nazra by surah and ayah, with how it went. Parents see it in the portal.
- **Online payments (optional).** Parents can pay by card through Stripe, and the payment is recorded on its own.
- **Revenue.** Expected and collected totals per month.

## Stack

React Router 7 (framework mode) on Vite, Prisma 7 with Postgres (Neon), and Tailwind CSS 4.
It's deployed on Netlify with `@netlify/vite-plugin-react-router`, plus a scheduled
Netlify Function for the daily reminder run.

## Running it locally

```bash
cp .env.example .env    # fill in DATABASE_URL, SESSION_SECRET, APP_URL
npm install
npx prisma migrate deploy
npx tsx scripts/create-teacher.ts   # make your teacher login
npm run dev                          # http://localhost:5173
```

`scripts/reset-password.ts` resets a forgotten password.

## Optional setup

**Email.** Add `RESEND_API_KEY`. Resend's test sender only delivers to your own Resend
address. To reach parents, verify a domain in Resend and set `EMAIL_FROM`. Then turn on
automatic reminders on the Reminders page.

**Stripe.** Add `STRIPE_SECRET_KEY`. In the Stripe dashboard, create a webhook to
`https://<your-site>/api/stripe-webhook` for the `checkout.session.completed` event, and add its
signing secret as `STRIPE_WEBHOOK_SECRET`. The **Pay online** button then appears in the portal.
