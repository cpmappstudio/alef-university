# Alef University - AI Coding Agent Instructions

## Architecture Overview

This is a **Student Information System (SIS)** built with Next.js 15 App Router + Convex + Clerk, implementing role-based academic management with American grading standards.

### Tech Stack
- **Frontend**: Next.js 15 (App Router + Turbopack), React 19, TailwindCSS, shadcn/ui
- **Backend**: Convex (real-time serverless database, queries/mutations)
- **Auth**: Clerk (RBAC via `publicMetadata.role`: `student`, `professor`, `admin`, `superadmin`)
- **i18n**: next-intl with `[locale]` segment (supports `en`, `es`)

### Data Flow Pattern
```
Server Page (fetchQuery + Clerk token) → Client Component (useQuery for real-time) → Convex Backend
```
Example: `app/[locale]/(shell)/programs/page.tsx` → `components/program/program-management-client.tsx` → `convex/programs.ts`

## Development Commands

```bash
pnpm dev           # Runs frontend (Next.js Turbopack) + backend (Convex) in parallel
pnpm dev:frontend  # Next.js only
pnpm dev:backend   # Convex only
pnpm build         # Production build
```

## Key Conventions

### Route Management
Always use `ROUTES` from `lib/routes.ts` - never hardcode paths:
```typescript
import { ROUTES } from "@/lib/routes";
router.push(ROUTES.programs.details(id).withLocale(locale));
```

### Server/Client Component Pattern
- **Server pages** fetch initial data with Clerk token via `fetchQuery`
- **Client components** marked with `"use client"` re-subscribe with `useQuery` for real-time updates
- Validation/business logic lives in `convex/*.ts`, not in components

### Form State Management
Use helpers from `lib/forms/utils.ts`:
```typescript
const handleChange = createInputChangeHandler(setFormState);
const handleSelect = createSelectChangeHandler(setFormState);
```

### Dialog State
Use `useDialogState` hook for controlled/uncontrolled dialogs:
```typescript
const { open, setOpen } = useDialogState({ initialOpen: false });
```

### Bilingual Fields Pattern
Tables/forms handle language-dependent fields (`nameEs`/`nameEn`, `codeEs`/`codeEn`):
```typescript
const { showSpanishFields, showEnglishFields } = getLocalizedFieldVisibility(language);
```

## File Organization

| Directory | Purpose |
|-----------|---------|
| `app/[locale]/(shell)/` | Protected pages with sidebar layout |
| `app/[locale]/(auth)/` | Public auth pages (sign-in, sign-up) |
| `components/{domain}/` | Domain-specific components (program, course, class, student, professor) |
| `components/ui/` | shadcn/ui primitives + custom table components |
| `components/forms/` | Reusable form sections (localized fields, language selector) |
| `convex/` | Backend: schema, queries, mutations, helpers |
| `lib/{domain}/` | Pure logic: types, utils, validation, export helpers |
| `lib/table/` | Table utilities, filter configs, column helpers |
| `hooks/` | Custom React hooks (useDialogState, useSyncUser, useProgramSelection) |
| `messages/{locale}.json` | Translation files |

## Adding New Features

### New Domain Entity
1. Define schema in `convex/schema.ts` with proper indexes
2. Create queries/mutations in `convex/{entity}.ts` with auth checks
3. Add types in `lib/{entity}/types.ts`, utils in `lib/{entity}/utils.ts`
4. Create columns in `components/{entity}/columns.tsx` using `lib/table/column-helpers.tsx`
5. Build management client following `program-management-client.tsx` pattern
6. Add routes to `ROUTES` and `SIDEBAR_ROUTE_GROUPS` in `lib/routes.ts`
7. Update `ROUTE_RESTRICTIONS` in `lib/rbac.ts` for access control

### New Table
Use `CustomTable` from `components/table/custom-table.tsx` with:
- Column definitions via helpers from `lib/table/column-helpers.tsx`
- Filter configs from `lib/table/filter-configs.ts`
- Export functions from `lib/export/`

## RBAC System

Roles defined in Clerk `publicMetadata.role`. Middleware (`middleware.ts`) + `lib/rbac.ts` enforce access:
- **Restrictions**: `ROUTE_RESTRICTIONS` array maps routes to allowed roles
- **Default paths**: Each role redirects to appropriate home (admin→programs, student→their profile)
- Backend mutations should verify roles via `ctx.auth.getUserIdentity()` and user lookup

## Grading System

American grading: percentage (0-100%) → letter grade (A+ to F) → GPA (4.0 scale). Grade conversion logic lives in `convex/grades.ts`.
