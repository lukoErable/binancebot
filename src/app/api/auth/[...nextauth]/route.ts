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
          
          // Create default strategies for new user
          await createDefaultStrategies(userId, user.email);
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

/**
 * Create default strategies for a new user
 */
async function createDefaultStrategies(userId: number, userEmail: string): Promise<void> {
  console.log(`🎯 Creating default strategies for ${userEmail}...`);
  
  const defaultStrategies = [
    {
      name: 'QuickStrike Scalp',
      type: 'CUSTOM',
      config: {
        description: 'Strategy de scalping rapide avec indicateurs multiples',
        profitTargetPercent: 3,
        stopLossPercent: 1.5,
        maxPositionTime: 15,
        positionSize: 0.05,
        cooldownPeriod: 1,
        color: 'sky'
      }
    },
    {
      name: 'Trend Follower AI',
      type: 'CUSTOM',
      config: {
        description: 'Suiveur de tendance confirmée',
        profitTargetPercent: 2,
        stopLossPercent: 2,
        maxPositionTime: 60,
        positionSize: 0.05,
        cooldownPeriod: 5,
        color: 'green'
      }
    },
    {
      name: 'ConservativeTrendTrader',
      type: 'CUSTOM',
      config: {
        description: 'Trading conservateur sur tendances fortes',
        profitTargetPercent: 2,
        stopLossPercent: 2.5,
        maxPositionTime: 120,
        positionSize: 0.05,
        cooldownPeriod: 5,
        color: 'indigo'
      }
    }
  ];
  
  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];
  
  for (const strategy of defaultStrategies) {
    for (const timeframe of timeframes) {
      try {
        await pool.query(
          `INSERT INTO strategies (user_id, name, type, is_active, config, timeframe, activated_at, total_active_time, created_at, updated_at)
           VALUES ($1, $2, $3, false, $4::jsonb, $5, NULL, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT (user_id, name, timeframe) DO NOTHING`,
          [userId, strategy.name, strategy.type, JSON.stringify(strategy.config), timeframe]
        );
      } catch (error) {
        console.error(`❌ Error creating default strategy ${strategy.name} [${timeframe}]:`, error);
      }
    }
    console.log(`  ✅ ${strategy.name} created on all timeframes`);
  }
  
  console.log(`✅ Default strategies created for ${userEmail}`);
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

