import { Mail } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm text-center">
        {/* Logo */}
        <div className="mb-8">
          <span className="text-5xl">✦</span>
          <h1 className="text-2xl font-semibold mt-4">ADHDo</h1>
        </div>

        {/* Verification Card */}
        <div className="bg-card rounded-2xl border p-6 shadow-sm">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-lg font-medium">Check your email</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            We sent you a magic link to sign in.
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            Click the link in your email to continue.
          </p>
          <Button variant="outline" className="mt-6" asChild>
            <Link href="/login">Back to login</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
