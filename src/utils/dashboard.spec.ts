import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { CertificateState, PlatformEnum, SecretState, SecretType } from 'types/openapi';
import {
    getCertificateDonutChartColors,
    getDefaultColors,
    getValues,
    getCertificateDonutChartColorsByDaysOfExpiration,
    getDonutChartColorsByRandomNumberOfOptions,
    getSecretDonutChartColors,
    useGetLabels,
} from './dashboard';
import { createMockStore, withProviders } from './test-helpers';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function UseGetLabelsHarness({ data, onLabels }: { data: Record<string, number>; onLabels: (labels: string[]) => void }) {
    const labels = useGetLabels(data as any);

    useEffect(() => {
        onLabels(labels);
    }, [labels, onLabels]);

    return createElement('div', null, labels.join('|'));
}

let container: HTMLDivElement | null = null;
let root: Root | null = null;

afterEach(() => {
    if (root) {
        act(() => {
            root?.unmount();
        });
    }
    root = null;
    container?.remove();
    container = null;
});

describe('dashboard utils', () => {
    describe('getDefaultColors', () => {
        test('should return array of 5 hex colors', () => {
            const colors = getDefaultColors();
            expect(colors).toHaveLength(5);
            expect(colors.every((c) => /^#[0-9a-fA-F]{6}$/.test(c))).toBe(true);
        });
    });

    describe('getValues', () => {
        test('should extract values from DashboardDict', () => {
            const data = { Active: 10, Expired: 5, Pending: 3 };
            expect(getValues(data)).toEqual([10, 5, 3]);
        });

        test('should return empty array for empty object', () => {
            expect(getValues({})).toEqual([]);
        });
    });

    describe('getCertificateDonutChartColorsByDaysOfExpiration', () => {
        test('should return undefined for undefined input', () => {
            expect(getCertificateDonutChartColorsByDaysOfExpiration()).toBeUndefined();
        });

        test('should map keys to colors', () => {
            const data = { '10': 5, '30': 10, Expired: 2 };
            const result = getCertificateDonutChartColorsByDaysOfExpiration(data);
            expect(result?.colors).toHaveLength(3);
            expect(result?.colors).toContain('#6B7280'); // 10
            expect(result?.colors).toContain('#EAB308'); // 30
            expect(result?.colors).toContain('#EF4444'); // Expired
        });
    });

    describe('getSecretDonutChartColors', () => {
        test('returns empty colors for undefined input', () => {
            expect(getSecretDonutChartColors()).toEqual({ colors: [] });
        });

        test('returns empty colors for empty object', () => {
            expect(getSecretDonutChartColors({})).toEqual({ colors: [] });
        });

        test('maps SecretState keys to correct hex colors', () => {
            const data = {
                [SecretState.Active]: 3,
                [SecretState.Expired]: 1,
                [SecretState.Failed]: 2,
            };
            const result = getSecretDonutChartColors(data);
            expect(result.colors).toHaveLength(3);
            expect(result.colors).toContain('#14B8A6'); // Active
            expect(result.colors).toContain('#9CA3AF'); // Expired
            expect(result.colors).toContain('#EF4444'); // Failed
        });

        test('preserves key order in the colors array', () => {
            const data = {
                [SecretState.Active]: 5,
                [SecretState.Inactive]: 2,
                [SecretState.Revoked]: 1,
            };
            const result = getSecretDonutChartColors(data);
            expect(result.colors).toEqual(['#14B8A6', '#1F2937', '#6B7280']);
        });

        test('falls back to default gray for unknown status', () => {
            const result = getSecretDonutChartColors({ unknown: 1 });
            expect(result.colors).toEqual(['#6B7280']);
        });
    });

    describe('getCertificateDonutChartColors', () => {
        test('returns empty colors for undefined input', () => {
            expect(getCertificateDonutChartColors()).toEqual({ colors: [] });
        });

        test('returns empty colors for empty object', () => {
            expect(getCertificateDonutChartColors({})).toEqual({ colors: [] });
        });

        test('maps certificate statuses to colors in key order', () => {
            const result = getCertificateDonutChartColors({
                [CertificateState.Issued]: 2,
                [CertificateState.Rejected]: 1,
                [CertificateState.PendingIssue]: 3,
            });

            expect(result.colors).toEqual(['#14B8A6', '#EF4444', '#3782a5']);
        });

        test('handles falsey color branch in updateColorObject', async () => {
            vi.resetModules();

            vi.doMock('./certificate', async () => {
                const actual = await vi.importActual<typeof import('./certificate')>('./certificate');
                return {
                    ...actual,
                    getCertificateStatusColor: vi.fn(() => undefined),
                };
            });

            const mod = await import('./dashboard');
            const result = mod.getCertificateDonutChartColors({ [CertificateState.Issued]: 1 });

            expect(result.colors).toEqual([]);

            vi.resetModules();
            vi.doUnmock('./certificate');
        });
    });

    describe('useGetLabels', () => {
        test('prefers certificate labels, then secret labels, then key split fallback', async () => {
            container = document.createElement('div');
            document.body.appendChild(container);
            root = createRoot(container);

            let capturedLabels: string[] = [];

            const store = createMockStore({
                enums: {
                    platformEnums: {
                        [PlatformEnum.CertificateState]: {
                            [CertificateState.Issued]: { label: 'Issued Label' },
                        },
                        [PlatformEnum.CertificateValidationStatus]: {},
                        [PlatformEnum.ComplianceStatus]: {},
                        [PlatformEnum.ComplianceRuleStatus]: {},
                        [PlatformEnum.CertificateSubjectType]: {},
                        [PlatformEnum.SecretState]: {
                            [SecretState.Active]: { label: 'Active Secret Label' },
                        },
                        [PlatformEnum.SecretType]: {
                            [SecretType.Generic]: { label: 'Generic Secret Type' },
                        },
                    },
                },
            } as any);

            await act(async () => {
                root?.render(
                    withProviders(
                        createElement(UseGetLabelsHarness, {
                            data: {
                                [CertificateState.Issued]: 1,
                                [SecretState.Active]: 2,
                                'unknown=valueFromSplit': 3,
                            },
                            onLabels: (labels: string[]) => {
                                capturedLabels = labels;
                            },
                        }),
                        { store },
                    ),
                );
            });

            expect(capturedLabels).toEqual(['Issued Label', 'Active Secret Label', 'valueFromSplit']);
        });

        test('supports secret type label and split fallback without delimiter', async () => {
            container = document.createElement('div');
            document.body.appendChild(container);
            root = createRoot(container);

            let capturedLabels: string[] = [];

            const store = createMockStore({
                enums: {
                    platformEnums: {
                        [PlatformEnum.CertificateState]: {},
                        [PlatformEnum.CertificateValidationStatus]: {},
                        [PlatformEnum.ComplianceStatus]: {},
                        [PlatformEnum.ComplianceRuleStatus]: {},
                        [PlatformEnum.CertificateSubjectType]: {},
                        [PlatformEnum.SecretState]: {},
                        [PlatformEnum.SecretType]: {
                            [SecretType.Generic]: { label: 'Generic Secret Type' },
                        },
                    },
                },
            } as any);

            await act(async () => {
                root?.render(
                    withProviders(
                        createElement(UseGetLabelsHarness, {
                            data: {
                                [SecretType.Generic]: 1,
                                plainFallback: 2,
                            },
                            onLabels: (labels: string[]) => {
                                capturedLabels = labels;
                            },
                        }),
                        { store },
                    ),
                );
            });

            expect(capturedLabels).toEqual(['Generic Secret Type', 'plainFallback']);
        });
    });

    describe('getDonutChartColorsByRandomNumberOfOptions', () => {
        test('should return n colors when n <= base colors length', () => {
            const result = getDonutChartColorsByRandomNumberOfOptions(3);
            expect(result.colors).toHaveLength(3);
        });

        test('should return exact number of requested colors', () => {
            const result = getDonutChartColorsByRandomNumberOfOptions(15);
            expect(result.colors).toHaveLength(15);
        });

        test('should return valid hex colors', () => {
            const result = getDonutChartColorsByRandomNumberOfOptions(5);
            expect(result.colors.every((c) => /^#[0-9a-fA-F]{6}$/.test(c))).toBe(true);
        });
    });
});
