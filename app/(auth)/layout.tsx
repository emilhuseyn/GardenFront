import type { ReactNode } from 'react';
import '../globals.css';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
