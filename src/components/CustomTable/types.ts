import type React from 'react';

export type SortDirection = 'asc' | 'desc';

export interface TableHeader {
    id: string;
    content: string | React.ReactNode;
    align?: 'left' | 'center' | 'right';
    sortable?: boolean;
    sort?: SortDirection;
    sortType?: 'string' | 'numeric' | 'date';
    width?: string;
    minWidth?: string;
    maxWidth?: number;
}

export interface TableDataRow {
    id: number | string;
    columns: (string | React.ReactNode | React.ReactNode[])[];
    detailColumns?: (string | React.ReactNode | React.ReactNode[])[];
    detailTitle?: string;
    options?: {
        useAccentBottomBorder?: boolean;
        rowClassName?: string;
    };
}
