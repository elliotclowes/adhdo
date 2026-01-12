# Streak Tracking Feature

## Overview
This feature implements daily streak tracking and recurring task streak tracking to motivate users to complete their scheduled tasks.

## Features Implemented

### 1. Daily Streak
- Tracks consecutive days where ALL scheduled tasks (with date/time) are completed
- If no tasks are scheduled for a day, streak stays the same
- Resets to 0 if any scheduled task remains incomplete at midnight
- Sub-tasks with scheduled dates count independently from their parents
- Displayed in:
  - Sidebar navigation (when streak > 0)
  - Today page (as a stat card with 🔥 emoji)
  - Settings page (current + longest streak)

### 2. Recurring Task Streaks
- Each recurring task has its own streak
- Increments when completed on the due date (in user's timezone)
- Resets to 0 if not completed by midnight on the due date
- Completing early or late doesn't count toward streak
- Tracked even if task is changed from recurring to non-recurring (preserved in database)
- Displayed in:
  - Task cards (🔥 emoji with number next to "Repeating")
  - Edit Task modal (shows current streak and best streak)

## Database Changes

### User Model
```prisma
currentStreak: Int @default(0)           // Current daily streak
longestStreak: Int @default(0)           // Best ever daily streak
lastStreakCheckDate: DateTime?           // Last date we checked for completion
```

### Todo Model
```prisma
recurringStreak: Int @default(0)                 // Current streak for recurring task
longestRecurringStreak: Int @default(0)          // Best ever streak for recurring task
lastRecurringCompletionDate: DateTime?           // When last completed on-time
```

## Cron Job
- Runs every 15 minutes: `/api/cron/check-streaks`
- Processes users whose local time is within 7 minutes of midnight
- Checks yesterday's tasks for completion
- Updates daily streaks
- Resets recurring task streaks for missed tasks
- Configured in `vercel.json`

## Setup Instructions

1. **Apply Database Migration**
   ```bash
   npx prisma db push
   # or
   npx prisma migrate deploy
   ```

2. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

3. **Set CRON_SECRET**
   Add to your `.env` file (if not already present):
   ```
   CRON_SECRET="your-secret-here"
   ```

4. **Deploy to Vercel**
   The cron job will automatically be configured via `vercel.json`

## How It Works

### Daily Streak Logic
1. At midnight (user's timezone), cron job runs
2. Finds all tasks scheduled for yesterday with date/time
3. Checks if ALL were completed
4. If yes → increment streak (and update longest if needed)
5. If no → reset to 0
6. If none scheduled → no change

### Recurring Task Streak Logic
1. When recurring task is completed → check if completion date = scheduled date
2. If yes → increment streak
3. At midnight → check for any recurring tasks due yesterday that weren't completed
4. Reset those tasks' streaks to 0

### Timezone Handling
- Uses user's timezone from settings
- All date comparisons done in user's local time
- Midnight check happens in each user's timezone

## Files Modified/Created

### New Files
- `/src/lib/actions/streaks.ts` - Streak calculation logic
- `/src/app/api/cron/check-streaks/route.ts` - Cron job endpoint
- `/prisma/migrations/[timestamp]_add_streak_tracking/migration.sql` - Database migration

### Modified Files
- `/prisma/schema.prisma` - Added streak fields
- `/src/lib/actions/todos.ts` - Added streak update on completion
- `/src/app/layout.tsx` - Pass streak to navigation
- `/src/components/navigation.tsx` - Display daily streak
- `/src/app/page.tsx` - Display daily streak on Today page
- `/src/components/task-card.tsx` - Display recurring streak
- `/src/components/add-task-modal.tsx` - Display recurring streak in modal
- `/src/app/settings/page.tsx` - Display streak stats
- `/src/lib/actions/user.ts` - Include streak in user settings
- `/vercel.json` - Added cron job configuration
- `/package.json` - Added date-fns-tz dependency

## Testing Locally

Since the cron job requires Vercel, you can test the logic locally by calling the functions directly:

```typescript
import { checkDailyStreak, checkRecurringStreaks } from '@/lib/actions/streaks'

// Test for a specific user and date
await checkDailyStreak('user-id', new Date())
await checkRecurringStreaks('user-id', new Date())
```

## Notes

- Streaks are motivational, not punitive
- Missing a day resets the streak but doesn't penalize the user
- Longest streaks are preserved to show progress over time
- Non-scheduled tasks don't affect streaks (only tasks with date/time)
