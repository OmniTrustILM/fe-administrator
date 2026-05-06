import { describe, expect, test } from 'vitest';
import {
    transformLoggingSettingsDtoToModel,
    transformLoggingSettingsModelToDto,
    transformSettingsCertificatesDtoToModel,
    transformSettingsPlatformDtoToModel,
    transformSettingsUtilsDtoToModel,
} from './settings';

describe('settings transforms', () => {
    test('transformSettingsUtilsDtoToModel returns empty object when input is undefined', () => {
        const result = transformSettingsUtilsDtoToModel(undefined);
        expect(result).toEqual({});
    });

    test('transformSettingsUtilsDtoToModel spreads fields from defined input', () => {
        const dto = { utilsUrl: 'http://utils.example.com' } as any;
        const result = transformSettingsUtilsDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformSettingsCertificatesDtoToModel copies fields', () => {
        const dto = { validationEnabled: true, renewalThreshold: 30 } as any;
        const result = transformSettingsCertificatesDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformSettingsPlatformDtoToModel with absent certificates and utils sets both to undefined', () => {
        const dto = { someField: 'value' } as any;
        const result = transformSettingsPlatformDtoToModel(dto);
        expect(result.certificates).toBeUndefined();
        expect(result.utils).toBeUndefined();
    });

    test('transformSettingsPlatformDtoToModel with certificates and utils present includes both', () => {
        const dto = {
            someField: 'value',
            certificates: { validationEnabled: true },
            utils: { utilsUrl: 'http://utils.example.com' },
        } as any;
        const result = transformSettingsPlatformDtoToModel(dto);
        expect(result.certificates).toBeDefined();
        expect(result.utils).toBeDefined();
    });

    test('transformLoggingSettingsDtoToModel copies fields', () => {
        const dto = { auditLogsEnabled: true, eventLogsEnabled: false } as any;
        const result = transformLoggingSettingsDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformLoggingSettingsModelToDto copies fields', () => {
        const model = { auditLogsEnabled: false, eventLogsEnabled: true } as any;
        const result = transformLoggingSettingsModelToDto(model);
        expect(result).toEqual(model);
        expect(result).not.toBe(model);
    });
});
