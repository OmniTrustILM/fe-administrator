// Mock localStorage and __ENV__ before any other imports
if (typeof window !== 'undefined') {
    if (!window.localStorage) {
        const localStorageMock = {
            getItem: (key: string) => {
                if (key === 'theme') return 'light';
                return null;
            },
            setItem: () => {},
            removeItem: () => {},
            clear: () => {},
        };
        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock,
            writable: true,
        });
    }

    // Set up __ENV__ for API URL configuration
    if (!(window as any).__ENV__) {
        (window as any).__ENV__ = {
            BASE_URL: '/administrator',
            API_URL: '/api',
            LOGIN_URL: '/login',
            LOGOUT_URL: '/logout',
            ENABLE_PROXIES: true,
            ENABLE_TRUSTED_CERTIFICATES: true,
        };
    }
}

import 'reactflow/dist/style.css';
import '../src/tailwindcss.css';
