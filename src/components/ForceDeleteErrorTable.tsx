import { useMemo } from 'react';

import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';

export interface ForceDeleteErrorItem {
    uuid?: string;
    name: string;
    message: string;
}

type ForceDeleteErrorTableProps = {
    items?: ForceDeleteErrorItem[];
    entityNameSingular: string;
    entityNamePlural: string;
    itemsCount: number;
};

export default function ForceDeleteErrorTable({
    items,
    entityNameSingular,
    entityNamePlural,
    itemsCount,
}: Readonly<ForceDeleteErrorTableProps>) {
    const headers: TableHeader[] = useMemo(
        () => [
            {
                id: 'name',
                content: 'Name',
            },
            {
                id: 'dependencies',
                content: 'Dependencies',
            },
        ],
        [],
    );

    const data: TableDataRow[] = useMemo(
        () =>
            items?.map((message, index) => ({
                id: message.uuid || message.name || index,
                columns: [message.name, message.message],
            })) || [],
        [items],
    );

    const entityLabel = itemsCount > 1 ? entityNamePlural : entityNameSingular;

    return (
        <div>
            <div className="mb-4">Failed to delete {entityLabel}. Please find the details below:</div>
            <CustomTable headers={headers} data={data} />
        </div>
    );
}
