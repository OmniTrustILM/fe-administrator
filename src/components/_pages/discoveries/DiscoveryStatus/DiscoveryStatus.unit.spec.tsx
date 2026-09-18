import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import DiscoveryStatusBadge from './index';
import { DiscoveryStatus } from 'types/openapi';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('DiscoveryStatus badge', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(async () => {
        await act(async () => root.unmount());
        container.remove();
    });

    it.each<[DiscoveryStatus, string]>([
        [DiscoveryStatus.InProgress, 'In Progress'],
        [DiscoveryStatus.Processing, 'Processing'],
        [DiscoveryStatus.Completed, 'Completed'],
        [DiscoveryStatus.Warning, 'Warning'],
        [DiscoveryStatus.Failed, 'Failed'],
        [DiscoveryStatus.Stopped, 'Stopped'],
        [DiscoveryStatus.Cancelled, 'Cancelled'],
    ])('renders %s as "%s"', async (status, text) => {
        await act(async () => root.render(<DiscoveryStatusBadge status={status} />));

        expect(container.textContent).toBe(text);
    });

    it('covers every value of the enum', () => {
        // The map in the component is typed exhaustively; this pins the wire values it must know about.
        expect(Object.values(DiscoveryStatus).sort()).toEqual(
            ['cancelled', 'completed', 'failed', 'inProgress', 'processing', 'stopped', 'warning'].sort(),
        );
    });

    it('renders Unknown for a missing status', async () => {
        await act(async () => root.render(<DiscoveryStatusBadge status={undefined} />));

        expect(container.textContent).toBe('Unknown');
    });
});
