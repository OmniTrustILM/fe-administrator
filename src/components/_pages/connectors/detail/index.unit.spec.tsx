import { isValidElement } from 'react';
import { describe, expect, it } from 'vitest';

import type { TableDataRow } from 'components/CustomTable';
import { HealthStatus } from 'types/openapi';
import { buildHealthRows } from './index';

function badgeColor(rows: TableDataRow[], rowId: string) {
    const badge = rows.find((row) => row.id === rowId)?.columns[1];
    return isValidElement<{ color?: string }>(badge) ? badge.props.color : undefined;
}

describe('ConnectorDetail health rows', () => {
    it.each([
        [HealthStatus.Up, 'success'],
        [HealthStatus.Degraded, 'warning'],
        [HealthStatus.Down, 'danger'],
        [HealthStatus.OutOfService, 'danger'],
        [HealthStatus.Unknown, 'transparent'],
    ])('shows a %s status as a %s badge on the overall and component rows', (status, color) => {
        const rows = buildHealthRows({ status, parts: { profile: { status } } });

        expect(badgeColor(rows, 'overallHealth')).toBe(color);
        expect(badgeColor(rows, 'profile')).toBe(color);
    });
});
