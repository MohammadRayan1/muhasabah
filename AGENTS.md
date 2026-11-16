# Notes for coding agents

- React Router 7 in framework mode. The app directory is `src/` (see `react-router.config.ts`), and routes are listed in `src/routes.ts`.
- Server-only code lives in `*.server.ts` files. Teacher loaders and actions must call `requireTeacher(request)`, and portal or receipt code must check `visibleStudentIds`.
- Forms post to route actions with an `intent` field. Shared mutations are in `src/lib/mutations.server.ts`.
- Prisma 7 with the `prisma-client` generator outputs to `src/generated/prisma` (gitignored). After schema changes, add a migration under `prisma/migrations`.
- Dates are calendar days stored at server midnight (UTC in production). Format them with `formatDate`, which uses UTC.
- Check work with `npm run typecheck`, `npm run lint` and `npm run build`.
