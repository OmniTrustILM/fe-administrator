import Widget from 'components/Widget';
import WidgetLock from 'components/WidgetLock';
import { type EntityType, actions as filterActions } from 'ducks/filters';
import { useDispatch } from 'react-redux';
import type { SearchFilterModel } from 'types/certificate';
import { LockTypeEnum } from 'types/user-interface';

type Props = Readonly<{
    data?: number | null;
    title: string;
    link: string;
    extraComponent?: React.ReactNode;
    entity?: EntityType;
    onSetFilter?: () => SearchFilterModel[];
    onRefresh?: () => void;
    // Why the count is missing is the caller's knowledge, not the badge's: a denied permission, a
    // down data source and a failed request all arrive as `null`. Defaults to GENERIC rather than
    // guessing a cause, so the lock never asserts a reason nobody supplied.
    lockType?: LockTypeEnum;
    lockText?: string;
}>;

function CountBadge({
    data,
    title,
    link,
    extraComponent,
    entity,
    onSetFilter,
    onRefresh,
    lockType = LockTypeEnum.GENERIC,
    lockText = 'This count could not be loaded.',
}: Props) {
    const dispatch = useDispatch();

    const applyFilter =
        entity && onSetFilter ? () => dispatch(filterActions.setCurrentFilters({ entity, currentFilters: onSetFilter() })) : undefined;

    return (
        <Widget
            titleLink={link}
            onTitleLinkClick={applyFilter}
            title={title}
            className="h-full"
            titleColor="var(--brand)"
            titleBoldness="semi-bold"
            titleSize="large"
        >
            {data === null ? (
                <WidgetLock
                    size="small"
                    lockType={lockType}
                    lockTitle="Count is not available"
                    lockText={lockText}
                    dataTestId="count-badge-lock"
                    onRefresh={onRefresh}
                />
            ) : (
                <div className="text-3xl !text-content">{data}</div>
            )}
            {extraComponent && <div className="mt-4">{extraComponent}</div>}
        </Widget>
    );
}

export default CountBadge;
