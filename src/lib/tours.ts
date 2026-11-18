import type { TourStep } from "@/components/Tour";

export const TEACHER_TOUR_KEY = "muhasabah-tour-teacher";
export const PARENT_TOUR_KEY = "muhasabah-tour-parent";

export const TEACHER_TOUR: TourStep[] = [
  {
    path: "/",
    title: "Welcome to Muhasabah",
    body: "This short tour walks you through running your class here: setting up programs, registering students, and keeping track of tuition. It takes about two minutes. Use the arrow keys or the buttons to move along.",
  },
  {
    path: "/",
    target: "today",
    title: "Today's date",
    body: "Every due date in the app reads against today. Everyone is billed on the 1st of each month, so you can see at a glance how close the next billing day is.",
  },
  {
    path: "/",
    target: "todo",
    title: "To Do",
    body: "The day's jobs, most important first: payments sent to you to check, new registrations to approve, and students to remind. Tap one to go straight there. When nothing needs you, it says you're all caught up.",
  },
  {
    path: "/",
    target: "ledger",
    title: "This month's money",
    body: "What families have paid this month against what was expected, with the bar filling as payments come in. Below it, how many students are overdue, due this week, or upcoming.",
  },
  {
    path: "/",
    target: "students-list",
    title: "Your students",
    body: "Everyone in your class, most urgent first. Open Record payment to review what a parent or student submitted, or Remind to send a polite message on WhatsApp, text or email.",
  },
  {
    path: "/programs",
    target: "add-program",
    title: "Step 1: add your programs",
    body: "Start here. Add each class with its days, time, place and monthly price. You can let families choose fewer days a week, and the price adjusts for them. Programs can be edited any time.",
  },
  {
    path: "/signups",
    target: "create-link",
    title: "Step 2: invite students",
    body: "Create a one-time registration link and send it on WhatsApp or by text. A parent registers their children, or an adult registers themselves, picking a program, days and a start date.",
  },
  {
    path: "/signups",
    target: "pending",
    title: "Step 3: approve registrations",
    body: "New registrations land here. Check the details, adjust the monthly price if you give a discount, then approve. The first bill is worked out for you, including any partial first month.",
  },
  {
    path: "/roster",
    target: "students-table",
    title: "Your students",
    body: "A spreadsheet of everyone, with each student's parent and contact details. Sort any column, search, filter by status, open Upcoming for a calendar of the month, or download it for Excel. Click a name to open that student.",
  },
  {
    path: "/payments",
    target: "to-confirm",
    title: "Payment review",
    body: "Parents and students pay you directly, by Zelle, cash or any other way, and submit each payment from their portal. Check it against what you received, then confirm it or say why it wasn't accepted. The app never handles money.",
  },
  {
    path: "/reminders",
    target: "remind",
    title: "Reminders",
    body: "Anyone due this week or late shows up here. One tap opens a polite reminder, already written, on WhatsApp, text or email. You can also turn on automatic email reminders around the 1st.",
  },
  {
    path: "/reports",
    target: "reports-table",
    title: "Revenue reports",
    body: "Collected against expected for the last 12 months. Hover over a month for its numbers, or click it to see every payment. Below: who still owes this month, tuition by program, and a download of the year's payments.",
  },
  {
    target: "language",
    title: "Text size, Arabic and dark mode",
    body: "AA makes the text bigger or smaller, ع switches the whole app to Arabic, laid out right to left, and the last button switches between light and dark. They're on every page, including for parents, and each person's device remembers their choice.",
  },
  {
    path: "/",
    target: "tour-button",
    title: "You're ready",
    body: "Start by adding your first program, then send a registration link. You can replay this tour any time from here.",
    cta: { label: "Add my first program", to: "/programs" },
  },
];

export const PARENT_TOUR: TourStep[] = [
  {
    title: "Welcome to your portal",
    body: "This is where you keep up with your class: what's due, your children's class times, and your payments and receipts. Here's a quick look around.",
  },
  {
    target: "due",
    title: "What you owe",
    body: "The amount due now, or your next bill and its date when nothing is due yet. Everyone is billed on the 1st of each month.",
  },
  {
    target: "child",
    title: "Each child",
    body: "Their class days, time and place, their monthly tuition, and every payment you've made, each with a receipt you can open, print or save.",
  },
  {
    target: "pay",
    title: "Submitting a payment",
    body: "After you pay your teacher, by Zelle, cash or any other way, send it here: the amount, how you paid, the date, and a screenshot for transfers. Your teacher confirms it and it appears in your history.",
  },
  {
    target: "language",
    title: "Text size, Arabic and dark mode",
    body: "Make the text bigger with AA, or switch the portal to Arabic or dark mode, any time with these buttons.",
  },
  {
    target: "tour-button",
    title: "That's it",
    body: "You can replay this tour any time from here. JazakAllahu khayran.",
  },
];
