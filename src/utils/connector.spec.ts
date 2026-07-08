import { describe, expect, test } from 'vitest';
import { ConnectorVersion } from 'types/openapi';
import { getConnectorCapabilities, inventoryStatus } from './connector';

const interfaceEnum = {
    authority: { code: 'authority', label: 'Authority' },
    discovery: { code: 'discovery', label: 'Discovery' },
};
const featureEnum = {
    stateless: { code: 'stateless', label: 'Stateless' },
    openMetrics: { code: 'openMetrics', label: 'OpenMetrics' },
};
const functionGroupEnum = {
    authorityProvider: { code: 'authorityProvider', label: 'Authority Provider' },
};
const enums = { interfaceEnum, featureEnum, functionGroupEnum };

describe('connector utils', () => {
    describe('getConnectorCapabilities', () => {
        test('v2: dedupes interface codes, flattens and dedupes features, uses enum labels', () => {
            const result = getConnectorCapabilities(
                {
                    version: ConnectorVersion.V2,
                    functionGroups: [],
                    interfaces: [
                        { uuid: '1', code: 'discovery', version: 'v1', features: ['stateless'] },
                        { uuid: '2', code: 'discovery', version: 'v2', features: ['stateless', 'openMetrics'] },
                        { uuid: '3', code: 'authority', version: 'v2', features: [] },
                    ],
                } as any,
                enums,
            );

            expect(result.isV2).toBe(true);
            expect(result.caption).toBe('Supported Interfaces');
            expect(result.capabilityLabels).toEqual(['Discovery', 'Authority']);
            expect(result.featureLabels).toEqual(['Stateless', 'OpenMetrics']);
        });

        test('v2: falls back to raw codes when enum maps are empty', () => {
            const result = getConnectorCapabilities(
                {
                    version: ConnectorVersion.V2,
                    functionGroups: [],
                    interfaces: [{ uuid: '1', code: 'authority', version: 'v2', features: ['stateless'] }],
                } as any,
                { interfaceEnum: undefined, featureEnum: undefined, functionGroupEnum: undefined },
            );

            expect(result.capabilityLabels).toEqual(['authority']);
            expect(result.featureLabels).toEqual(['stateless']);
        });

        test('v2: empty interfaces yield empty label lists', () => {
            const result = getConnectorCapabilities({ version: ConnectorVersion.V2, functionGroups: [], interfaces: [] } as any, enums);

            expect(result.capabilityLabels).toEqual([]);
            expect(result.featureLabels).toEqual([]);
        });

        test('v1: uses function groups and deduped kinds', () => {
            const result = getConnectorCapabilities(
                {
                    version: ConnectorVersion.V1,
                    functionGroups: [
                        {
                            uuid: '1',
                            name: 'authorityProvider',
                            functionGroupCode: 'authorityProvider',
                            kinds: ['EJBCA', 'ADCS'],
                            endPoints: [],
                        },
                        { uuid: '2', name: 'otherProvider', functionGroupCode: 'otherProvider', kinds: ['EJBCA'], endPoints: [] },
                    ],
                } as any,
                enums,
            );

            expect(result.isV2).toBe(false);
            expect(result.caption).toBe('Function Groups');
            expect(result.capabilityLabels).toEqual(['Authority Provider', 'otherProvider']);
            expect(result.featureLabels).toEqual(['EJBCA', 'ADCS']);
        });
    });

    describe('inventoryStatus', () => {
        test('returns label and color for Success', () => {
            expect(inventoryStatus('Success')).toEqual(['Success', 'var(--status-success-color)']);
        });

        test('returns label and color for registered', () => {
            expect(inventoryStatus('registered')).toEqual(['Reistered', 'var(--status-success-color)']);
        });

        test('returns label and color for connected', () => {
            expect(inventoryStatus('connected')).toEqual(['Connected', 'var(--status-success-color)']);
        });

        test('returns label and color for failed', () => {
            expect(inventoryStatus('failed')).toEqual(['Failed', 'var(--status-danger-color)']);
        });

        test('returns label and color for Failed', () => {
            expect(inventoryStatus('Failed')).toEqual(['Failed', 'var(--status-danger-color)']);
        });

        test('returns label and color for offline', () => {
            expect(inventoryStatus('offline')).toEqual(['Offline', 'var(--status-danger-color)']);
        });

        test('returns label and color for waitingForApproval', () => {
            expect(inventoryStatus('waitingForApproval')).toEqual(['Waiting for Approval', 'var(--status-warning-color)']);
        });

        test('returns status and gray color for unknown status', () => {
            expect(inventoryStatus('custom')).toEqual(['custom', 'var(--status-gray-color)']);
        });

        test('returns Unknown and gray for empty string', () => {
            expect(inventoryStatus('')).toEqual(['Unknown', 'var(--status-gray-color)']);
        });
    });
});
