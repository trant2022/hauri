# Phase 1: Foundation + Auth - Research

**Researched:** 2026-03-05
**Domain:** Next.js 15 + Supabase Auth + shadcn/ui Design System + Database Schema
**Confidence:** HIGH (verified against official Supabase docs, shadcn/ui docs, and community patterns)

## Summary

Phase 1 covers project scaffolding (Next.js 15 + Tailwind v4 + shadcn/ui), Supabase database schema with migrations, a complete auth system (registration with username, email verification, password reset, session persistence), a dark-mode-first design system, and a public landing page.

The standard approach uses `@supabase/ssr` with three client tiers (browser, server, admin), middleware for session refresh using `getClaims()`, a `users` table in `public` schema linked to `auth.users` via trigger, PKCE flow for email verification/password reset with a `/auth/confirm` route handler, React Hook Form + Zod for client+server validation, and shadcn/ui with OKLCH CSS variables for the dark theme.

Key findings: (1) Supabase docs now recommend `getClaims()` over `getUser()` in middleware for performance -- it validates JWT locally via JWKS cache instead of hitting the auth server. (2) shadcn/ui fully supports Tailwind v4 with `@theme inline` directive and OKLCH color space. (3) Username should be stored in a separate `public.users` table (not just `user_metadata`) because `auth` schema is not exposed via the auto-generated API and metadata is limited to 16KB. (4) Email verification and password reset both use the PKCE flow with `token_hash` -- requires a `/auth/confirm` route handler that calls `verifyOtp()`.

**Primary recommendation:** Use the Supabase CLI for local development with migration files in `supabase/migrations/`. Set up three route groups `(marketing)`, `(auth)`, `(dashboard)` for layout isolation. Default theme to `dark` (not `system`) since this is dark-mode-first.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.x (latest via `create-next-app@latest`) | Full-stack framework, App Router | Stable Server Actions, React 19, opt-in caching, async `cookies()` |
| React | 19.x (ships with Next.js 15) | UI library | Server Components, `use()`, improved Suspense |
| TypeScript | 5.x (ships with Next.js 15) | Type safety | `"strict": true` in tsconfig |
| @supabase/supabase-js | 2.x (latest) | Supabase client | Core client for DB queries, auth, storage |
| @supabase/ssr | 0.5.x+ (latest) | SSR cookie-based auth | Replaces deprecated `@supabase/auth-helpers-nextjs` |
| Tailwind CSS | v4.x | Utility-first CSS | Ships with `create-next-app`, shadcn/ui fully supports v4 |
| shadcn/ui | latest CLI | Component library | OKLCH theming, Tailwind v4, React 19 ready |
| next-themes | 0.4.x | Theme management | Dark mode toggle, class-based theming |
| React Hook Form | 7.x | Form state management | Uncontrolled components, great performance |
| Zod | 3.x | Schema validation | Shared schemas client+server |
| @hookform/resolvers | latest | Zod-to-RHF bridge | `zodResolver` adapter |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | latest | Toast notifications | shadcn/ui integrates with sonner; every async action shows toast per UX-04 |
| lucide-react | latest | Icons | shadcn/ui default icon library |
| Inter font | via `next/font/google` | Typography | Design system specifies Inter |

### Do NOT Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@supabase/auth-helpers-nextjs` | Deprecated, no updates | `@supabase/ssr` |
| `tailwindcss-animate` | Deprecated for v4 | `tw-animate-css` |
| `getSession()` in server code | Not guaranteed to revalidate token | `getClaims()` (middleware) or `getUser()` (when need full user data) |
| Tailwind v3 config file | v4 uses CSS-based configuration | `@theme inline` directive in CSS |
| `forwardRef` in components | Removed in React 19 / shadcn v4 | Direct ref props |

