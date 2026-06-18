import { describe, expect, test } from 'vitest';
import { FilterFieldType, PlatformEnum } from 'types/openapi';
import { resolveSigningRecordFilterField } from './signingRecordsDashboardFilters';

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
