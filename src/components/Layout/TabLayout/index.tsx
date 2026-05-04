import Tabs from 'components/Tabs';
import { useMemo, useState, useEffect } from 'react';
import Widget from 'components/Widget';
import TabLayoutSkeleton from './TabLayoutSkeleton';

type Props = {
    tabs: {
        title: string | React.ReactNode;
        hidden?: boolean;
        disabled?: boolean;
        content: React.ReactNode;
        onClick?: () => void;
    }[];
    onlyActiveTabContent?: boolean;
    selectedTab?: number;
    noBorder?: boolean;
    onTabChange?: (tab: number) => void;
    isLoading?: boolean;
};

export default function TabLayout({
    tabs,
    onlyActiveTabContent = true,
    selectedTab,
    noBorder = false,
    onTabChange,
    isLoading = false,
}: Props) {
    const [activeTab, setActiveTab] = useState(selectedTab ?? 0);

    const memoizedTabs = useMemo(() => {
        return tabs.filter((e) => !e.hidden);
    }, [tabs]);

    const currentTab = selectedTab !== undefined ? selectedTab : activeTab;

    useEffect(() => {
        if (selectedTab !== undefined) {
            setActiveTab(selectedTab);
        } else if (tabs.length > 0 && activeTab >= tabs.length) {
            setActiveTab(0);
        }
    }, [selectedTab, tabs.length, activeTab]);

    const handleTabChange = (tab: number) => {
        if (selectedTab === undefined) {
            setActiveTab(tab);
        }
        if (onTabChange) {
            onTabChange(tab);
        }
    };

    if (isLoading) {
        return <TabLayoutSkeleton tabCount={tabs.filter((t) => !t.hidden).length} noBorder={noBorder} />;
    }

    return (
        <Widget noBorder={noBorder} dataTestId="tab-layout">
            <Tabs tabs={memoizedTabs} selectedTab={currentTab} onTabChange={handleTabChange} />
            <hr className="my-4 border-gray-200" />
            {memoizedTabs.map((t, i) =>
                onlyActiveTabContent === false || currentTab === i ? (
                    <div key={i} className={currentTab === i ? '' : 'hidden'}>
                        {t.content}
                    </div>
                ) : null,
            )}
        </Widget>
    );
}
