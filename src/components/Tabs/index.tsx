import * as RadixTabs from '@radix-ui/react-tabs';
import cn from 'classnames';
import SimpleBar from 'simplebar-react';

type Props = {
    tabs: {
        title: React.ReactNode;
        onClick?: () => void;
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
                            key={typeof tab.title === 'string' ? tab.title : `tab-${index}`}
                            value={String(index)}
                            onClick={() => {
                                onTabChange(index);
                                tab.onClick?.();
                            }}
                            className={cn(
                                'data-[state=active]:bg-gray-200 data-[state=active]:text-gray-800 data-[state=active]:hover:text-gray-800',
                                'dark:data-[state=active]:bg-neutral-700 dark:data-[state=active]:text-white',
                                'py-3 px-4 inline-flex items-center gap-x-2 bg-transparent text-sm font-medium text-center text-gray-500 rounded-lg',
                                'focus:outline-hidden disabled:opacity-50 disabled:pointer-events-none',
                                'dark:text-neutral-500 dark:hover:text-neutral-400 dark:focus:text-neutral-400 whitespace-nowrap',
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
