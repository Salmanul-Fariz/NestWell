import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const NestwellLogo: React.FC<LogoProps> = ({ className = '', size = 36 }) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative shrink-0 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 p-0.5 shadow-md shadow-indigo-600/20 ring-1 ring-white/20 flex items-center justify-center ${className}`}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full p-1"
      >
        <path
          d="M50 20 C64 20 74 25 74 38 C74 58 50 80 50 80 C50 80 26 58 26 38 C26 25 36 20 50 20 Z"
          fill="white"
          fillOpacity="0.95"
        />
        <path
          d="M42 35 L42 62 M42 35 L58 62 M58 35 L58 62"
          stroke="#4F46E5"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="50" cy="28" r="3" fill="#4F46E5" />
      </svg>
    </div>
  );
};
