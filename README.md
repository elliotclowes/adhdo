# ✦ FocusFlow

A simple, ADHD-friendly todo app designed to prevent overwhelm and keep you focused.

## Features

### Core Philosophy
- **Prevent endless tinkering** – Simple by design, no infinite customisation rabbit holes
- **Daily task limits** – Configurable limits warn you before you overcommit
- **Mobile-first** – Works great on your phone, looks good on desktop too

### Task Management
- **Four priority levels**: Vital, Important, Not Important, Someday
- **Areas** – Group tasks into focus areas (Work, Personal, Health, etc.)
- **Tags** – Label tasks for quick filtering
- **Sub-tasks** – Break down tasks up to 3 levels deep
- **Recurring tasks** – Set tasks to repeat at custom intervals
- **Time blocking** – Schedule tasks with specific times and durations

### Special Modes
- **Zombie Mode** – Low energy day? Get random, easier tasks weighted by due date
- **Sort Page** – Quickly assign unsorted tasks to areas, 5 at a time
- **Schedule View** – Today / 3-Day / Week calendar views

### ADHD-Friendly Features
- **Task limit warnings** – "You already have X tasks. Are you sure?"
- **Planned vs Non-Planned** – Areas show what's time-blocked vs what needs scheduling
- **Time left indicators** – See how long until tasks are due
- **Completion celebrations** – Satisfying star animation when you complete tasks
- **Quick add** – Press `Q` anywhere to add a task

### Notifications
- **Email reminders** – Get notified when tasks are due
- **Daily summary** – Morning email with today's tasks and yesterday's progress

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: Auth.js with magic link (passwordless)
- **Email**: Resend
- **Styling**: Tailwind CSS + Framer Motion
- **State**: Zustand
- **Hosting**: Vercel-ready

## Quick Start

### 1. Clone and install

```bash
git clone <your-repo>
cd focusflow
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Then fill in:

```env
# Database - Get a free PostgreSQL from Neon.tech or Supabase
DATABASE_URL="postgresql://user:password@host:5432/focusflow?sslmode=require"

# Auth.js Secret - Generate with: openssl rand -base64 32
AUTH_SECRET="your-secret-here"

# Your app URL
AUTH_URL="http://localhost:3000"

# Resend API Key - Get from resend.com
RESEND_API_KEY="re_xxxxxxxxxxxx"

# Email sender (verify domain in Resend, or use onboarding@resend.dev for testing)
EMAIL_FROM="FocusFlow <onboarding@resend.dev>"

# Optional: For Vercel Cron (daily email summaries)
CRON_SECRET="your-cron-secret"
```

### 3. Set up the database

```bash
npx prisma generate
npx prisma db push
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with your email.

## Deployment (Vercel)

### 1. Create a PostgreSQL database

**Recommended**: [Neon](https://neon.tech) (generous free tier, instant provisioning)

Alternative: [Supabase](https://supabase.com), [Railway](https://railway.app), or any PostgreSQL provider.

### 2. Set up Resend

1. Sign up at [resend.com](https://resend.com)
2. Get your API key
3. For production, add and verify your domain
4. For testing, use `onboarding@resend.dev` as the sender

### 3. Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_URL` (your Vercel URL, e.g., `https://focusflow.vercel.app`)
   - `RESEND_API_KEY`
   - `EMAIL_FROM`
   - `CRON_SECRET` (for daily email cron job)

4. Deploy!

### 4. Run database migrations

After first deploy:

```bash
npx prisma db push
```

Or use Vercel's build command:
```json
{
  "buildCommand": "prisma generate && prisma db push && next build"
}
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes (auth, cron)
│   ├── areas/             # Area pages
│   ├── completed/         # Completed tasks page
│   ├── login/             # Auth pages
│   ├── schedule/          # Calendar views
│   ├── settings/          # User settings
│   ├── sort/              # Unsorted tasks page
│   ├── tags/              # Tag pages
│   ├── zombie/            # Zombie mode
│   └── page.tsx           # Today (home) page
├── components/            # React components
│   ├── ui/               # Base UI components
│   └── ...               # Feature components
└── lib/
    ├── actions/          # Server actions
    ├── auth.ts           # Auth.js config
    ├── email.ts          # Email templates
    ├── prisma.ts         # Database client
    ├── store.ts          # Zustand state
    ├── types.ts          # TypeScript types
    └── utils.ts          # Utilities
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Q` | Quick add task |

## Customisation

### Task Limits

In Settings, configure:
- **Total daily limit** – Default: 3 tasks per day
- **Per-priority limits** – Optional limits for each priority level

### Areas

Create areas to organise tasks. Each area shows:
- **Planned** – Tasks with date, time, and duration set
- **Non-Planned** – Tasks that need scheduling

### Priority Levels

| Priority | Use For |
|----------|---------|
| Vital | Must be done today, requires full attention |
| Important | Should be done soon |
| Not Important | Can wait, but track it |
| Someday | Future ideas, no pressure |

## Contributing

PRs welcome! This is designed to stay simple, so features should align with the ADHD-friendly philosophy.

## License

MIT

---

Built with 💜 for ADHD minds
