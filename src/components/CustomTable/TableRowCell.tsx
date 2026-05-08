import type React from 'react';
import cn from 'classnames';
import Button from 'components/Button';
import type { TableDataRow, TableHeader } from './types';

export type TableRowCellProps = Readonly<{
    column: string | React.ReactNode | React.ReactNode[];
    index: number;
    row: TableDataRow;
    tblHeaders: TableHeader[] | undefined;
    hasDetails?: boolean;
    onDetailClick: (rowId: number | string) => void;
}>;

export function TableRowCell({ column, index, row, tblHeaders, hasDetails = false, onDetailClick }: TableRowCellProps) {
    const isFirstColumn = index === 0;
    const shouldShowButton = hasDetails && isFirstColumn && row.detailColumns && row.detailColumns.length > 0;
    const align = tblHeaders?.[index]?.align;
    const maxWidth = tblHeaders?.[index]?.maxWidth;
    const maxWidthCss = maxWidth == null ? undefined : `${maxWidth}px`;

    const cellStyle: React.CSSProperties = {
        ...(align ? { textAlign: align } : {}),
        ...(maxWidthCss ? { maxWidth: maxWidthCss, overflow: 'hidden', textOverflow: 'ellipsis' } : {}),
    };

    const contentClassName = maxWidthCss ? 'min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap' : '';

    return (
        <td style={cellStyle} className="px-2.5 py-2 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-neutral-200">
            {shouldShowButton ? (
                <Button
                    variant="transparent"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDetailClick(row.id);
                    }}
                    className={cn(
                        '!p-0 hover:bg-transparent text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-0 h-auto font-medium',
                        contentClassName,
                    )}
                >
                    {column}
                </Button>
            ) : (
                <div className={contentClassName}>{column ?? <></>}</div>
            )}
        </td>
    );
}
