'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    try {
      await signIn('resend', { email, redirect: false })
      setIsSent(true)
    } catch (error) {
      console.error('Login error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-5xl">✦</span>
          <h1 className="text-2xl font-semibold mt-4">FocusFlow</h1>
          <p className="text-muted-foreground mt-2">
            Simple tasks for focused minds
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-card rounded-2xl border p-6 shadow-sm">
          {isSent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-lg font-medium">Check your email</h2>
              <p className="text-muted-foreground mt-2 text-sm">
                We sent a magic link to <strong>{email}</strong>
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                Click the link to sign in
              </p>
              <Button
                variant="ghost"
                className="mt-4"
                onClick={() => {
                  setIsSent(false)
                  setEmail('')
                }}
              >
                Use a different email
              </Button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-medium text-center mb-6">
                Sign in to continue
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !email}
                >
                  {isLoading ? 'Sending...' : 'Continue with Email'}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground text-center mt-4">
                We'll send you a magic link to sign in. No password needed.
              </p>
            </>
          )}
        </div>

        {/* Features */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-2">Built for ADHD minds</p>
          <ul className="space-y-1">
            <li>✓ Daily task limits to prevent overwhelm</li>
            <li>✓ Zombie mode for low-energy days</li>
            <li>✓ Simple, distraction-free interface</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
