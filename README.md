# Welcome to your Convex + Next.js + Clerk app

This is a [Convex](https://convex.dev/) project created with [`pnpm create convex`](https://www.npmjs.com/package/create-convex).

After the initial setup (<2 minutes) you'll have a working full-stack app using:

- Convex as your backend (database, server logic)
- [React](https://react.dev/) as your frontend (web page interactivity)
- [Next.js](https://nextjs.org/) for optimized web hosting and page routing
- [Tailwind](https://tailwindcss.com/) for building great looking accessible UI
- [Clerk](https://clerk.com/) for authentication

## Get started

If you just cloned this codebase and didn't use `pnpm create convex`, run:

```
pnpm install
pnpm dev
```

If you're reading this README on GitHub and want to use this template, run:

```
pnpm dlx create-convex@latest -t nextjs-clerk
```

Then:

1. Open your app. There should be a "Claim your application" button from Clerk in the bottom right of your app.
2. Follow the steps to claim your application and link it to this app.
3. Follow step 3 in the [Convex Clerk onboarding guide](https://docs.convex.dev/auth/clerk#get-started) to create a Convex JWT template.
4. Uncomment the Clerk provider in `convex/auth.config.ts`
5. Paste the Issuer URL as `CLERK_JWT_ISSUER_DOMAIN` to your dev deployment environment variable settings on the Convex dashboard (see [docs](https://docs.convex.dev/auth/clerk#configuring-dev-and-prod-instances))

If you want to sync Clerk user data via webhooks, check out this [example repo](https://github.com/thomasballinger/convex-clerk-users-table/).

## Learn more

To learn more about developing your project with Convex, check out:

- The [Tour of Convex](https://docs.convex.dev/get-started) for a thorough introduction to Convex principles.
- The rest of [Convex docs](https://docs.convex.dev/) to learn about all Convex features.
- [Stack](https://stack.convex.dev/) for in-depth articles on advanced topics.

## Join the community

Join thousands of developers building full-stack apps with Convex:

- Join the [Convex Discord community](https://convex.dev/community) to get help in real-time.
- Follow [Convex on GitHub](https://github.com/get-convex/), star and contribute to the open-source implementation of Convex.

```
alef-university
├─ .cursor
│  └─ rules
│     └─ convex_rules.mdc
├─ .prettierrc
├─ app
│  ├─ globals.css
│  ├─ layout.tsx
│  └─ [locale]
│     ├─ (dashboard)
│     │  ├─ academic
│     │  │  ├─ history
│     │  │  │  └─ page.tsx
│     │  │  ├─ page.tsx
│     │  │  └─ progress
│     │  │     └─ page.tsx
│     │  ├─ admin
│     │  │  ├─ courses
│     │  │  │  └─ page.tsx
│     │  │  ├─ enrollments
│     │  │  │  └─ page.tsx
│     │  │  ├─ page.tsx
│     │  │  ├─ periods
│     │  │  │  └─ page.tsx
│     │  │  ├─ professors
│     │  │  │  └─ page.tsx
│     │  │  ├─ programs
│     │  │  │  └─ page.tsx
│     │  │  ├─ sections
│     │  │  │  └─ page.tsx
│     │  │  ├─ students
│     │  │  │  └─ page.tsx
│     │  │  └─ users
│     │  │     └─ page.tsx
│     │  ├─ docs
│     │  │  ├─ admin
│     │  │  │  ├─ guides
│     │  │  │  │  └─ page.tsx
│     │  │  │  └─ manual
│     │  │  │     └─ page.tsx
│     │  │  ├─ page.tsx
│     │  │  ├─ progress
│     │  │  │  └─ page.tsx
│     │  │  ├─ teaching
│     │  │  │  ├─ grading
│     │  │  │  │  └─ page.tsx
│     │  │  │  └─ resources
│     │  │  │     └─ page.tsx
│     │  │  └─ transcripts
│     │  │     └─ page.tsx
│     │  ├─ layout.tsx
│     │  ├─ page.tsx
│     │  └─ teaching
│     │     ├─ gradebook
│     │     │  └─ page.tsx
│     │     ├─ page.tsx
│     │     └─ progress
│     │        └─ page.tsx
│     ├─ layout.tsx
│     └─ sign-in
│        └─ [[...sign-in]]
│           └─ page.tsx
├─ components
│  ├─ admin
│  │  ├─ columns.tsx
│  │  ├─ course
│  │  │  ├─ course-form-dialog.tsx
│  │  │  └─ course-table.tsx
│  │  ├─ enrollment
│  │  │  ├─ enrollment-form-dialog.tsx
│  │  │  └─ enrollment-table.tsx
│  │  ├─ period
│  │  │  ├─ period-form-dialog.tsx
│  │  │  └─ period-table.tsx
│  │  ├─ professor
│  │  │  ├─ professor-form-dialog.tsx
│  │  │  └─ professor-table.tsx
│  │  ├─ program
│  │  │  ├─ program-form-dialog.tsx
│  │  │  └─ program-table.tsx
│  │  ├─ section
│  │  │  ├─ sections-form-dialog.tsx
│  │  │  └─ sections-table.tsx
│  │  ├─ student
│  │  │  ├─ student-form-dialog.tsx
│  │  │  └─ student-table.tsx
│  │  └─ types.tsx
│  ├─ app-sidebar.tsx
│  ├─ convex-client-provider.tsx
│  ├─ dashboard
│  │  ├─ academic
│  │  │  ├─ credit-distribution-card.tsx
│  │  │  ├─ current-subjects-card.tsx
│  │  │  ├─ dashboard-data.ts
│  │  │  ├─ dashboard-widgets.tsx
│  │  │  ├─ metrics-grid.tsx
│  │  │  ├─ program-info-card.tsx
│  │  │  ├─ quick-actions-card.tsx
│  │  │  └─ upcoming-dates-card.tsx
│  │  ├─ admin
│  │  │  ├─ dashboard-data.ts
│  │  │  ├─ index.ts
│  │  │  ├─ metrics-grid.tsx
│  │  │  ├─ recent-activities-card.tsx
│  │  │  ├─ types.ts
│  │  │  └─ upcoming-deadlines-card.tsx
│  │  ├─ admin-dashboard.tsx
│  │  ├─ professor
│  │  │  ├─ current-sections-card.tsx
│  │  │  ├─ dashboard-data.ts
│  │  │  ├─ index.ts
│  │  │  ├─ metrics-grid.tsx
│  │  │  ├─ types.ts
│  │  │  └─ upcoming-closing-dates-card.tsx
│  │  ├─ professor-dashboard.tsx
│  │  └─ student-dashboard.tsx
│  ├─ dynamic-breadcrumb.tsx
│  ├─ lang-toggle.tsx
│  ├─ mode-toggle.tsx
│  ├─ nav-main.tsx
│  ├─ nav-projects.tsx
│  ├─ nav-user.tsx
│  ├─ professor
│  │  ├─ columns.tsx
│  │  ├─ index.ts
│  │  ├─ section-details-dialog.tsx
│  │  ├─ teaching-history-table.tsx
│  │  └─ types.ts
│  ├─ student
│  │  ├─ academic-history-table.tsx
│  │  ├─ columns.tsx
│  │  ├─ course-details-dialog.tsx
│  │  └─ types.ts
│  ├─ team-switcher.tsx
│  ├─ theme-provider.tsx
│  ├─ ui
│  │  ├─ avatar.tsx
│  │  ├─ badge.tsx
│  │  ├─ breadcrumb.tsx
│  │  ├─ button.tsx
│  │  ├─ card.tsx
│  │  ├─ collapsible.tsx
│  │  ├─ command.tsx
│  │  ├─ data-table.tsx
│  │  ├─ dialog.tsx
│  │  ├─ dropdown-menu.tsx
│  │  ├─ input.tsx
│  │  ├─ label.tsx
│  │  ├─ popover.tsx
│  │  ├─ progress.tsx
│  │  ├─ select.tsx
│  │  ├─ separator.tsx
│  │  ├─ sheet.tsx
│  │  ├─ sidebar.tsx
│  │  ├─ skeleton.tsx
│  │  ├─ table.tsx
│  │  ├─ tabs.tsx
│  │  ├─ textarea.tsx
│  │  └─ tooltip.tsx
│  ├─ university-logo.tsx
│  └─ user-button-wrapper.tsx
├─ components.json
├─ convex
│  ├─ admin.ts
│  ├─ auth.config.ts
│  ├─ auth.ts
│  ├─ courses.ts
│  ├─ dashboard.ts
│  ├─ enrollments.ts
│  ├─ grades.ts
│  ├─ helpers.ts
│  ├─ professors.ts
│  ├─ programs.ts
│  ├─ README.md
│  ├─ reports.ts
│  ├─ schema.ts
│  ├─ students.ts
│  ├─ tsconfig.json
│  ├─ types.ts
│  └─ _generated
│     ├─ api.d.ts
│     ├─ api.js
│     ├─ dataModel.d.ts
│     ├─ server.d.ts
│     └─ server.js
├─ copyfiles.ps1
├─ eslint.config.mjs
├─ hooks
│  └─ use-mobile.ts
├─ i18n
│  ├─ request.ts
│  └─ routing.ts
├─ lib
│  ├─ locale-setup.ts
│  ├─ program-utils.ts
│  ├─ rbac.ts
│  └─ utils.ts
├─ LICENSE
├─ messages
│  ├─ en.json
│  └─ es.json
├─ middleware.ts
├─ next.config.ts
├─ package.json
├─ pnpm-lock.yaml
├─ postcss.config.mjs
├─ public
│  ├─ alef-round.png
│  ├─ alef-transparent.png
│  ├─ alef.ico
│  ├─ alef.png
│  ├─ convex.svg
│  └─ oficial-logo.png
├─ README.md
└─ tsconfig.json

```
