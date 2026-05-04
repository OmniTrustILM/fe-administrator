const barClass = 'rounded bg-gray-200 dark:bg-neutral-700';

const cellWidths = [112, 56, 80, 48, 96, 64, 88, 40, 120, 72];

function getCellWidth(row: number, col: number): number {
    return cellWidths[(row * 3 + col * 7) % cellWidths.length];
}

const headerWidths = [96, 64, 80, 56];

interface Props {
    columnsCount?: number;
    hasCheckboxes?: boolean;
    hasPagination?: boolean;
    canSearch?: boolean;
    rowCount?: number;
}

function TableSkeleton({ columnsCount = 4, hasCheckboxes = true, hasPagination = true, canSearch = false, rowCount = 10 }: Props) {
    const columns = Array.from({ length: columnsCount }, (_, i) => i);
    const rows = Array.from({ length: rowCount }, (_, i) => i);

    return (
        <div className="animate-pulse" data-testid="table-skeleton">
            {canSearch && (
                <div className="flex justify-end mb-3">
                    <div className={`${barClass} h-11.5 w-64 rounded-lg`} />
                </div>
            )}

            <div className="py-2">
                <div className="rounded-md border border-gray-100 dark:border-neutral-700 overflow-hidden">
                    <div className="min-w-full inline-block align-middle overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700 bg-white dark:bg-neutral-900">
                            <thead className="bg-[#F8FAFC] dark:bg-neutral-700">
                                <tr>
                                    {hasCheckboxes && (
                                        <th className="p-3 w-8">
                                            <div className={`${barClass} h-4 w-4`} />
                                        </th>
                                    )}
                                    {columns.map((col) => (
                                        <th key={col} className="p-3">
                                            <div
                                                className={`${barClass} h-3`}
                                                style={{ width: `${headerWidths[col % headerWidths.length]}px` }}
                                            />
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                                {rows.map((row) => (
                                    <tr key={row} data-testid="table-skeleton-row">
                                        {hasCheckboxes && (
                                            <td className="p-3">
                                                <div className={`${barClass} h-4 w-4`} />
                                            </td>
                                        )}
                                        {columns.map((col) => (
                                            <td key={col} className="p-3">
                                                <div className={`${barClass} h-3`} style={{ width: `${getCellWidth(row, col)}px` }} />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {hasPagination && (
                <div className="flex justify-between items-center gap-2 mt-6">
                    <div className={`${barClass} h-9.5 w-[90px]`} />

                    <div className="flex items-center gap-x-1">
                        <div className={`${barClass} h-9.5 w-24 rounded-lg`} />
                        <div className="flex items-center gap-x-1">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className={`${barClass} h-9.5 w-9.5 rounded-lg`} />
                            ))}
                        </div>
                        <div className={`${barClass} h-9.5 w-16 rounded-lg`} />
                    </div>

                    <div className={`${barClass} h-4 w-44`} />
                </div>
            )}
        </div>
    );
}

export default TableSkeleton;