**Installation:**
```bash
# Project initialization
npx create-next-app@latest unlockt --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Core dependencies
npm install @supabase/supabase-js @supabase/ssr

# UI
npx shadcn@latest init
npm install next-themes sonner

# Forms and validation
npm install react-hook-form zod @hookform/resolvers

# Dev dependencies
npm install -D supabase

# shadcn components needed for Phase 1
npx shadcn@latest add button card input label sonner
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── (marketing)/           # Public pages - landing, etc.
│   │   ├── layout.tsx         # Marketing layout (no auth needed)
│   │   └── page.tsx           # Landing page at /
│   ├── (auth)/                # Auth pages - login, signup, etc.
│   │   ├── layout.tsx         # Auth layout (centered card)
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── forgot-password/page.tsx
│   ├── (dashboard)/           # Protected area
│   │   ├── layout.tsx         # Dashboard layout (sidebar, nav, auth guard)
│   │   └── dashboard/page.tsx # Dashboard shell
│   ├── auth/
│   │   ├── confirm/route.ts   # Email verification callback (PKCE)
│   │   └── callback/route.ts  # OAuth callback (if needed later)
│   ├── layout.tsx             # Root layout (ThemeProvider, Toaster)
│   └── globals.css            # Theme CSS variables
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── theme-provider.tsx     # next-themes provider wrapper
│   └── ...                    # Shared components
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # Browser client (createBrowserClient)
│   │   ├── server.ts          # Server client (createServerClient + cookies)
│   │   ├── admin.ts           # Admin client (service_role, bypasses RLS)
│   │   └── middleware.ts      # updateSession for middleware
│   └── validations/           # Shared Zod schemas
│       └── auth.ts            # Auth form schemas
├── types/
│   └── database.ts            # Generated Supabase types
├── middleware.ts               # Root middleware (session refresh + route protection)
└── supabase/
    ├── migrations/            # SQL migration files
    │   └── 00001_initial_schema.sql
    └── seed.sql               # Test data
```

### Pattern 1: Supabase Client Tiers (THREE clients)

**What:** Three distinct Supabase clients for different contexts.
**When to use:** Always -- never mix these up.

**Browser Client** (`lib/supabase/client.ts`):
```typescript
// Source: Supabase official docs - creating-a-client
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Server Client** (`lib/supabase/server.ts`):
```typescript
// Source: Supabase official docs - server-side/nextjs
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component -- ignore if middleware handles refresh
          }
        },
      },
    }
  )
}
```

**Admin Client** (`lib/supabase/admin.ts`):
```typescript
// For webhooks and admin operations that bypass RLS
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

### Pattern 2: Middleware Session Refresh

**What:** Middleware refreshes the auth token on every request using `getClaims()`.
**When to use:** Always -- this is required for SSR auth to work.

```typescript
// lib/supabase/middleware.ts
// Source: Supabase official docs + getClaims() recommendation
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Use getClaims() for fast JWT validation (no network request)
  // Falls back to getUser() only if you need to verify session is still active
  const { data: { claims }, error } = await supabase.auth.getClaims()

  // Route protection: redirect unauthenticated users away from dashboard
  if (
    !claims &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/signup') &&
    !request.nextUrl.pathname.startsWith('/forgot-password') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    request.nextUrl.pathname.startsWith('/dashboard')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

```typescript
// middleware.ts (root)
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Pattern 3: PKCE Auth Confirm Route Handler

**What:** Handles email verification and password reset callbacks.
**When to use:** Required for email-based auth flows in server-side rendering.

```typescript
// app/auth/confirm/route.ts
// Source: Supabase official docs - password-based auth
import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  const redirectTo = request.nextUrl.clone()
  redirectTo.pathname = next
  redirectTo.searchParams.delete('token_hash')
  redirectTo.searchParams.delete('type')
  redirectTo.searchParams.delete('next')

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(redirectTo)
    }
  }

  // Redirect to error page on failure
  redirectTo.pathname = '/error'
  return NextResponse.redirect(redirectTo)
}
```

### Pattern 4: Username via Public Users Table + Trigger

**What:** Store username in `public.users` table, auto-created on signup via trigger.
**When to use:** Always for custom user fields -- `auth` schema is not exposed in auto-generated API.

```sql
-- Migration: 00001_initial_schema.sql

-- Users table (public schema, linked to auth.users)
create table public.users (
  id uuid not null references auth.users on delete cascade,
  email text not null,
  username text not null unique,
  stripe_account_id text,
  stripe_customer_id text,
  kyc_verified boolean default false,
  created_at timestamptz default now(),
  primary key (id)
);

alter table public.users enable row level security;

-- RLS policies
create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- Trigger to auto-create user row on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id, email, username)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'username'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

**Signup call that passes username:**
```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { username },  // stored in raw_user_meta_data
    emailRedirectTo: `${window.location.origin}/auth/confirm`,
  },
})
```

### Pattern 5: React Hook Form + Zod + Server Actions

**What:** Client-side validation with RHF/Zod, server-side validation with same Zod schema.
**When to use:** All forms (signup, login, password reset).

```typescript
// lib/validations/auth.ts (SHARED schema)
import { z } from 'zod'

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-z0-9_-]+$/, 'Only lowercase letters, numbers, hyphens, underscores'),
})

