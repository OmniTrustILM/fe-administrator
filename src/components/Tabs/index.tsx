import * as RadixTabs from '@radix-ui/react-tabs';
import cn from 'classnames';
import SimpleBar from 'simplebar-react';

type Props = {
    tabs: {
        tabKey?: string;
        title: React.ReactNode;
        onClick?: () => void;
        disabled?: boolean;
    }[];
    selectedTab: number;
    onTabChange: (tab: number) => void;
};

function Tabs({ tabs, selectedTab, onTabChange }: Readonly<Props>) {
    return (
        <SimpleBar forceVisible="x">
            {/* onValueChange covers keyboard activation; onClick on Trigger covers mouse clicks
                because Radix's internal mousedown→onValueChange path is unreliable in headless
                chromium on Linux CI. The two paths overlap harmlessly on platforms where both fire. */}
            <RadixTabs.Root value={String(selectedTab)} onValueChange={(v) => onTabChange(Number(v))} orientation="horizontal">
                <RadixTabs.List className="flex gap-x-1" aria-label="Tabs">
                    {tabs.map((tab, index) => (
                        <RadixTabs.Trigger
                            key={tab.tabKey ?? (typeof tab.title === 'string' ? tab.title : `tab-${index}`)}
                            value={String(index)}
                            disabled={tab.disabled}
                            onClick={() => {
                                onTabChange(index);
                                tab.onClick?.();
                            }}
                            className={cn(
                                'data-[state=active]:bg-surface-active data-[state=active]:text-content data-[state=active]:hover:text-content',
                                'data-[state=inactive]:hover:bg-surface-hover data-[state=inactive]:hover:text-content',
                                'data-[state=inactive]:focus:bg-surface-hover data-[state=inactive]:focus:text-content',
                                'py-3 px-4 inline-flex items-center gap-x-2 bg-transparent text-sm font-medium text-center text-content-subtle rounded-lg',
                                'focus:outline-hidden disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap',
                            )}
                        >
                            {tab.title}
                        </RadixTabs.Trigger>
                    ))}
                </RadixTabs.List>
            </RadixTabs.Root>
        </SimpleBar>
    );
}

export default Tabs;
