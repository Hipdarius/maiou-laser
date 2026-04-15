'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

const AUTH_PATHS = ['/login', '/register'];

export default function LayoutShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAuthPage = AUTH_PATHS.includes(pathname);

    if (isAuthPage) {
        return <>{children}</>;
    }

    return (
        <div className="app-container">
            <Navbar />
            <main className="main-content">
                {children}
            </main>
        </div>
    );
}