export type SignupInput = z.infer<typeof signupSchema>

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
```

```typescript
// Form component pattern (e.g., signup form)
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signupSchema, type SignupInput } from '@/lib/validations/auth'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export function SignupForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  })

  async function onSubmit(values: SignupInput) {
    const supabase = createClient()

    // Check username availability first
    const { data: existing } = await supabase
      .from('users')
      .select('username')
      .eq('username', values.username)
      .single()

    if (existing) {
      toast.error('Username already taken')
      return
    }

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { username: values.username },
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    })

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Check your email to verify your account')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Input fields with error display */}
    </form>
  )
}
```

### Pattern 6: Dark-Mode-First Theme Setup

**What:** Custom dark theme with shadcn/ui + Tailwind v4 + next-themes.
**When to use:** Root layout and globals.css.

```css
/* app/globals.css */
@import "tailwindcss";

/* shadcn/ui base styles - tw-animate-css replaces tailwindcss-animate in v4 */
@plugin "tw-animate-css";

/* Custom dark-mode-first theme */
:root {
  /* Dark mode as default (dark-mode-first) */
  --background: oklch(0.04 0 0);         /* #0a0a0a */
  --foreground: oklch(1 0 0);             /* #ffffff */
  --card: oklch(0.07 0 0);               /* #111111 */
  --card-foreground: oklch(1 0 0);        /* #ffffff */
  --popover: oklch(0.07 0 0);            /* #111111 */
  --popover-foreground: oklch(1 0 0);
  --primary: oklch(1 0 0);               /* white buttons */
  --primary-foreground: oklch(0 0 0);     /* black text on white */
  --secondary: oklch(0.13 0 0);          /* #222222-ish */
  --secondary-foreground: oklch(1 0 0);
  --muted: oklch(0.13 0 0);
  --muted-foreground: oklch(0.53 0 0);   /* #888888 */
  --accent: oklch(0.51 0.26 292);        /* #7c3aed purple */
  --accent-foreground: oklch(1 0 0);
  --destructive: oklch(0.58 0.22 27);    /* #ef4444 */
  --destructive-foreground: oklch(1 0 0);
  --border: oklch(0.13 0 0);             /* #222222 */
  --input: oklch(0.20 0 0);              /* #333333 */
  --ring: oklch(1 0 0);                  /* white focus ring */
  --radius: 0.5rem;

  /* Success color (custom) */
  --success: oklch(0.62 0.19 145);       /* #22c55e */
  --success-foreground: oklch(1 0 0);
}

/* Light mode override (optional, since dark-first) */
.light {
  --background: oklch(1 0 0);
  --foreground: oklch(0.04 0 0);
  /* ... light mode values if needed */
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --radius: var(--radius);
}
```

```typescript
// components/theme-provider.tsx
'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

```typescript
// app/layout.tsx
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
```

**Key decision:** `defaultTheme="dark"` and `enableSystem={false}` because this is dark-mode-first. The app defaults to dark. A toggle could switch to light, but the primary experience is dark.

### Anti-Patterns to Avoid

- **Mixing Supabase clients:** Never use the browser client in server components or the admin client where the anon client should be used. Name files clearly (`client.ts`, `server.ts`, `admin.ts`).
- **Using `getSession()` for auth checks in server code:** It reads from storage without validating the JWT. Use `getClaims()` (fast, local JWT validation) or `getUser()` (network call, guaranteed fresh).
- **Storing username only in `user_metadata`:** The `auth` schema is not exposed via the auto-generated Supabase API. Always mirror custom fields in a `public` table.
- **Putting auth logic in Server Actions for signup/login:** Supabase Auth client methods (`signUp`, `signInWithPassword`) run client-side to set cookies properly. Use client-side form submission for auth, not Server Actions.
- **Skipping middleware:** Without middleware, auth tokens expire and server components cannot read valid sessions. Middleware is mandatory for cookie-based auth.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email verification | Custom email sending + token generation | Supabase Auth built-in email verification | Handles token generation, email sending, expiry, rate limiting |
| Password reset | Custom reset token system | `supabase.auth.resetPasswordForEmail()` + PKCE flow | Secure token hashing, email templating, expiry management |
| Session management | Custom JWT + cookie logic | `@supabase/ssr` middleware pattern | Handles token refresh, cookie chunking for large JWTs, cross-tab sync |
| Toast notifications | Custom notification system | sonner (via shadcn/ui) | Accessible, animated, stackable, theme-aware |
| Form validation | Custom validation logic | Zod schemas + `zodResolver` | Type inference, shared client/server schemas, composable |
| Dark mode | Custom theme switching | next-themes `ThemeProvider` | Handles SSR flash prevention, system preference, localStorage sync |
| CSS theme variables | Manual CSS custom properties | shadcn/ui theming system with OKLCH | Consistent component theming, accessible color contrast |
| Database types | Manual TypeScript interfaces | `supabase gen types typescript` | Always in sync with actual schema, includes all tables/views |

