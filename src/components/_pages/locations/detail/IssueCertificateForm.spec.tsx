import { test, expect } from '../../../../../playwright/ct-test';
import {
    csrDescriptorsWithSanDefault,
    type DispatchedAction,
    fillCommonNameAndClearSan,
    onlyCommonNameSubmitted,
    submittedCsrAttributes,
} from '../../test-utils/blankRequestAttribute';
import { IssueCertificateFormTestWrapper } from './IssueCertificateFormTestWrapper';

test.describe('Location IssueCertificateForm', () => {
    test('issueCertificate payload omits a CSR attribute whose default was cleared', async ({ mount, page }) => {
        const dispatched: DispatchedAction[] = [];
        await mount(
            <IssueCertificateFormTestWrapper onAction={(a) => dispatched.push(a)} csrAttributeDescriptors={csrDescriptorsWithSanDefault} />,
        );

        await page.getByTestId('select-certificateSelect-trigger').click();
        await page.getByRole('option', { name: 'RA One' }).click();
        await fillCommonNameAndClearSan(page);
        await page.getByRole('button', { name: 'Issue' }).click();

        // The entity provider builds the CSR from these attributes, so an empty value must not reach it.
        const submitted = await submittedCsrAttributes(dispatched, 'locations/issueCertificate', (p) => p.issueRequest.csrAttributes);
        expect(submitted).toEqual(onlyCommonNameSubmitted);
    });
});
