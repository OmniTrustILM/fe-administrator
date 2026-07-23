import { describe, expect, test } from 'vitest';

import { AttributeSetMergeMode } from 'types/openapi';

import {
    extractComplianceErrors,
    externalCsrValidationModeDescription,
    externalCsrValidationModeLabel,
    requestValidationDefaultFormValues,
    requestValidationFormValuesToUpdateDto,
    resolveExternalCsrStrict,
} from './raProfileValidation';

describe('resolveExternalCsrStrict', () => {
    test('profile value wins over platform value', () => {
        expect(resolveExternalCsrStrict(false, true)).toBe(false);
        expect(resolveExternalCsrStrict(true, false)).toBe(true);
    });

    test('falls back to platform value when profile value is null or undefined', () => {
        expect(resolveExternalCsrStrict(null, false)).toBe(false);
        expect(resolveExternalCsrStrict(undefined, true)).toBe(true);
    });

    test('defaults to lenient when neither profile nor platform value is set (matches the backend resolution)', () => {
        expect(resolveExternalCsrStrict(null, null)).toBe(false);
        expect(resolveExternalCsrStrict(undefined, undefined)).toBe(false);
    });
});

describe('externalCsrValidationModeLabel', () => {
    test('maps strict flag to label', () => {
        expect(externalCsrValidationModeLabel(true)).toBe('Strict');
        expect(externalCsrValidationModeLabel(false)).toBe('Lenient');
    });

    test('maps strict flag to description', () => {
        expect(externalCsrValidationModeDescription(true)).toContain('rejected');
        expect(externalCsrValidationModeDescription(false)).toContain('accepted');
    });
});

describe('requestValidationDefaultFormValues', () => {
    test('uses platform settings when profile value is null', () => {
        expect(requestValidationDefaultFormValues(null, false)).toEqual({ usePlatformSettings: true, strict: false });
    });

    test('uses platform settings when profile value is undefined', () => {
        expect(requestValidationDefaultFormValues(undefined, true)).toEqual({ usePlatformSettings: true, strict: true });
    });

    test('uses explicit profile value when set', () => {
        expect(requestValidationDefaultFormValues(false, true)).toEqual({ usePlatformSettings: false, strict: false });
        expect(requestValidationDefaultFormValues(true, false)).toEqual({ usePlatformSettings: false, strict: true });
    });

    test('defaults to lenient when nothing is configured anywhere', () => {
        expect(requestValidationDefaultFormValues(undefined, undefined)).toEqual({ usePlatformSettings: true, strict: false });
    });
});

describe('requestValidationFormValuesToUpdateDto', () => {
    const currentConfiguration = {
        requestAttributes: [{ uuid: 'attr-1' }],
        mergeMode: 'merge',
        valueSourceBindings: [{ attributeName: 'cn' }],
        externalCsrValidationStrict: false,
    } as any;

    test('sends explicit strict flag when platform settings are not used', () => {
        expect(requestValidationFormValuesToUpdateDto({ usePlatformSettings: false, strict: true }).externalCsrValidationStrict).toBe(true);
        expect(requestValidationFormValuesToUpdateDto({ usePlatformSettings: false, strict: false }).externalCsrValidationStrict).toBe(
            false,
        );
    });

    test('sends null (inherit) when platform settings are used', () => {
        const dto = requestValidationFormValuesToUpdateDto({ usePlatformSettings: true, strict: true });
        expect(dto.externalCsrValidationStrict).toBeNull();
    });

    test('coerces merge mode to Static only and drops bindings while the feature is hidden, but echoes request attributes', () => {
        const dto = requestValidationFormValuesToUpdateDto({ usePlatformSettings: false, strict: true }, currentConfiguration);
        expect(dto).toEqual({
            requestAttributes: [{ uuid: 'attr-1' }],
            mergeMode: AttributeSetMergeMode.StaticOnly,
            valueSourceBindings: [],
            externalCsrValidationStrict: true,
        });
    });

    test('null survives JSON serialization so the backend receives the inherit marker', () => {
        const dto = requestValidationFormValuesToUpdateDto({ usePlatformSettings: true, strict: false }, currentConfiguration);
        expect(JSON.parse(JSON.stringify(dto))).toEqual({
            requestAttributes: [{ uuid: 'attr-1' }],
            mergeMode: AttributeSetMergeMode.StaticOnly,
            valueSourceBindings: [],
            externalCsrValidationStrict: null,
        });
    });

    test('omits requestAttributes but still coerces merge mode and bindings when there is no current configuration', () => {
        const dto = requestValidationFormValuesToUpdateDto({ usePlatformSettings: true, strict: false });
        expect(JSON.stringify(dto)).toBe('{"mergeMode":"staticOnly","valueSourceBindings":[],"externalCsrValidationStrict":null}');
    });

    test('round-trips merge mode and bindings once the feature is re-enabled', () => {
        const dto = requestValidationFormValuesToUpdateDto({ usePlatformSettings: false, strict: true }, currentConfiguration, true);
        expect(dto).toEqual({
            requestAttributes: [{ uuid: 'attr-1' }],
            mergeMode: 'merge',
            valueSourceBindings: [{ attributeName: 'cn' }],
            externalCsrValidationStrict: true,
        });
    });

    test('leaves merge mode and bindings undefined when re-enabled with no current configuration', () => {
        const dto = requestValidationFormValuesToUpdateDto({ usePlatformSettings: true, strict: false }, undefined, true);
        expect(dto.mergeMode).toBeUndefined();
        expect(dto.valueSourceBindings).toBeUndefined();
        expect(dto.externalCsrValidationStrict).toBeNull();
    });
});

