import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Resend from 'next-auth/providers/resend'
import prisma from '@/lib/prisma'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({
      from: process.env.EMAIL_FROM || 'ADHDo <onboarding@resend.dev>',
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
      // Create default areas for new users
      if (user.id) {
        await prisma.area.createMany({
          data: [
            {
              name: 'Must-dos',
              color: '#ef4444', // red
              icon: '🔥',
              userId: user.id,
              order: 0,
              requiresScheduling: true,
            },
            {
              name: 'Like-to-dos',
              color: '#6366f1', // indigo
              icon: '💜',
              userId: user.id,
              order: 1,
              requiresScheduling: true,
            },
            {
              name: 'Someday',
              color: '#94a3b8', // slate
              icon: '💭',
              userId: user.id,
              order: 2,
              requiresScheduling: false, // Someday tasks don't need scheduling
            },
          ],
        })
      }
    },
  },
})
