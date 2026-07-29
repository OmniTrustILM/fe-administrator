import { describe, expect, test } from 'vitest';
import { FilterConditionOperator, FilterFieldSource, FilterFieldType, PlatformEnum } from 'types/openapi';
import { buildSigningTimeWindowFilter, resolveSigningRecordFilterField, SIGNING_WINDOW_HOURS } from './signingRecordsDashboardFilters';

const grouped = [
    {
        filterFieldSource: undefined,
        searchFieldData: [
            { fieldIdentifier: 'SIGNING_PROFILE_NAME', fieldLabel: 'Signing Profile', type: FilterFieldType.String, conditions: [] },
            { fieldIdentifier: 'REQUESTED_BY', fieldLabel: 'Requested By', type: FilterFieldType.String, conditions: [] },
            { fieldIdentifier: 'SIGNING_TIME', fieldLabel: 'Signing Time', type: FilterFieldType.Datetime, conditions: [] },
            {
                fieldIdentifier: 'WORKFLOW',
                fieldLabel: 'Workflow Type',
                type: FilterFieldType.List,
                conditions: [],
                platformEnum: PlatformEnum.SigningWorkflowType,
            },
            {
                fieldIdentifier: 'PROTOCOL',
                fieldLabel: 'Protocol',
                type: FilterFieldType.List,
                conditions: [],
                platformEnum: PlatformEnum.SigningProtocol,
            },
            {
                fieldIdentifier: 'SCHEME',
                fieldLabel: 'Scheme',
                type: FilterFieldType.List,
                conditions: [],
                platformEnum: PlatformEnum.SigningScheme,
            },
        ],
    },
] as any;

describe('resolveSigningRecordFilterField', () => {
    test('resolves enum kinds by platformEnum', () => {
        expect(resolveSigningRecordFilterField(grouped, 'workflowType')?.fieldIdentifier).toBe('WORKFLOW');
        expect(resolveSigningRecordFilterField(grouped, 'protocol')?.fieldIdentifier).toBe('PROTOCOL');
        expect(resolveSigningRecordFilterField(grouped, 'scheme')?.fieldIdentifier).toBe('SCHEME');
    });

    test('resolves profile, requester and signingTime by label/type', () => {
        expect(resolveSigningRecordFilterField(grouped, 'profile')?.fieldIdentifier).toBe('SIGNING_PROFILE_NAME');
        expect(resolveSigningRecordFilterField(grouped, 'requester')?.fieldIdentifier).toBe('REQUESTED_BY');
        expect(resolveSigningRecordFilterField(grouped, 'signingTime')?.fieldIdentifier).toBe('SIGNING_TIME');
    });

    test('returns undefined when nothing matches', () => {
        expect(resolveSigningRecordFilterField([], 'profile')).toBeUndefined();
    });
});

describe('buildSigningTimeWindowFilter', () => {
    const now = new Date('2026-07-29T12:00:00.000Z');

    test('builds a lower-bound filter on the signing time field', () => {
        expect(buildSigningTimeWindowFilter(grouped, SIGNING_WINDOW_HOURS.last24h, now)).toEqual([
            {
                fieldSource: FilterFieldSource.Property,
                condition: FilterConditionOperator.GreaterOrEqual,
                fieldIdentifier: 'SIGNING_TIME',
                value: '2026-07-28T12:00:00.000Z',
            },
        ]);
    });

    test('subtracts the whole window for the 7 day tile', () => {
        expect(buildSigningTimeWindowFilter(grouped, SIGNING_WINDOW_HOURS.last7d, now)[0].value).toBe('2026-07-22T12:00:00.000Z');
    });

    test('returns no filter when the signing time field is not searchable', () => {
        expect(buildSigningTimeWindowFilter([], SIGNING_WINDOW_HOURS.last24h, now)).toEqual([]);
    });
});