describe('extractComplianceErrors', () => {
    test('returns undefined for non-422 errors', () => {
        expect(extractComplianceErrors({ status: 500, response: ['boom'] })).toBeUndefined();
        expect(extractComplianceErrors({ status: 400, response: { message: 'bad' } })).toBeUndefined();
        expect(extractComplianceErrors(undefined)).toBeUndefined();
        expect(extractComplianceErrors(new Error('network'))).toBeUndefined();
    });

    test('parses a plain array of messages', () => {
        expect(
            extractComplianceErrors({ status: 422, response: ['Subject CN — required attribute missing', 'SAN not permitted'] }),
        ).toEqual(['Subject CN — required attribute missing', 'SAN not permitted']);
    });

    test('parses an object with an errors list of strings', () => {
        expect(extractComplianceErrors({ status: 422, response: { message: 'CSR is not compliant', errors: ['e1', 'e2'] } })).toEqual([
            'e1',
            'e2',
        ]);
    });

    test('parses an object with an errors list of { message } items', () => {
        expect(
            extractComplianceErrors({ status: 422, response: { errors: [{ message: 'e1' }, { message: 'e2' }, { code: 'no-msg' }] } }),
        ).toEqual(['e1', 'e2']);
    });

    test('falls back to the top-level message when the errors list is empty or missing', () => {
        expect(extractComplianceErrors({ status: 422, response: { message: 'CSR is not compliant', errors: [] } })).toEqual([
            'CSR is not compliant',
        ]);
        expect(extractComplianceErrors({ status: 422, response: { message: 'CSR is not compliant' } })).toEqual(['CSR is not compliant']);
    });

    test('parses the wrapped 400 policy rejection (current backend behaviour) into violation lines', () => {
        const message =
            "Failed to submit certificate request: Uploaded certificate request does not satisfy the request-attribute policy of RA profile 'katja_ra_profile_1426' \nSubject RDN 'O' is not allowed by the request-attribute set\nSubject CN — required attribute missing";
        expect(extractComplianceErrors({ status: 400, response: { message } })).toEqual([
            "Subject RDN 'O' is not allowed by the request-attribute set",
            'Subject CN — required attribute missing',
        ]);
    });

    test('falls back to the headline when the wrapped 400 policy message carries no violation lines', () => {
        const message = "Uploaded certificate request does not satisfy the request-attribute policy of RA profile 'p'";
        expect(extractComplianceErrors({ status: 400, response: { message } })).toEqual([message]);
    });

    test('returns undefined for unrelated 400 errors', () => {
        expect(extractComplianceErrors({ status: 400, response: { message: 'Some other client error' } })).toBeUndefined();
        expect(extractComplianceErrors({ status: 400, response: 'plain string' })).toBeUndefined();
        expect(extractComplianceErrors({ status: 400 })).toBeUndefined();
    });

    test('returns undefined when the 422 body has no usable messages', () => {
        expect(extractComplianceErrors({ status: 422, response: [] })).toBeUndefined();
        expect(extractComplianceErrors({ status: 422, response: [42, {}] })).toBeUndefined();
        expect(extractComplianceErrors({ status: 422, response: {} })).toBeUndefined();
        expect(extractComplianceErrors({ status: 422, response: 'raw string body' })).toBeUndefined();
        expect(extractComplianceErrors({ status: 422 })).toBeUndefined();
    });
});
