import { describe, expect, test } from 'vitest';
import {
    getComplianceProfileStatusColor,
    truncateText,
    getRulesAndGroupsTableHeaders,
    getAssignedInternalListOfGroupsAndRules,
    getAssignedProviderListOfGroupsAndRules,
    formatAvailableRulesAndGroups,
    getListOfResources,
    makeOptions,
    rulesSourceOptions,
} from './compliance-profile';
import { ComplianceRuleAvailabilityStatus, Resource } from 'types/openapi';

describe('compliance-profile utils', () => {
    describe('getComplianceProfileStatusColor', () => {
        test('returns success for Available', () => {
            expect(getComplianceProfileStatusColor(ComplianceRuleAvailabilityStatus.Available)).toBe('success');
        });
        test('returns danger for NotAvailable', () => {
            expect(getComplianceProfileStatusColor(ComplianceRuleAvailabilityStatus.NotAvailable)).toBe('danger');
        });
        test('returns warning for Updated', () => {
            expect(getComplianceProfileStatusColor(ComplianceRuleAvailabilityStatus.Updated)).toBe('warning');
        });
    });

    describe('truncateText', () => {
        test('returns text as-is when within maxLength', () => {
            expect(truncateText('hello', 10)).toBe('hello');
        });
        test('truncates and appends ellipsis when over maxLength', () => {
            expect(truncateText('hello world', 5)).toBe('hello…');
        });
    });

    describe('getRulesAndGroupsTableHeaders', () => {
        test('assigned type includes status column', () => {
            const headers = getRulesAndGroupsTableHeaders('assigned');
            expect(headers.some((h: any) => h.id === 'status')).toBe(true);
        });
        test('available type has no status column', () => {
            const headers = getRulesAndGroupsTableHeaders('available');
            expect(headers.some((h: any) => h.id === 'status')).toBe(false);
        });
        test('both have type, name, resource, action', () => {
            const assigned = getRulesAndGroupsTableHeaders('assigned');
            const available = getRulesAndGroupsTableHeaders('available');
            const ids = (arr: { id: string }[]) => arr.map((h) => h.id);
            expect(ids(assigned)).toContain('type');
            expect(ids(assigned)).toContain('name');
            expect(ids(available)).toContain('type');
            expect(ids(available)).toContain('name');
        });
    });

    describe('getAssignedInternalListOfGroupsAndRules', () => {
        test('returns empty array when profile is undefined', () => {
            expect(getAssignedInternalListOfGroupsAndRules(undefined)).toEqual([]);
        });
        test('maps internal rules with entityDetails', () => {
            const profile = {
                internalRules: [
                    { name: 'r1', resource: Resource.Certificates },
                    { name: 'r2', resource: Resource.Certificates },
                ],
            } as any;
            const result = getAssignedInternalListOfGroupsAndRules(profile);
            expect(result).toHaveLength(2);
            expect(result[0].entityDetails).toEqual({ entityType: 'rule' });
        });
        test('filters by resource when provided', () => {
            const profile = {
                internalRules: [
                    { name: 'r1', resource: Resource.Certificates },
                    { name: 'r2', resource: Resource.Authorities },
                ],
            } as any;
            const result = getAssignedInternalListOfGroupsAndRules(profile, Resource.Certificates);
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('r1');
        });
    });

    describe('getAssignedProviderListOfGroupsAndRules', () => {
        test('returns empty array when profile is undefined', () => {
            expect(getAssignedProviderListOfGroupsAndRules(undefined)).toEqual([]);
        });
        test('flattens provider rules and groups with entityDetails', () => {
            const profile = {
                providerRules: [
                    {
                        connectorUuid: 'c1',
                        connectorName: 'Conn1',
                        kind: 'kind1',
                        rules: [{ name: 'r1', resource: Resource.Certificates }],
                        groups: [{ name: 'g1', resource: Resource.Certificates }],
                    },
                ],
            } as any;
            const result = getAssignedProviderListOfGroupsAndRules(profile);
            expect(result.length).toBeGreaterThanOrEqual(1);
            expect(result[0].entityDetails?.entityType).toBeDefined();
        });
    });

    describe('formatAvailableRulesAndGroups', () => {
        test('adds entityDetails by type', () => {
            const list = [{ uuid: 'u1', name: 'Rule 1' }];
            const result = formatAvailableRulesAndGroups('rule', list as any);
            expect(result).toHaveLength(1);
            expect(result[0].entityDetails).toEqual({ entityType: 'rule' });
        });
    });

    describe('getListOfResources', () => {
        test('returns All plus unique resources', () => {
            const list = [
                { resource: Resource.Certificates },
                { resource: Resource.Certificates },
                { resource: Resource.Authorities },
            ] as any[];
            expect(getListOfResources(list)).toEqual(['All', Resource.Certificates, Resource.Authorities]);
        });
        test('returns only All for empty list', () => {
            expect(getListOfResources([])).toEqual(['All']);
        });
    });

    describe('makeOptions', () => {
        test('filters out profiles that are in associations', () => {
            const profiles = [
                { uuid: 'u1', name: 'P1' },
                { uuid: 'u2', name: 'P2' },
            ];
            const associations = [{ objectUuid: 'u1' }];
            const result = makeOptions(profiles as any, associations);
            expect(result).toHaveLength(1);
            expect(result[0].value.uuid).toBe('u2');
            expect(result[0].label).toBe('P2');
        });
        test('returns all as options when no associations', () => {
            const profiles = [{ uuid: 'u1', name: 'P1' }];
            const result = makeOptions(profiles as any, []);
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({ value: profiles[0], label: 'P1' });
        });
    });

    describe('rulesSourceOptions', () => {
        test('has Provider and Internal', () => {
            expect(rulesSourceOptions).toHaveLength(2);
            expect(rulesSourceOptions.map((o) => o.value)).toContain('Provider');
            expect(rulesSourceOptions.map((o) => o.value)).toContain('Internal');
        });
    });
});
