import Widget from 'components/Widget';
import { type EntityType, actions as filterActions } from 'ducks/filters';
import { useDispatch } from 'react-redux';
import type { SearchFilterModel } from 'types/certificate';

type Props = Readonly<{
    data?: number;
    title: string;
    link: string;
    extraComponent?: React.ReactNode;
    entity?: EntityType;
    onSetFilter?: () => SearchFilterModel[];
}>;

function CountBadge({ data, title, link, extraComponent, entity, onSetFilter }: Props) {
    const dispatch = useDispatch();

    const applyFilter =
        entity && onSetFilter ? () => dispatch(filterActions.setCurrentFilters({ entity, currentFilters: onSetFilter() })) : undefined;

    return (
        <Widget
            titleLink={link}
            onTitleLinkClick={applyFilter}
            title={title}
            className="h-full"
            titleColor="var(--primary-blue-color)"
            titleBoldness="semi-bold"
            titleSize="large"
        >
            <div className="text-3xl !text-[var(--dark-gray-color)]">{data}</div>
            {extraComponent && <div className="mt-4">{extraComponent}</div>}
        </Widget>
    );
}

export default CountBadge;
