import type React from 'react';

export type SortDirection = 'asc' | 'desc';

export interface TableHeader {
    id: string;
    content: string | React.ReactNode;
    /**
     * Auxiliary content rendered beside the heading and outside the sort button — a legend toggletip,
     * for example. A sortable heading is a `<button>`, so an interactive control belongs here rather
     * than in `content`, where it would nest one interactive element inside another.
     */
    info?: React.ReactNode;
    align?: 'left' | 'center' | 'right';
    /**
     * Renders the heading for screen readers only, leaving the header cell visually blank.
     *
     * For a narrow icon column whose meaning is carried by the icon itself, where a visible label
     * would be wider than the column. The heading is still required rather than empty, because the
     * header may be a sort button and needs an accessible name.
     */
    headingHidden?: boolean;
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