**Key insight:** Supabase Auth handles the entire email/password flow including email verification and password reset. The only custom code needed is the `/auth/confirm` route handler and the UI forms.

## Common Pitfalls

### Pitfall 1: Trigger Failure Blocks Signup

**What goes wrong:** The `handle_new_user()` trigger that creates a row in `public.users` fails (e.g., username uniqueness violation), which blocks the entire `auth.users` INSERT and the user cannot sign up.
**Why it happens:** The trigger runs inside the same transaction as the auth signup. If the trigger raises an error, the whole transaction rolls back.
**How to avoid:** Validate username uniqueness BEFORE calling `signUp()`. Do a `select` on `public.users` where `username = input` first. Show the error in the form, not as a 500 from the trigger. Also ensure the trigger function has proper error handling.
**Warning signs:** Users reporting "something went wrong" on signup with no clear error. Rows in `auth.users` without matching `public.users` rows (if trigger is not transactional).

### Pitfall 2: Email Verification Redirect Misconfiguration

**What goes wrong:** User clicks verification link in email and gets a "invalid token" or 404 error.
**Why it happens:** (1) The email template uses `{{ .ConfirmationURL }}` which redirects to Supabase's hosted verify endpoint, but for PKCE flow you need `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`. (2) The Site URL or Redirect URLs are not configured in Supabase dashboard. (3) The `/auth/confirm` route handler is missing or has wrong path.
**How to avoid:** Update email templates in Supabase dashboard to use `token_hash` format. Add `http://localhost:3000` and your production URL to Redirect URLs. Verify the `/auth/confirm` route handler exists and works.
**Warning signs:** Email links point to `supabase.co` domain instead of your app. Users stuck in "unverified" state.

### Pitfall 3: Password Reset Page Requires Authenticated Session

**What goes wrong:** The password reset flow works as: user requests reset -> clicks email link -> lands on reset page -> enters new password -> calls `updateUser({ password })`. But `updateUser` requires an authenticated session. The user clicked a reset link -- are they authenticated?
**Why it happens:** The PKCE flow via `/auth/confirm` with `type=recovery` establishes a session when `verifyOtp` succeeds. The user IS authenticated after the confirm redirect. But if the confirm handler redirects to a page that doesn't check for auth state, or the session cookie wasn't set properly, `updateUser` fails.
**How to avoid:** Ensure the `/auth/confirm` route handler for `type=recovery` redirects to `/reset-password` (or equivalent). That page should be inside a route group that requires auth (or check session on load). The session will be set by the `verifyOtp` call in the confirm handler.
**Warning signs:** "Not authenticated" errors on the reset password page. Users saying "I clicked the link but can't change my password."

### Pitfall 4: Cookie Chunking for Large JWTs

**What goes wrong:** Supabase JWTs can exceed the 4KB cookie size limit (especially with custom claims or lots of metadata). The `@supabase/ssr` package handles this by chunking the token across multiple cookies (`sb-<ref>-auth-token.0`, `sb-<ref>-auth-token.1`, etc.). But if middleware doesn't properly handle all chunks, auth breaks silently.
**Why it happens:** Custom middleware that manually parses cookies instead of using the `@supabase/ssr` cookie helpers.
**How to avoid:** Always use the `getAll()` and `setAll()` pattern from `@supabase/ssr`. Never manually parse or set Supabase auth cookies. The library handles chunking automatically.
**Warning signs:** Auth working on some requests but not others. Intermittent "not authenticated" errors.

### Pitfall 5: `cookies()` is Async in Next.js 15

**What goes wrong:** Code that calls `cookies()` synchronously (the Next.js 14 pattern) throws errors or returns undefined in Next.js 15.
**Why it happens:** Next.js 15 made `cookies()`, `headers()`, `params`, and `searchParams` async. This is a breaking change from Next.js 14.
**How to avoid:** Always `await cookies()` in server code. The server client factory function must be `async`.
**Warning signs:** "Dynamic server usage" errors. `cookies()` returning a Promise object instead of the cookie store.

