import { describe, expect, test } from 'vitest';
import { getProxyStatusColor } from './proxy';
import { ProxyStatus } from 'types/openapi';

describe('proxy utils', () => {
    describe('getProxyStatusColor', () => {
        test('returns success color for Connected status', () => {
            expect(getProxyStatusColor(ProxyStatus.Connected)).toBe('success');
        });

        test('returns dark color for Disconnected status', () => {
            expect(getProxyStatusColor(ProxyStatus.Disconnected)).toBe('gray');
        });

        test('returns danger color for Failed status', () => {
            expect(getProxyStatusColor(ProxyStatus.Failed)).toBe('danger');
        });

        test('returns warning color for WaitingForInstallation status', () => {
            expect(getProxyStatusColor(ProxyStatus.WaitingForInstallation)).toBe('warning');
        });

        test('returns gray color for Provisioning status', () => {
            expect(getProxyStatusColor(ProxyStatus.Provisioning)).toBe('secondary');
        });

        test('returns gray color for Initialized status', () => {
            expect(getProxyStatusColor(ProxyStatus.Initialized)).toBe('secondary');
        });
    });
});
