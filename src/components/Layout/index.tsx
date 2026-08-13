import { useCallback, useState } from 'react';
import { Outlet } from 'react-router';

import Alerts from 'components/Alerts';
import ErrorBoundary from 'components/ErrorBoundary';
import GlobalModal from 'components/GlobalModal';
import Footer from 'components/Layout/Footer';
import Header from 'components/Layout/Header';
import Sidebar from 'components/Layout/Sidebar';
import { useSelector } from 'react-redux';
import { selectors } from 'ducks/auth';

function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const toggleSidebar = useCallback(() => setSidebarOpen(!sidebarOpen), [sidebarOpen]);

    const profile = useSelector(selectors.profile);

    return (
        <div className="flex flex-col min-h-screen">
            <Header sidebarToggle={toggleSidebar} />
            <div className="flex">
                <Sidebar allowedResources={profile?.permissions.allowedListings} />
                <main className="flex flex-col bg-surface w-[calc(100%-var(--sidebar-width))] p-4 md:p-8 !pb-0">
                    <ErrorBoundary>
                        <Outlet />
                    </ErrorBoundary>
                    <div className="grow-1" />
                    <Footer />
                </main>
                <GlobalModal />
            </div>
            <Alerts />
        </div>
    );
}

export default Layout;
