import type { Page } from '@playwright/test';

import { testInitialState } from 'ducks/test-reducers';
import type { AttributeDescriptorModel } from 'types/attributes';
import { AttributeContentType, AttributeType } from 'types/openapi';

import { expect } from '../../../../playwright/ct-test';

export type DispatchedAction = { type: string; payload?: any };

type SubmittedAttribute = { name: string; content?: { data?: unknown }[] };

const stringDescriptor = (name: string, label: string, required: boolean) =>
    ({
        type: AttributeType.Data,
        name,
        uuid: `csr-${name}-uuid`,
        contentType: AttributeContentType.String,
        properties: { label, required, readOnly: false, visible: true, list: false, multiSelect: false },
    }) as AttributeDescriptorModel;

// The form pre-fills the default content, so clearing the field is what produces an empty value.
export const csrDescriptorsWithSanDefault = [
    stringDescriptor('commonName', 'Common Name', true),
    { ...stringDescriptor('SAN_DNS', 'Subject Alternative Name', false), content: [{ data: 'default.example.com' }] },
] as AttributeDescriptorModel[];

export const csrAttributesState = {
    certificates: { ...testInitialState.certificates, csrAttributeDescriptors: csrDescriptorsWithSanDefault },
};

export const existingKeyState = {
    tokenprofiles: { tokenProfiles: [{ uuid: 'token-profile-uuid', name: 'Test Token Profile' }] } as any,
    cryptographicKeys: {
        ...testInitialState.cryptographicKeys,
        // Selecting a key reads its items to fetch signature descriptors; none means no fetch.
        cryptographicKeyPairs: [{ uuid: 'key-uuid', name: 'Test Key', tokenProfileUuid: 'token-profile-uuid', items: [] }],
    } as any,
};

export const onlyCommonNameSubmitted = [{ name: 'commonName', data: 'cmp-device-07' }];

export async function selectExistingKey(page: Page, keySourceTestId: string) {
    await page.getByTestId(`${keySourceTestId}-trigger`).click();
    await page.getByRole('option', { name: 'Existing Key' }).click();
    await page.getByTestId('select-tokenProfileUuid-trigger').click();
    await page.getByRole('option', { name: 'Test Token Profile' }).click();
    await page.getByTestId('select-keyUuid-trigger').click();
    await page.getByRole('option', { name: 'Test Key' }).click();
}

export async function fillCommonNameAndClearSan(page: Page) {
    const commonNameInput = page.getByTestId('text-input-__attributes__csrAttributes__.commonName');
    await commonNameInput.click();
    await commonNameInput.fill('cmp-device-07');
    const sanInput = page.getByTestId('text-input-__attributes__csrAttributes__.SAN_DNS');
    await expect(sanInput).toHaveValue('default.example.com');
    await sanInput.click();
    await sanInput.fill('');
}

export async function submittedCsrAttributes(
    dispatched: DispatchedAction[],
    actionType: string,
    pickAttributes: (payload: any) => SubmittedAttribute[],
) {
    await expect.poll(() => dispatched.find((action) => action.type === actionType)).toBeTruthy();
    const submitted = dispatched.find((action) => action.type === actionType) as DispatchedAction;
    return pickAttributes(submitted.payload).map((attribute) => ({ name: attribute.name, data: attribute.content?.[0]?.data }));
}
