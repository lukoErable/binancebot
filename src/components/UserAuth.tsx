'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import { useState } from 'react';
import { HiOutlineLogout, HiOutlineUser } from 'react-icons/hi';

export default function UserAuth() {
  const { data: session, status } = useSession();
  const [showDropdown, setShowDropdown] = useState(false);

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-700 border border-gray-600 rounded animate-pulse">
        <div className="w-5 h-5 rounded-full bg-gray-600"></div>
        <div className="w-16 h-3 bg-gray-600 rounded"></div>
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 border border-sky-500/30 rounded text-sm font-medium hover:border-sky-500/50 transition-all"
        >
          {session.user.image ? (
            <Image
              src={session.user.image}
              alt={session.user.name || 'User'}
              width={20}
              height={20}
              className="rounded-full"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 flex items-center justify-center">
              <HiOutlineUser className="w-3 h-3 text-white" />
            </div>
          )}
          <span className="text-xs text-white">
            {session.user.name?.split(' ')[0] || session.user.email?.split('@')[0]}
          </span>
          <svg
            className={`w-3 h-3 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDropdown && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowDropdown(false)}
            ></div>

            {/* Dropdown */}
            <div className="absolute right-0 mt-2 w-52 bg-gray-800 border border-gray-700 rounded-lg shadow-xl shadow-black/50 z-20">
              <div className="px-3 py-2 border-b border-gray-700">
                <p className="text-xs font-medium text-white">{session.user.name}</p>
                <p className="text-[10px] text-gray-400 truncate">{session.user.email}</p>
              </div>
              <button
                onClick={() => {
                  setShowDropdown(false);
                  signOut();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-gray-700/50 transition-colors rounded-b-lg"
              >
                <HiOutlineLogout className="w-3.5 h-3.5" />
                Déconnexion
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn('google')}
      className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 border border-gray-600 hover:border-sky-500/50 text-white rounded text-sm font-medium transition-all"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
        <path fill="none" d="M1 1h22v22H1z" />
      </svg>
      <span>Sign in</span>
    </button>
  );
}

