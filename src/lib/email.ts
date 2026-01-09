import { Resend } from 'resend'
import prisma from '@/lib/prisma'
import { formatDuration, getPriorityLabel } from '@/lib/utils'

const resend = new Resend(process.env.RESEND_API_KEY)

interface TodoForEmail {
  id: string
  title: string
  description: string | null
  priority: number
  scheduledDate: Date | null
  duration: number | null
}

export async function sendTaskReminder(
  email: string,
  todo: TodoForEmail
) {
  const priorityLabel = getPriorityLabel(todo.priority)
  const durationText = todo.duration ? formatDuration(todo.duration) : null

  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'ADHDo <onboarding@resend.dev>',
    to: email,
    subject: `⏰ Reminder: ${todo.title}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a2e; }
            .container { max-width: 500px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: 700; color: #6366f1; }
            .task-card { background: #f8fafc; border-radius: 12px; padding: 20px; border-left: 4px solid #6366f1; }
            .task-title { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
            .task-meta { color: #64748b; font-size: 14px; }
            .priority-badge { display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 500; }
            .vital { background: #fef2f2; color: #dc2626; }
            .important { background: #fffbeb; color: #d97706; }
            .normal { background: #eef2ff; color: #4f46e5; }
            .someday { background: #f1f5f9; color: #64748b; }
            .footer { margin-top: 30px; text-align: center; color: #94a3b8; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">✦ ADHDo</div>
            </div>
            <p>Hey! Just a quick reminder about this task:</p>
            <div class="task-card">
              <div class="task-title">${todo.title}</div>
              ${todo.description ? `<p style="color: #64748b; margin: 8px 0;">${todo.description}</p>` : ''}
              <div class="task-meta">
                <span class="priority-badge ${priorityLabel.toLowerCase().replace(' ', '-')}">${priorityLabel}</span>
                ${durationText ? `<span style="margin-left: 8px;">⏱ ${durationText}</span>` : ''}
              </div>
            </div>
            <p style="margin-top: 20px;">You've got this! 💪</p>
            <div class="footer">
              <p>ADHDo – Simple tasks for focused minds</p>
            </div>
          </div>
        </body>
      </html>
    `,
  })
}

export async function sendDailySummary(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  })

  if (!user?.email) return

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const [todayTodos, completedYesterday, addedYesterday] = await Promise.all([
    prisma.todo.findMany({
      where: {
        userId,
        isCompleted: false,
        parentId: null,
        scheduledDate: { gte: today, lt: tomorrow },
      },
      orderBy: [{ priority: 'asc' }, { scheduledDate: 'asc' }],
    }),
    prisma.todo.findMany({
      where: {
        userId,
        isCompleted: true,
        completedAt: { gte: yesterday, lt: today },
      },
    }),
    prisma.todo.findMany({
      where: {
        userId,
        createdAt: { gte: yesterday, lt: today },
      },
    }),
  ])

  const greeting = user.name ? `Hi ${user.name.split(' ')[0]}!` : 'Hi!'

  type SimpleTodo = { 
    title: string
    scheduledDate: Date | null 
  }

  const todoListHtml = (todos: SimpleTodo[]) =>
    todos.length === 0
      ? '<p style="color: #94a3b8; font-style: italic;">None</p>'
      : `<ul style="list-style: none; padding: 0;">${todos
          .map(
            (t: SimpleTodo) =>
              `<li style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="font-weight: 500;">${t.title}</span>
                ${t.scheduledDate ? `<span style="color: #64748b; font-size: 12px; margin-left: 8px;">${new Date(t.scheduledDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>` : ''}
              </li>`
          )
          .join('')}</ul>`

  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'ADHDo <onboarding@resend.dev>',
    to: user.email,
    subject: `📋 Your tasks for ${today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a2e; }
            .container { max-width: 500px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: 700; color: #6366f1; }
            .section { margin-bottom: 24px; }
            .section-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #334155; }
            .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
            .stat-card { background: #f8fafc; border-radius: 8px; padding: 12px; text-align: center; }
            .stat-number { font-size: 24px; font-weight: 700; color: #6366f1; }
            .stat-label { font-size: 12px; color: #64748b; }
            .footer { margin-top: 30px; text-align: center; color: #94a3b8; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">✦ ADHDo</div>
            </div>
            
            <p>${greeting}</p>
            <p>Here's your daily overview:</p>
            
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-number">${todayTodos.length}</div>
                <div class="stat-label">Tasks Today</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${completedYesterday.length}</div>
                <div class="stat-label">Done Yesterday</div>
              </div>
            </div>
            
            <div class="section">
              <div class="section-title">📅 Today's Tasks</div>
              ${todoListHtml(todayTodos)}
            </div>
            
            ${completedYesterday.length > 0 ? `
            <div class="section">
              <div class="section-title">✅ Completed Yesterday</div>
              ${todoListHtml(completedYesterday)}
            </div>
            ` : ''}
            
            ${addedYesterday.length > 0 ? `
            <div class="section">
              <div class="section-title">➕ Added Yesterday</div>
              ${todoListHtml(addedYesterday)}
            </div>
            ` : ''}
            
            <p style="margin-top: 20px;">Have a productive day! 🌟</p>
            
            <div class="footer">
              <p>ADHDo – Simple tasks for focused minds</p>
            </div>
          </div>
        </body>
      </html>
    `,
  })
}
