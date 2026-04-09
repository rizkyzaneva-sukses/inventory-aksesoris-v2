import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: { email: { type: 'email' }, password: { type: 'password' } },
      async authorize(credentials) {
        console.log("🔒 Login attempt for:", credentials?.email)
        if (!credentials?.email || !credentials?.password) {
          console.log("❌ Missing email or password")
          return null
        }
        
        try {
          const user = await prisma.user.findUnique({ where: { email: credentials.email } })
          if (!user) {
            console.log("❌ User not found in DB")
            return null
          }
          if (!user.isActive) {
            console.log("❌ User is inactive")
            return null
          }
          const ok = await bcrypt.compare(credentials.password, user.password)
          if (!ok) {
            console.log("❌ Invalid password")
            return null
          }
          
          console.log("✅ Login successful for:", user.email)
          return { id: user.id, email: user.email, name: user.name, role: user.role } as any
        } catch (error) {
          console.error("🔥 DB Error during login:", error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.role = (user as any).role; token.id = user.id }
      return token
    },
    async session({ session, token }) {
      if (session.user) { (session.user as any).role = token.role; (session.user as any).id = token.id }
      return session
    },
  },
}
