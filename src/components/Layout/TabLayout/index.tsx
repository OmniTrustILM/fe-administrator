import Tabs from 'components/Tabs';
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router';
import Widget from 'components/Widget';
import TabLayoutSkeleton from './TabLayoutSkeleton';

type Props = {
    tabs: {
        // Stable identity for a tab, independent of its (possibly duplicated or non-string) display
        // title. Used for the React key and the URL slug; falls back to the title when omitted.
        tabKey?: string;
        title: string | React.ReactNode;
        hidden?: boolean;
        disabled?: boolean;
        content: React.ReactNode;
        onClick?: () => void;
    }[];
    onlyActiveTabContent?: boolean;
    selectedTab?: number;
    // Controls the selection by tab key/slug instead of by position, so that showing or hiding a tab
    // cannot shift the user onto a different one. Takes precedence over `selectedTab`; an unknown or
    // currently-hidden key falls back to the first visible tab.
    selectedTabKey?: string;
    onTabKeyChange?: (tabKey: string) => void;
    noBorder?: boolean;
    onTabChange?: (tab: number) => void;
    isLoading?: boolean;
    tabUrlParam?: string;
};

function toSlug(title: string | React.ReactNode, fallbackIndex: number) {
    if (typeof title !== 'string') return String(fallbackIndex);
    const slug = title
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
        .join('-');
    return slug || String(fallbackIndex);
}

export default function TabLayout({
    tabs,
    onlyActiveTabContent = true,
    selectedTab,
    selectedTabKey,
    onTabKeyChange,
    noBorder = false,
    onTabChange,
    isLoading = false,
    tabUrlParam,
}: Readonly<Props>) {
    const memoizedTabs = useMemo(() => tabs.filter((e) => !e.hidden), [tabs]);

    const slugs = useMemo(() => memoizedTabs.map((t, i) => t.tabKey ?? toSlug(t.title, i)), [memoizedTabs]);

    const [searchParams, setSearchParams] = useSearchParams();
    const urlSlug = tabUrlParam ? searchParams.get(tabUrlParam) : null;
    const urlIndex = urlSlug ? slugs.indexOf(urlSlug) : -1;

    const [internalTab, setInternalTab] = useState(selectedTab ?? 0);

    const urlDrivenTab = Math.max(urlIndex, 0);
    const keyDrivenTab = selectedTabKey === undefined ? undefined : Math.max(slugs.indexOf(selectedTabKey), 0);
    const controlledTab = keyDrivenTab ?? selectedTab;
    const currentTab = tabUrlParam ? urlDrivenTab : (controlledTab ?? internalTab);

    useEffect(() => {
        if (tabUrlParam || keyDrivenTab !== undefined) return;
        if (selectedTab !== undefined) {
            setInternalTab(selectedTab);
        } else if (memoizedTabs.length > 0 && internalTab >= memoizedTabs.length) {
            setInternalTab(0);
        }
    }, [selectedTab, memoizedTabs.length, internalTab, tabUrlParam, keyDrivenTab]);

    useEffect(() => {
        if (!tabUrlParam) return;
        memoizedTabs[currentTab]?.onClick?.();
        onTabChange?.(currentTab);
    }, [currentTab, tabUrlParam]);

    const lastNavTabRef = useRef<number | null>(null);

    useEffect(() => {
        lastNavTabRef.current = currentTab;
    }, [currentTab]);

    const handleTabChange = useCallback(
        (tab: number) => {
            if (tabUrlParam) {
                // Tabs fires onTabChange twice per click (RadixTabs.Root onValueChange +
                // RadixTabs.Trigger onClick, kept for keyboard + headless CI reliability).
                // Dedup so we don't push the same URL onto history twice.
                if (lastNavTabRef.current === tab) return;
                lastNavTabRef.current = tab;
                const next = new URLSearchParams(searchParams);
                if (tab === 0) {
                    next.delete(tabUrlParam);
                } else {
                    next.set(tabUrlParam, slugs[tab] ?? String(tab));
                }
                setSearchParams(next);
                return;
            }
            if (controlledTab === undefined) {
                setInternalTab(tab);
            }
            const key = slugs[tab];
            if (key !== undefined) onTabKeyChange?.(key);
            onTabChange?.(tab);
        },
        [tabUrlParam, searchParams, setSearchParams, slugs, controlledTab, onTabKeyChange, onTabChange],
    );

    const tabsForRender = useMemo(
        () => (tabUrlParam ? memoizedTabs.map(({ onClick: _onClick, ...rest }) => rest) : memoizedTabs),
        [memoizedTabs, tabUrlParam],
    );

    if (isLoading) {
        return <TabLayoutSkeleton tabCount={memoizedTabs.length} noBorder={noBorder} />;
    }

    return (
        <Widget noBorder={noBorder} dataTestId="tab-layout">
            <Tabs tabs={tabsForRender} selectedTab={currentTab} onTabChange={handleTabChange} />
            <hr className="my-4 border-gray-200" />
            {memoizedTabs.map((t, i) =>
                onlyActiveTabContent === false || currentTab === i ? (
                    <div
                        key={t.tabKey ?? (typeof t.title === 'string' ? t.title : `tab-content-${i}`)}
                        className={currentTab === i ? '' : 'hidden'}
                    >
                        {t.content}
                    </div>
                ) : null,
            )}
        </Widget>
    );
}
