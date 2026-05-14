import type React from 'react';

export interface TableHeader {
    id: string;
    content: string | React.ReactNode;
    align?: 'left' | 'center' | 'right';
    sortable?: boolean;
    sort?: 'asc' | 'desc';
    sortType?: 'string' | 'numeric' | 'date';
    width?: string;
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