### Pitfall 6: Username Uniqueness Race Condition

**What goes wrong:** Two users sign up with the same username simultaneously. Both pass the client-side check, both call `signUp()`, both triggers try to insert -- one fails.
**Why it happens:** The uniqueness check (`select` then `insert`) is not atomic.
**How to avoid:** The `UNIQUE` constraint on `public.users.username` is the real enforcement. Handle the trigger failure gracefully. Optionally, use a Supabase `before_user_created` auth hook (if available) to validate username before the auth user is created. At minimum, show a clear error message when signup fails due to username conflict.
**Warning signs:** Intermittent signup failures. Users stuck with auth accounts but no profile.

## Code Examples

### Complete Signup Server Action Alternative

If you want server-side validation in addition to client-side (defense in depth), use this pattern. Note: the actual `signUp` call should happen client-side for proper cookie setting, but you can validate server-side first.

```typescript
// app/(auth)/signup/actions.ts
'use server'

import { signupSchema } from '@/lib/validations/auth'
import { createClient } from '@/lib/supabase/server'

export async function validateSignup(formData: FormData) {
  const parsed = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    username: formData.get('username'),
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  // Check username availability server-side
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('users')
    .select('username')
    .eq('username', parsed.data.username)
    .single()

  if (existing) {
    return { error: { username: ['Username already taken'] } }
  }

  return { success: true }
}
```

### Toast Pattern for Async Actions (UX-04)

```typescript
import { toast } from 'sonner'

// Wrap any async action
async function handleAction() {
  toast.promise(
    async () => {
      const result = await someAsyncAction()
      if (result.error) throw new Error(result.error)
      return result
    },
    {
      loading: 'Processing...',
      success: 'Done!',
      error: (err) => err.message || 'Something went wrong',
    }
  )
}

// Or manual control
async function handleLogin(values: LoginInput) {
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: values.email,
    password: values.password,
  })

  if (error) {
    toast.error(error.message)
    return
  }

  toast.success('Welcome back!')
  router.push('/dashboard')
}
```

### Supabase Email Template Configuration

Update these templates in Supabase Dashboard > Auth > Email Templates:

**Confirm Signup:**
```html
<h2>Confirm your email</h2>
<p>Click the link below to verify your email address:</p>
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard">
  Verify Email
</a>
```

**Reset Password:**
```html
<h2>Reset your password</h2>
<p>Click the link below to reset your password:</p>
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password">
  Reset Password
</a>
```

### Database Migration Setup

