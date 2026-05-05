import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router';
import { Menu } from 'lucide-react';
import Dropdown from 'components/Dropdown';
import NotificationsOverview from 'components/_pages/notifications/overview';

import { selectors } from 'ducks/auth';

import logo from '../../../resources/images/ot-logo-white.svg';

type Props = Readonly<{
    sidebarToggle: () => void;
}>;

function Header({ sidebarToggle }: Props) {
    const profile = useSelector(selectors.profile);
    const navigate = useNavigate();

    return (
        <header
            className="flex items-center justify-between sticky top-0 left-0 w-full z-50 bg-blue-500 px-4 py-2 h-[var(--header-height)]"
            data-testid="header"
        >
            <Link to="/dashboard" data-testid="header-logo-link">
                <img src={logo} alt="OT Logo" className="h-9" data-testid="header-logo" />
            </Link>
            <div className="flex items-center gap-2">
                {!!profile && (
                    <Dropdown
                        title={
                            <div className="flex items-center gap-2">
                                {/* <User size={24} /> */}
                                <svg
                                    width="38"
                                    height="38"
                                    viewBox="0 0 38 38"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    xmlnsXlink="http://www.w3.org/1999/xlink"
                                    className="mr-3"
                                >
                                    <g clipPath="url(#clip0_221062_91352)">
                                        <rect width="38" height="38" fill="url(#pattern0_221062_91352)" />
                                    </g>
                                    <defs>
                                        <pattern id="pattern0_221062_91352" patternContentUnits="objectBoundingBox" width="1" height="1">
                                            <use xlinkHref="#image0_221062_91352" transform="translate(-0.005) scale(0.01)" />
                                        </pattern>
                                        <clipPath id="clip0_221062_91352">
                                            <path
                                                d="M0 19C0 8.50659 8.50659 0 19 0C29.4934 0 38 8.50659 38 19C38 29.4934 29.4934 38 19 38C8.50659 38 0 29.4934 0 19Z"
                                                fill="white"
                                            />
                                        </clipPath>
                                        <image
                                            id="image0_221062_91352"
                                            width="101"
                                            height="100"
                                            preserveAspectRatio="none"
                                            xlinkHref="data:image/jpeg;base64,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"
                                        />
                                    </defs>
                                </svg>

                                {profile.username}
                            </div>
                        }
                        btnStyle="transparent"
                        className="text-white"
                        items={[
                            {
                                title: 'Profile',
                                onClick: () => {
                                    navigate('/userprofile');
                                },
                            },
                            {
                                title: 'Log out',
                                onClick: () => {
                                    window.location.href = (window as any).__ENV__.LOGOUT_URL;
                                },
                            },
                        ]}
                    />
                )}
                <NotificationsOverview />
                <button className="text-white md:hidden" onClick={sidebarToggle} data-testid="header-sidebar-toggle">
                    <Menu size={24} />
                </button>
            </div>
        </header>
    );
}

export default Header;
