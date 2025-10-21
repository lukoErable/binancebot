// NextAuth middleware - DISABLED for now (development mode)
// Will be enabled once Google OAuth is fully configured

// export { default } from 'next-auth/middleware';

// export const config = {
//   matcher: [
//     '/',
//     '/api/trading-shared/:path*',
//     '/api/strategy-config/:path*',
//     '/api/multi-timeframe/:path*',
//   ],
// };

// Temporary: No authentication required
export function middleware() {
  return null;
}

