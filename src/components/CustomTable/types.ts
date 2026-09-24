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
        /** Anything about the row that is not its fill — weight, emphasis. The fill is `rowBackground`. */
        rowClassName?: string;
        /**
         * The row's fill, as its own field rather than one more class in `rowClassName`: the pinned
         * trailing cell has to paint the same colour to stay opaque over the columns scrolling beneath
         * it, and it cannot tell a background class from any other.
         */
        rowBackground?: string;
    };
}