```bash
# Initialize Supabase locally
npx supabase init

# Start local Supabase stack
npx supabase start

# Create first migration
npx supabase migration new initial_schema

# After editing the migration SQL file:
npx supabase db reset   # Apply migrations + seed

# Generate TypeScript types
npx supabase gen types typescript --local > src/types/database.ts

# Later: diff dashboard changes into migration
npx supabase db diff --schema public -f <migration_name>

# Deploy to production
npx supabase db push
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 | Complete rewrite of cookie handling |
| `getSession()` in server code | `getClaims()` for JWT validation | 2025 | Faster, no network call, validates signature locally |
| `getUser()` in middleware | `getClaims()` in middleware | 2025 | Eliminates unnecessary auth server calls per request |
| HSL color space in shadcn | OKLCH color space | 2025 | Better perceptual uniformity, wider gamut |
| `tailwindcss-animate` | `tw-animate-css` | 2025 (Tailwind v4) | Plugin deprecated, CSS-only replacement |
| `tailwind.config.ts` | `@theme inline` in CSS | 2025 (Tailwind v4) | No config file needed, CSS-native theming |
| `forwardRef` for components | Direct ref props | 2025 (React 19) | Simplified component APIs |
| `useFormState` | `useActionState` | 2024 (React 19) | Renamed hook for Server Action state |
| Synchronous `cookies()` | `await cookies()` | 2024 (Next.js 15) | Breaking change, all dynamic functions are async |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 2025 | Renamed in newer docs (both still work) |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Do not install, no longer maintained
- `tailwindcss-animate`: Replaced by `tw-animate-css` for Tailwind v4
- `tailwind.config.ts`: Not needed with Tailwind v4 and shadcn/ui -- use CSS `@theme inline`
- `useFormState` from `react-dom`: Renamed to `useActionState` in React 19

## Open Questions

1. **`getClaims()` availability**
   - What we know: Supabase docs recommend it, and it is listed in the JS API reference. It validates JWT locally using JWKS.
   - What's unclear: Whether it is available in the current stable `@supabase/supabase-js` 2.x, or requires a newer release. Some GitHub issues note that framework docs have not been updated yet.
   - Recommendation: Try `getClaims()` first. If not available, fall back to `getUser()` which is the documented middleware pattern.

2. **OKLCH color value accuracy**
   - What we know: shadcn/ui uses OKLCH for theming. The design system specifies hex values (#0a0a0a, #111111, etc.).
   - What's unclear: The exact OKLCH equivalents of the specified hex colors. The values in the code examples above are approximate conversions.
   - Recommendation: Use an OKLCH converter tool to get exact values during implementation. Alternatively, use `hsl()` values which also work with Tailwind v4.

3. **`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` vs `NEXT_PUBLIC_SUPABASE_ANON_KEY`**
   - What we know: Recent Supabase docs reference `PUBLISHABLE_KEY` but older docs and most tutorials use `ANON_KEY`.
   - What's unclear: Whether this is just a rename or a new key type.
   - Recommendation: Use whichever your Supabase project dashboard shows. The anon key should still work. Check dashboard for the correct env var name.

4. **Tailwind v4 + shadcn/ui `tw-animate-css`**
   - What we know: `tailwindcss-animate` is deprecated for v4. shadcn/ui v4 uses `tw-animate-css` instead.
   - What's unclear: Whether `npx shadcn@latest init` automatically sets up `tw-animate-css` or if manual configuration is needed.
   - Recommendation: Run `npx shadcn@latest init` and inspect what it generates. If it uses `tailwindcss-animate`, switch to `tw-animate-css`.

## Sources

### Primary (HIGH confidence)
- [Supabase: Setting up Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) - Complete middleware, server client, and auth flow patterns
- [Supabase: Creating a Client for SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client) - Browser client, server client, cookie handling
- [Supabase: Managing User Data](https://supabase.com/docs/guides/auth/managing-user-data) - Profiles table, trigger, user_metadata
- [Supabase: Password-based Auth](https://supabase.com/docs/guides/auth/passwords) - Signup, email verification, password reset flows
- [Supabase: Auth Signup API Reference](https://supabase.com/docs/reference/javascript/auth-signup) - signUp() function signature and options
- [Supabase: Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates) - Template variables, PKCE token_hash format
- [Supabase: getClaims() API Reference](https://supabase.com/docs/reference/javascript/auth-getclaims) - JWT validation without network call
- [Supabase: Local Development with Migrations](https://supabase.com/docs/guides/local-development/overview) - CLI commands, migration workflow
- [shadcn/ui: Theming](https://ui.shadcn.com/docs/theming) - CSS variables, OKLCH, custom colors
- [shadcn/ui: Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4) - @theme inline, tw-animate-css, data-slot
- [shadcn/ui: Dark Mode for Next.js](https://ui.shadcn.com/docs/dark-mode/next) - ThemeProvider setup
- [shadcn/ui: Next.js Installation](https://ui.shadcn.com/docs/installation/next) - Project setup steps

### Secondary (MEDIUM confidence)
- [Ryan Katayi: Server-Side Auth in Next.js with Supabase](https://www.ryankatayi.com/blog/server-side-auth-in-next-js-with-supabase-my-setup) - updateSession middleware implementation
- [Nehalist: React Hook Form with Server Actions](https://nehalist.io/react-hook-form-with-nextjs-server-actions/) - RHF + Zod + Server Actions pattern
- [GitHub Discussion: getClaims vs getUser](https://github.com/supabase/supabase/issues/40985) - Recommendation to use getClaims in middleware
- [Medium: Mastering Form Handling in Next.js 15](https://medium.com/@sankalpa115/mastering-form-handling-in-next-js-15-with-server-actions-react-hook-form-react-query-and-shadcn-108f6863200f) - useActionState integration

### Tertiary (LOW confidence)
- OKLCH color conversions from hex values -- approximate, need verification with converter tool
- `tw-animate-css` automatic setup via shadcn CLI -- needs verification during init

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified against official docs and known compatibility
- Architecture (client tiers, middleware): HIGH - Official Supabase docs provide exact patterns
- Auth flows (signup, verify, reset): HIGH - Official Supabase password auth docs with PKCE
- Database schema + triggers: HIGH - Official managing user data docs
- Theme/design system: HIGH for shadcn/ui pattern, MEDIUM for exact OKLCH color values
- Pitfalls: MEDIUM - Based on community patterns and docs, some edge cases need runtime verification

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (30 days -- stable ecosystem, major versions unlikely to change)
