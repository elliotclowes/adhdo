# ADHDo - ADHD-Friendly Todo App

## Project Overview

ADHDo is a todo application designed specifically for ADHD minds. The core philosophy is **preventing overwhelm** through task limits, encouraging time-blocking, and maintaining simplicity to avoid endless tinkering.

**Key Principle**: If a task isn't time-blocked with both a date AND time, it essentially doesn't exist and won't get done. The app actively encourages users to plan when they'll do things, not just what they'll do.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: Auth.js with magic link (passwordless)
- **Email**: Resend
- **Styling**: Tailwind CSS + Framer Motion (animations)
- **State**: Zustand (client-side state management)
- **Hosting**: Vercel
- **Environment**: .env.local for local development

## Core Features

### Task Management
- **Four Priority Levels**:
  - Vital: Must be done today, requires full attention
  - Important: Should be done soon
  - Not Important: Can wait, but tracked
  - Someday: Future ideas, no pressure

- **Areas**: Tasks grouped into focus areas (Work, Personal, Health, etc.)
  - Each Area has a custom emoji (not icons)
  - Areas can require tasks to have date/time or not (Someday doesn't require it)
  - Users can rename Areas and change emojis
  - Default Areas on signup: "Must-dos", "Like-to-dos", "Someday"

- **Tags**: Label tasks for quick filtering
  - Support emojis

- **Sub-tasks**:
  - Only ONE level deep (no sub-sub-tasks)
  - Sub-tasks can have all same metadata as parent tasks (priority, area, tags, date/time, duration)
  - Sub-tasks inherit parent's Area by default but can be different
  - Can be scheduled independently and appear everywhere (Today, Schedule, Zombie Mode, etc.)
  - Visual indication that it's a sub-task with parent task name shown
  - Reorderable within parent task's Edit Task popup
  - Completing parent cascades to incomplete sub-tasks
  - Recurring parents create sub-tasks for next occurrence with shifted dates

- **Recurring Tasks**:
  - Custom intervals
  - Track streaks (must complete on due date to maintain streak)
  - All future instances show in Schedule page
  - When parent task recurs, sub-tasks recur with same metadata

- **Time Blocking**:
  - Tasks require both date AND time to be "planned" (except Someday area)
  - Time picker in 15-minute increments
  - Default duration: 15 minutes
  - Schedule view shows calendar with time blocks

### Special Pages/Modes

- **Today**: Home page showing tasks due today
  - Shows daily streak (visible in sidebar too)
  - Task completion animations with stars

- **Zombie Mode**: Low energy day mode
  - Random, easier tasks weighted by due date
  - Only first sub-task of any parent appears
  - Avoids difficult seeming tasks

- **Sort Page**: Quickly assign unsorted tasks
  - Shows 5 tasks at a time
  - Three sections: "Needs Area and Date/Time", "Needs Date/Time", "Needs Area"
  - Quick date/time assignment with visual indicators of task counts per date
  - Orange/red indicators if date has too many tasks

- **Schedule View**: Today / 3-Day / Week calendar views
  - Shows all planned tasks
  - Visual representation of time blocks
  - Can edit tasks directly from calendar

- **Areas Page**: List all Areas with emoji indicators

- **Tags Page**: Filter tasks by tags

- **Completed Page**: History of completed tasks
  - Completed sub-tasks visible with strike-through

- **Settings**: User preferences and streak tracking
  - Shows "best ever" daily streak

### ADHD-Friendly Features

- **Task Limit Warnings**: 
  - Configurable per-priority and total daily limits
  - "You already have X tasks. Are you sure?" prompts
  - Visual indicators (orange/red dots) when dates are overloaded

- **Planned vs Non-Planned**: 
  - Clear distinction between time-blocked tasks and vague todos
  - Areas show what's scheduled vs needs scheduling

- **Time Left Indicators**: Shows how long until tasks are due

- **Completion Celebrations**: Satisfying star animation when completing tasks

- **Quick Add**: Press `Q` anywhere to add a task

- **Streak Tracking**:
  - Daily streak: Complete all planned tasks for the day
  - Per-task streak: Complete recurring tasks on due date
  - Streak continues if no planned tasks for the day
  - Shows current and "best ever" streaks
  - Fire emoji (🔥) indicates active streak
  - Resets to 0 if any planned task incomplete at midnight (user's timezone)

- **Loading Indicators**: Show loading state when navigating between pages

## Database Schema (Prisma)

Key models:
- User (authentication)
- Todo (tasks)
  - Supports parent/child relationships (parentId field)
  - Priority, Area, Tags, Date, Time, Duration
  - Recurrence settings
  - Streak tracking for recurring tasks
- Area
  - requireDateTime boolean (whether tasks need date/time)
  - emoji field
- Tag
- Streak (daily and per-task tracking)

## UI/UX Principles

### Mobile-First Design
- Site primarily accessed via mobile
- Bottom navigation bar on mobile with: Today, Areas, +, Sort, More
- Responsive design that works well on desktop too
- "Edit Task" popup takes full screen on mobile (feels "solid")

### Edit Task Popup
- Desktop: Split layout
  - Left: Title, Description, Sub-tasks
  - Right: Priority, Area, Tags, Date, Time, Duration, Delete, Cancel, Save
- Mobile: Full-screen, vertical layout
- Title and sub-task titles wrap to multiple lines if long
- Description supports Markdown:
  - Links (colored, underlined, open in new tab)
  - Bullet points (proper left alignment)
  - Paragraphs with spacing
- Read mode for description (rendered Markdown), click to edit
- Cannot save without Time if Date is selected
- Time picker defaults to 00:00 (user must select)
- Completion circle (colored by priority) at top left
- Sub-tasks listed compactly with:
  - Completion circle (left)
  - Title
  - Icon if has description
  - Reorder handle (right)
  - Strike-through when completed
- Parent task indicator shown on sub-tasks (below title)

### Design Details
- No excessive formatting (avoid over-using bold, headers, lists)
- Fast load times are CRITICAL
- Simple by design - no infinite customization rabbit holes
- Consistent emoji usage (built-in system emojis only)
- Visual feedback for all actions
- Clear error messages and warnings

## Important Logic & Constraints

### Sub-tasks
1. Only one level deep (no nesting beyond parent → child)
2. Clicking parent task name above sub-task opens parent's Edit Task
3. Can be scheduled on or before parent (makes sense for workflow)
4. First sub-task can appear in Zombie Mode
5. Area inheritance: If sub-task has same Area as parent and parent's Area changes, sub-task Area changes too. If different Areas, sub-task stays independent.
6. Reorderable via drag handle on right side

### Recurring Tasks & Streaks
1. Recurring task streak only maintained if completed on due date (not early/late)
2. If task edited from recurring to non-recurring, keep streak in DB (in case user changes back)
3. Next occurrence includes all sub-tasks with shifted dates (+offset from parent)

### Daily Streaks
1. Only planned tasks (with date/time) count
2. Based on user's timezone
3. No planned tasks = streak stays same
4. Completing all planned tasks = streak increments by 1
5. Any incomplete planned task at midnight = streak resets to 0
6. Must-dos/Like-to-dos without date/time don't affect streak

### Time Blocking Requirements
1. Tasks need BOTH date and time to be "planned" (except Someday area)
2. Cannot save task with date but no time
3. Time picker: 15-minute increments only (00, 15, 30, 45)
4. Default duration: 15 minutes
5. Show warning if trying to assign task to overloaded date

## Known Issues & Future Features

From user's feature list:
- [ ] Improve star animation when completing tasks
- [ ] Improve sub-task dropdown linking in lists
- [ ] Feature: archiving Areas
- [ ] Special page/animation for completing all Today's tasks
- [ ] Feature: "pick a date/time for me" (AI suggestion)
- [ ] Focus points section on Today page
- [ ] Focus mode (just Title and Description)
- [ ] Simplify task cards on Today (no tags, Areas, etc.)
- [ ] Email notifications
- [ ] Lock mode with countdown/Pomodoro timer
- [ ] Default tags for new users (Quick, High Energy, Errand, Home, Digital)
- [ ] Click on calendar to add task
- [ ] Drag tasks in calendar to change time/duration
- [ ] Welcome page for first-time login
- [ ] Change order of Areas
- [ ] Set up selection of starter tasks for new users
- [ ] Calendar view link on Today page
- [ ] Search functionality
- [ ] Support attachments
- [ ] Habit support (separate from normal tasks)
- [ ] Improve visual hierarchy
- [ ] Point system for gamification
- [ ] Warning before Zombie mode page
- [ ] Make next due task more prominent and always visible
- [ ] Auto-save after each edit
- [ ] More emoji choices for Areas
- [ ] Emoji support for Tags
- [ ] Fix: Calendar view of Schedule doesn't show middle of night
- [ ] Consider Prisma Accelerate for speed
- [ ] Overdue tasks more visually uncomfortable
- [ ] Bug: recurring task with no date/time
- [ ] Routines/Habits separate structure
- [ ] Long task titles on mobile not showing Priority

## Development Notes

### Coding Conventions
- Use Server Actions for all database operations
- TypeScript throughout
- Zustand for client state that needs to persist across navigation
- Component composition (small, focused components)
- Mobile-first responsive design
- Prioritize speed and performance
- Clear error handling and user feedback
- Use Next.js App Router features (layouts, loading, error boundaries)

### When Making Changes
1. **Think about mobile first** - this is primarily a mobile app
2. **Consider speed** - fast load times are critical
3. **Be careful with state** - use Zustand for shared state across navigation
4. **Test streaks logic** - complex timezone and completion logic
5. **Verify sub-task relationships** - many edge cases with parent/child logic
6. **Check responsive design** - test both mobile and desktop views
7. **Validate data constraints** - tasks need date AND time (except Someday)

### Common Patterns
- **Optimistic UI updates**: Update UI immediately, sync with DB
- **Server Actions**: All database operations go through actions in lib/actions/
- **Modal state**: Use Zustand for managing open/closed state of Edit Task popup
- **Date/time handling**: Always consider user's timezone
- **Streak calculation**: Should run as cron job or batch process per timezone

## Quick Reference

**Keyboard Shortcuts**: `Q` = Quick add task

**Environment Variables** (in .env.local):
- DATABASE_URL (PostgreSQL)
- AUTH_SECRET
- AUTH_URL
- RESEND_API_KEY
- EMAIL_FROM
- CRON_SECRET (optional, for Vercel Cron)

**Default Task Limits**:
- Total daily: 3 tasks
- Per-priority: Optional

**Time Picker**: 15-minute increments (00, 15, 30, 45)

**Default Duration**: 15 minutes

**Streak Rules**:
- Daily: Complete all planned tasks by midnight
- Recurring: Complete on due date only
- No planned tasks = streak unchanged
