import { redirect } from 'next/navigation'
import { auth, signOut } from '@/lib/auth'
import { getUserSettings } from '@/lib/actions/user'
import { SettingsForm } from '@/components/settings-form'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const settings = await getUserSettings()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Customize your ADHDo experience
        </p>
      </div>

      {/* Account Section */}
      <section className="mb-8">
        <h2 className="text-lg font-medium mb-4">Account</h2>
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{session.user.email}</p>
              <p className="text-sm text-muted-foreground">
                Signed in via magic link
              </p>
            </div>
            <form
              action={async () => {
                'use server'
                await signOut({ redirectTo: '/login' })
              }}
            >
              <Button variant="outline" type="submit" className="gap-2">
                <LogOut className="w-4 h-4" />
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Task Limits Section */}
      <section className="mb-8">
        <h2 className="text-lg font-medium mb-4">Daily Task Limits</h2>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-sm text-muted-foreground mb-4">
            Set limits to prevent overwhelm. You'll get a warning when adding tasks 
            beyond these limits.
          </p>
          <SettingsForm settings={settings} />
        </div>
      </section>

      {/* Notifications Section */}
      <section className="mb-8">
        <h2 className="text-lg font-medium mb-4">Email Notifications</h2>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">
            Daily summary emails are sent at <strong>{settings?.dailySummaryTime || '07:00'}</strong>.
            You can change this time in the settings form above.
          </p>
        </div>
      </section>

      {/* About */}
      <section>
        <h2 className="text-lg font-medium mb-4">About</h2>
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">✦</span>
            <div>
              <p className="font-medium">ADHDo</p>
              <p className="text-sm text-muted-foreground">
                Simple tasks for focused minds
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Built with ADHD minds in mind. Keep it simple, stay focused, 
            get things done.
          </p>
        </div>
      </section>
    </div>
  )
}
