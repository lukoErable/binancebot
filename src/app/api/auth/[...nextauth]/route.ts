import { pool } from '@/lib/db/database';
import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        if (!user.email) return false;
        
        // Check if user exists in database
        const existingUser = await pool.query(
          'SELECT id, email FROM users WHERE email = $1',
          [user.email]
        );
        
        if (existingUser.rows.length === 0) {
          // Create new user
          const result = await pool.query(
            `INSERT INTO users (email, name, image, created_at) 
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP) 
             RETURNING id`,
            [user.email, user.name, user.image]
          );
          
          const userId = result.rows[0].id;
          console.log(`✅ New user created: ${user.email} (ID: ${userId})`);
          
          // Default strategies are now created via /api/trading-shared when user connects
          // (see hasStrategies() check in trading-shared/route.ts)
          console.log(`  → Default strategies will be created on first SSE connection`);
        } else {
          console.log(`✅ User logged in: ${user.email}`);
        }
        
        return true;
      } catch (error) {
        console.error('❌ Error during sign in:', error);
        return false;
      }
    },
    async session({ session, token }) {
      // Add user ID to session
      if (session.user && token.sub) {
        const result = await pool.query(
          'SELECT id FROM users WHERE email = $1',
          [session.user.email]
        );
        
        if (result.rows.length > 0) {
          (session.user as any).id = result.rows[0].id;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

