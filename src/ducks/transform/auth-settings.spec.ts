import { describe, expect, test } from 'vitest';
import {
    transformAuthenticationSettingsDtoToModel,
    transformAuthenticationSettingsUpdateModelToDto,
    transformOAuth2ProviderSettingsDtoToModel,
    transformOAuth2ProviderSettingsUpdateModelToDto,
} from './auth-settings';

describe('auth-settings transforms', () => {
    test('transformAuthenticationSettingsDtoToModel copies fields', () => {
        const dto = { disableLocalhostUser: false, oauth2Providers: {} } as any;
        const result = transformAuthenticationSettingsDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformOAuth2ProviderSettingsDtoToModel copies fields', () => {
        const dto = { name: 'provider-1', clientId: 'client-id' } as any;
        const result = transformOAuth2ProviderSettingsDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformAuthenticationSettingsUpdateModelToDto copies fields', () => {
        const model = { disableLocalhostUser: true, oauth2Providers: {} } as any;
        const result = transformAuthenticationSettingsUpdateModelToDto(model);
        expect(result).toEqual(model);
        expect(result).not.toBe(model);
    });

    test('transformOAuth2ProviderSettingsUpdateModelToDto copies fields', () => {
        const model = { name: 'provider-2', clientSecret: 'secret' } as any;
        const result = transformOAuth2ProviderSettingsUpdateModelToDto(model);
        expect(result).toEqual(model);
        expect(result).not.toBe(model);
    });
});
