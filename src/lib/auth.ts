import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Resend from 'next-auth/providers/resend'
import prisma from '@/lib/prisma'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({
      from: process.env.EMAIL_FROM || 'FocusFlow <onboarding@resend.dev>',
    }),
  ],
  pages: {
    signIn: '/login',
    verifyRequest: '/verify',
    error: '/login',
  },
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),
  },
  events: {
    createUser: async ({ user }) => {
      // Create default "Inbox" area for new users
      if (user.id) {
        await prisma.area.create({
          data: {
            name: 'Inbox',
            color: '#6366f1',
            userId: user.id,
            order: 0,
          },
        })
      }
    },
  },
})
