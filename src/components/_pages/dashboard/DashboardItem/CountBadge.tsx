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
}>;

function CountBadge({ data, title, link, extraComponent, entity, onSetFilter, onRefresh }: Props) {
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
                    lockType={LockTypeEnum.SERVICE_ERROR}
                    lockTitle="Count is not available"
                    lockText="This count could not be loaded."
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
