import cn from 'classnames';
import SimpleBar from 'simplebar-react';

type Props = Readonly<{
    tabs: {
        title: React.ReactNode;
        onClick?: () => void;
    }[];
    selectedTab: number;
    onTabChange: (tab: number) => void;
}>;

function Tabs({ tabs, selectedTab, onTabChange }: Props) {
    return (
        <SimpleBar forceVisible="x">
            <div className="flex gap-x-1" role="tablist" aria-label="Tabs" aria-orientation="horizontal">
                {tabs.map((tab, index) => (
                    <button
                        key={index}
                        type="button"
                        className={cn(
                            'hs-tab-active:bg-gray-200 hs-tab-active:text-gray-800 hs-tab-active:hover:text-gray-800 dark:hs-tab-active:bg-neutral-700 dark:hs-tab-active:text-white py-3 px-4 inline-flex items-center gap-x-2 bg-transparent text-sm font-medium text-center text-gray-500 rounded-lg focus:outline-hidden disabled:opacity-50 disabled:pointer-events-none dark:text-neutral-500 dark:hover:text-neutral-400 dark:focus:text-neutral-400 whitespace-nowrap',
                            {
                                active: selectedTab === index,
                            },
                        )}
                        id={`pills-on-gray-color-item-${index}`}
                        aria-selected="false"
                        data-hs-tab={`#pills-on-gray-color-${index}`}
                        aria-controls={`pills-on-gray-color-${index}`}
                        role="tab"
                        onClick={() => {
                            onTabChange(index);
                            tab.onClick?.();
                        }}
                    >
                        {tab.title}
                    </button>
                ))}
            </div>
        </SimpleBar>
    );
}

export default Tabs;
