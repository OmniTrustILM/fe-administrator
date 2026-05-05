import { useMemo, useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router';
import cn from 'classnames';
import SimpleBar from 'simplebar-react';
import { useLocalStorage } from 'usehooks-ts';
import {
    Award,
    ChevronDown,
    HomeIcon,
    KeyRound,
    SearchCheck,
    Link,
    CircleUser,
    Users,
    Table,
    ListChecks,
    CircleCheckBig,
    Calendar,
    Settings,
    FileJson2,
    Split,
    ArrowRightToLine,
    Network,
    FileLock2,
} from 'lucide-react';
import Button from 'components/Button';
import { Resource } from 'types/openapi';
import { featureFlags } from 'utils/feature-flags';

type MenuItemMapping = {
    _key: string;
    icon?: React.ReactNode;
    header: string;
    requiredResources?: Resource[];
} & (
    | {
          headerLink?: never;
          children: Array<{
              _key: string;
              name: string;
              link: string;
              requiredResources?: Resource[];
          }>;
      }
    | {
          headerLink: string;
          requiredResources?: Resource[];
      }
);

function SidebarSubmenuItem({ child, index, totalCount }: { child: { name: string; link: string }; index: number; totalCount: number }) {
    return (
        <li className={cn({ 'mb-2': index === totalCount - 1 })}>
            <NavLink
                to={child.link}
                className={({ isActive }) =>
                    cn(
                        'font-medium text-sm block px-4 ml-8 py-2 no-underline hover:bg-gray-200 rounded-lg h-[38px] items-center',
                        isActive && 'text-blue-600',
                    )
                }
            >
                {child.name}
            </NavLink>
        </li>
    );
}

function SecretsIcon() {
    return (
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
            />
            <path
                d="M14.9897 16.0474C15.0645 16.4408 14.7231 16.7998 14.2744 16.7999H9.72558C9.27688 16.7998 8.93552 16.4408 9.01032 16.0474L10.298 10.6934L11.2721 10.8393C11.3885 10.8567 11.4647 10.9704 11.4367 11.0847L10.298 15.7252H13.702L12.6174 11.083C12.5908 10.9693 12.6669 10.857 12.7825 10.8397L13.7589 10.6934L14.9897 16.0474Z"
                fill="currentColor"
                strokeWidth={1.5}
            />
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 6.22866C13.2887 6.22866 14.3333 7.32884 14.3333 8.68598C14.3333 9.56454 13.8949 10.3362 13.2327 10.7713L13.5347 12C14.6985 11.4011 15.5 10.142 15.5 8.68598C15.5 6.65027 13.933 5 12 5C10.067 5 8.5 6.65027 8.5 8.68598C8.5 10.0513 9.20492 11.243 10.2523 11.88L10.4653 12L10.7673 10.7713C10.1051 10.3362 9.66667 9.56454 9.66667 8.68598C9.66667 7.32884 10.7113 6.22866 12 6.22866Z"
                fill="currentColor"
                strokeWidth={1.5}
            />
        </svg>
    );
}

const menuItemMappings: MenuItemMapping[] = [
    {
        _key: '/dashboard',
        icon: <HomeIcon size={16} strokeWidth={1.5} />,
        header: 'Dashboard',
        children: [
            {
                _key: '/dashboard/certificates',
                name: 'Certificates Dashboard',
                link: '/dashboard/certificates',
                requiredResources: [Resource.Certificates, Resource.RaProfiles, Resource.Discoveries, Resource.Groups],
            },
            {
                _key: '/dashboard/secrets',
                name: 'Secrets Dashboard',
                link: '/dashboard/secrets',
                requiredResources: [Resource.Secrets],
            },
        ],
    },
    {
        _key: '/certificates',
        icon: <Award size={16} strokeWidth={1.5} />,
        header: 'Certificates',
        headerLink: '/certificates',
        requiredResources: [Resource.Certificates],
    },
    {
        _key: '/keys',
        icon: <KeyRound size={16} strokeWidth={1.5} />,
        header: 'Keys',
        headerLink: '/keys',
        requiredResources: [Resource.Keys],
    },
    {
        _key: '/discovery',
        icon: <SearchCheck size={16} strokeWidth={1.5} />,
        header: 'Discoveries',
        headerLink: '/discoveries',
        requiredResources: [Resource.Discoveries],
    },
    {
        _key: '/connectors',
        icon: <Link size={16} strokeWidth={1.5} />,
        header: 'Connectors',
        headerLink: '/connectors',
        requiredResources: [Resource.Connectors],
    },
    {
        _key: '/secrets',
        icon: <SecretsIcon />,
        header: 'Secrets',
        headerLink: '/secrets',
        requiredResources: [Resource.Secrets],
    },
    {
        _key: '/cboms',
        icon: <FileLock2 size={16} strokeWidth={1.5} />,
        header: 'CBOMs',
        headerLink: '/cboms',
        requiredResources: [Resource.Cboms],
    },
    {
        _key: '/proxies',
        icon: <Network size={16} strokeWidth={1.5} />,
        header: 'Proxies',
        headerLink: '/proxies',
        requiredResources: [Resource.Proxies],
    },

    {
        _key: 'accessControl',
        icon: <CircleUser size={16} strokeWidth={1.5} />,
        header: 'Access Control',
        children: [
            { _key: '/users', name: 'Users', link: '/users', requiredResources: [Resource.Users] },
            { _key: '/roles', name: 'Roles', link: '/roles', requiredResources: [Resource.Roles] },
        ],
    },
    {
        _key: 'profiles',
        icon: <Users size={16} strokeWidth={1.5} />,
        header: 'Profiles',
        children: [
            {
                _key: '/raprofiles',
                name: 'RA Profiles',
                link: '/raprofiles',
                requiredResources: [Resource.RaProfiles],
            },
            {
                _key: '/tokenprofiles',
                name: 'Token Profiles',
                link: '/tokenprofiles',
                requiredResources: [Resource.TokenProfiles],
            },
            {
                _key: '/complianceprofiles',
                name: 'Compliance Profiles',
                link: '/complianceprofiles',
                requiredResources: [Resource.ComplianceProfiles],
            },
            {
                _key: '/notificationProfiles',
                name: 'Notification Profiles',
                link: '/notificationprofiles',
                requiredResources: [Resource.NotificationProfiles],
            },
            { _key: '/vaultprofiles', name: 'Vault Profiles', link: '/vaultprofiles', requiredResources: [Resource.VaultProfiles] },
        ],
    },

    {
        _key: 'inventory',
        icon: <Table size={16} strokeWidth={1.5} />,
        header: 'Inventory',
        children: [
            { _key: '/credentials', name: 'Credentials', link: '/credentials', requiredResources: [Resource.Credentials] },
            { _key: '/authorities', name: 'Authorities', link: '/authorities', requiredResources: [Resource.Authorities] },
            { _key: '/tokens', name: 'Tokens', link: '/tokens', requiredResources: [Resource.Tokens] },
            { _key: '/groups', name: 'Groups', link: '/groups', requiredResources: [Resource.Groups] },
            { _key: '/entities', name: 'Entities', link: '/entities', requiredResources: [Resource.Entities] },
            { _key: '/locations', name: 'Locations', link: '/locations', requiredResources: [Resource.Locations] },
            { _key: '/vaults', name: 'Vaults', link: '/vaults', requiredResources: [Resource.Vaults] },
        ],
    },

    {
        _key: 'protocols',
        icon: <ListChecks size={16} strokeWidth={1.5} />,
        header: 'Protocols',
        children: [
            {
                _key: '/acmeaccounts',
                name: 'ACME Accounts',
                link: '/acmeaccounts',
                requiredResources: [Resource.AcmeAccounts],
            },
            { _key: '/acmeprofiles', name: 'ACME Profiles', link: '/acmeprofiles', requiredResources: [Resource.AcmeProfiles] },
            { _key: '/cmpprofiles', name: 'CMP Profiles', link: '/cmpprofiles', requiredResources: [Resource.CmpProfiles] },
            { _key: '/scepprofiles', name: 'SCEP Profiles', link: '/scepprofiles', requiredResources: [Resource.ScepProfiles] },
        ],
    },

    {
        _key: 'approvals',
        icon: <CircleCheckBig size={16} strokeWidth={1.5} />,
        header: 'Approvals',
        children: [
            {
                _key: '/approvalprofiles',
                name: 'Approval Profiles',
                link: '/approvalprofiles',
                requiredResources: [Resource.ApprovalProfiles],
            },
            {
                _key: '/approvals',
                name: 'Approval List',
                link: '/approvals',
                requiredResources: [Resource.Approvals],
            },
        ],
    },

    {
        _key: '/jobs',
        icon: <Calendar size={16} strokeWidth={1.5} />,
        header: 'Scheduler',
        headerLink: '/jobs',
        requiredResources: [Resource.Jobs],
    },

    {
        _key: 'settings',
        icon: <Settings size={16} strokeWidth={1.5} />,
        header: 'Settings',
        children: [
            { _key: '/settings', name: 'Platform', link: '/settings', requiredResources: [Resource.Settings] },
            {
                _key: '/customattributes',
                name: 'Custom Attributes',
                link: '/customattributes',
                requiredResources: [Resource.Attributes],
            },
            { _key: '/globalmetadata', name: 'Global Metadata', link: '/globalmetadata', requiredResources: [Resource.Attributes] },
            {
                _key: '/events',
                name: 'Events',
                link: '/events',
                requiredResources: [Resource.NotificationInstances, Resource.Settings],
            },
            { _key: '/loggingSettings', name: 'Logging', link: '/loggingsettings', requiredResources: [Resource.Settings] },
            {
                _key: '/authenticationSettings',
                name: 'Authentication',
                link: '/authenticationsettings',
                requiredResources: [Resource.Settings],
            },
            { _key: '/custom-oids', name: 'Custom OIDs', link: '/custom-oids', requiredResources: [Resource.Settings] },
            {
                _key: `/${Resource.TimeQualityConfigurations.toLowerCase()}`,
                name: 'Time Quality',
                link: `/${Resource.TimeQualityConfigurations.toLowerCase()}`,
                requiredResources: [Resource.TimeQualityConfigurations],
            },
            {
                _key: `/${Resource.TrustedCertificates.toLowerCase()}`,
                name: 'Trusted Certificates',
                link: `/${Resource.TrustedCertificates.toLowerCase()}`,
                requiredResources: [Resource.Settings],
            },
        ],
    },

    {
        _key: '/auditlogs',
        icon: <FileJson2 size={16} strokeWidth={1.5} />,
        header: 'Audit Logs',
        headerLink: '/auditlogs',
        requiredResources: [Resource.AuditLogs],
    },
    {
        _key: 'workflows',
        icon: <Split size={16} strokeWidth={1.5} />,
        header: 'Workflows',
        children: [
            // { _key: '/conditions', name: 'Conditions', link: '/conditions' },
            {
                _key: 'rules',
                name: 'Rules',
                link: '/rules',
                requiredResources: [Resource.Rules],
            },
            {
                _key: 'actions',
                name: 'Actions',
                link: '/actions',
                requiredResources: [Resource.Actions],
            },
            {
                _key: 'triggers',
                name: 'Triggers',
                link: '/triggers',
                requiredResources: [Resource.Triggers],
            },
        ],
    },
];

function getAllowedMenuItems(allowedResources?: Resource[]): MenuItemMapping[] {
    if (!allowedResources) return [];
    const allowedLinks: MenuItemMapping[] = [];

    const { isProxiesEnabled, isTrustedCertificatesEnabled } = featureFlags;

    // Filters menu items based on associated resources and allowed resources.
    // Menu item is shown if:
    // 1. It doesn't have children, and doesn't have associated resources array.
    // 2. It doesn't have children, and associated resources array contains item which is present in allowedResources.
    // 3. It has a child, which is shown based on rules 1 and 2.
    // 4. Feature flags are enabled for Proxies and Trusted Certificates.
    for (const mapping of menuItemMappings) {
        // Filter out Proxies if disabled
        if (mapping._key === '/proxies' && !isProxiesEnabled) {
            continue;
        }

        if ('children' in mapping) {
            mapping.children = mapping.children.filter((el) => {
                // Filter out Trusted Certificates if disabled
                if (el._key === `/${Resource.TrustedCertificates.toLowerCase()}` && !isTrustedCertificatesEnabled) {
                    return false;
                }
                return !!el.requiredResources?.some((resource) => allowedResources.includes(resource));
            });
            if (mapping.children.length > 0) {
                allowedLinks.push(mapping);
            }
            continue;
        }
        if (
            mapping.requiredResources === undefined ||
            mapping.requiredResources.length === 0 ||
            mapping.requiredResources.find((resource) => allowedResources.includes(resource))
        ) {
            allowedLinks.push(mapping);
        }
    }

    return allowedLinks;
}

type Props = Readonly<{
    allowedResources?: Resource[];
}>;
export default function Sidebar({ allowedResources }: Props) {
    const [defaultMenuSize, setDefaultMenuSize] = useLocalStorage<'small' | 'large'>('menu-size', 'small');
    const [menuSize, setMenuSize] = useState<'small' | 'large' | 'flying'>(defaultMenuSize);
    const location = useLocation();

    const allowedMenuItems = useMemo(() => getAllowedMenuItems(allowedResources), [allowedResources]);
    const [openMenuItems, setOpenMenuItems] = useState<string[]>([]);

    const activeSectionKey = useMemo(() => {
        const pathname = location.pathname;
        const item = allowedMenuItems.find(
            (m): m is MenuItemMapping & { children: Array<{ link: string }> } =>
                'children' in m && m.children.some((c) => pathname === c.link || pathname.startsWith(`${c.link}/`)),
        );
        return item ? item._key : null;
    }, [location.pathname, allowedMenuItems]);

    useEffect(() => {
        if (menuSize === 'flying') return;
        document.documentElement.style.setProperty('--sidebar-width', menuSize === 'small' ? '84px' : '260px');
    }, [menuSize]);

    useEffect(() => {
        if (menuSize === 'large' && activeSectionKey) {
            setOpenMenuItems((prev) => (prev.includes(activeSectionKey) ? prev : [...prev, activeSectionKey]));
        }
    }, [menuSize, activeSectionKey]);

    function toggleMenuSize() {
        const newMenuSize = menuSize === 'small' ? 'large' : 'small';
        setMenuSize(newMenuSize);
        setOpenMenuItems(newMenuSize === 'large' && activeSectionKey ? [activeSectionKey] : []);
        setDefaultMenuSize(newMenuSize);
    }

    function renderMenuItem(mapping: MenuItemMapping) {
        if ('children' in mapping) {
            const childrenKeys = mapping.children.map((child) => child.link);
            const activePage = location.pathname;
            const isChildActive = childrenKeys.some((child) => child === activePage || activePage.startsWith(`${child}/`));
            const isActive = openMenuItems.includes(mapping._key);
            return (
                <li key={mapping.header} className={cn('flex justify-center', { 'flex-col': menuSize != 'small' })}>
                    <Button
                        variant="transparent"
                        className={cn('!px-4 !py-2 border-none justify-between h-[38px]', {
                            'flex w-full items-center': menuSize != 'small',
                        })}
                        onClick={() => {
                            if (menuSize === 'small') {
                                setMenuSize('flying');
                            }
                            setOpenMenuItems((prev) => (isActive ? prev.filter((item) => item !== mapping._key) : [...prev, mapping._key]));
                        }}
                        aria-expanded={isActive}
                        aria-controls={mapping._key}
                    >
                        <div className={cn('flex items-center gap-x-2', { 'text-blue-600': isChildActive })}>
                            {mapping.icon}
                            <span className={cn('text-sm', { 'sr-only': menuSize === 'small' })}>{mapping.header}</span>
                        </div>
                        {menuSize != 'small' && <ChevronDown strokeWidth={1.5} size={16} className={cn({ isActive: 'rotate-180' })} />}
                    </Button>
                    <ul
                        className={cn(
                            `transition-[max-height] duration-300 ease-in-out overflow-hidden relative before:content-[''] before:absolute before:left-6 before:top-0 before:h-full before:w-0.5 before:bg-gray-200`,
                            { 'w-0': !isActive },
                        )}
                        style={{ maxHeight: isActive ? `${38 * mapping.children.length}px` : 0 }}
                        id={mapping._key}
                    >
                        {mapping.children.map((child, index) => (
                            <SidebarSubmenuItem key={child.name} child={child} index={index} totalCount={mapping.children.length} />
                        ))}
                    </ul>
                </li>
            );
        }
        return (
            <li key={mapping._key} className="flex justify-center">
                <NavLink
                    to={mapping.headerLink}
                    onClick={() => {
                        if (menuSize === 'flying') {
                            setMenuSize('small');
                            setOpenMenuItems([]);
                        }
                    }}
                    className={({ isActive }) =>
                        cn('font-medium flex px-4 py-2 no-underline hover:bg-gray-200 rounded-lg h-[38px] items-center dark:text-white', {
                            'text-blue-600': isActive,
                            'w-full gap-x-2': menuSize !== 'small',
                        })
                    }
                >
                    {mapping.icon}
                    <span className={cn('text-sm font-medium', { 'sr-only': menuSize === 'small' })}>{mapping.header}</span>
                </NavLink>
            </li>
        );
    }
    return (
        <>
            {menuSize === 'flying' && (
                <div
                    role="region"
                    aria-label="Sidebar menu"
                    className={cn(
                        'fixed top-[var(--header-height)] left-0 h-[calc(100vh-var(--header-height))] bg-white shadow-lg w-[260px] z-50',
                        {},
                    )}
                    onMouseLeave={() => {
                        setMenuSize('small');
                        setOpenMenuItems([]);
                    }}
                    data-testid="sidebar-flying"
                >
                    <SimpleBar
                        forceVisible="y"
                        style={{
                            height: '100%',
                            width: '100%',
                        }}
                    >
                        <nav className="p-4">
                            <ul className="list-none m-0 flex flex-col gap-y-1">{allowedMenuItems.map((item) => renderMenuItem(item))}</ul>
                        </nav>
                    </SimpleBar>
                </div>
            )}
            <SimpleBar
                forceVisible="y"
                style={{
                    height: 'calc(100vh - var(--header-height))',
                    width: 'var(--sidebar-width)',
                    position: 'sticky',
                    top: 'var(--header-height)',
                    zIndex: 10,
                }}
                data-testid="sidebar-sticky"
            >
                <div className="p-4 w-full h-full dark:bg-neutral-900">
                    <nav className="pb-4">
                        <ul className="list-none m-0 flex flex-col gap-y-1">{allowedMenuItems.map((item) => renderMenuItem(item))}</ul>
                    </nav>

                    <hr className="border-gray-200" />
                    <div className="flex justify-center pt-4">
                        <Button
                            variant="transparent"
                            className={cn('inline-flex px-4 py-2 border-none', {
                                'w-full gap-x-2': menuSize !== 'small',
                            })}
                            onClick={() => toggleMenuSize()}
                        >
                            <ArrowRightToLine strokeWidth={1} size={24} className={cn(menuSize === 'large' && 'rotate-180')} />
                            <span className={cn({ 'sr-only': menuSize === 'small' })}>Collapse</span>
                        </Button>
                    </div>
                </div>
            </SimpleBar>
        </>
    );
}
