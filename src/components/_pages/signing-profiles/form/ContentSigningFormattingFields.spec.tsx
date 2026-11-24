import { test, expect } from 'playwright/ct-test';
import type { Page } from '@playwright/test';
import { SignatureLevel } from 'types/openapi';
import { ContentSigningFormattingFieldsTestWrapper, type DeclarationsByConnector } from './ContentSigningFormattingFieldsTestWrapper';

const connectors = [
    { uuid: 'c-pades', name: 'PAdES Connector' },
    { uuid: 'c-broken', name: 'Broken Connector' },
    { uuid: 'c-empty', name: 'Empty Connector' },
    { uuid: 'c-custom', name: 'Custom Connector' },
];

const declarationsByConnector: DeclarationsByConnector = {
    'c-pades': [
        {
            code: 'pades',
            label: 'PAdES',
            levels: [
                { level: SignatureLevel.Signed, name: 'PAdES-B' },
                { level: SignatureLevel.Timestamped, name: 'PAdES-B-T' },
            ],
            transferModes: [],
        },
        {
            code: 'cades',
            label: 'CAdES',
            levels: [{ level: SignatureLevel.Signed, name: 'CAdES-B' }],
            transferModes: [],
        },
    ],
    'c-broken': null,
    'c-empty': [],
    'c-custom': [
        {
            code: 'x-vendor-family',
            label: 'Vendor Family',
            levels: [{ level: SignatureLevel.Signed, name: 'Vendor-B' }],
            transferModes: [],
        },
    ],
};

async function choose(page: Page, selectId: string, option: string) {
    await page.getByTestId(`select-${selectId}-trigger`).click();
    await page.getByRole('option', { name: option, exact: true }).click();
}

async function expectDraft(page: Page, draft: object) {
    await expect(page.getByTestId('draft')).toHaveText(JSON.stringify(draft));
}

test.describe('ContentSigningFormattingFields', () => {
    test('offers the families and levels the selected connector declares, under their own names', async ({ mount, page }) => {
        await mount(
            <ContentSigningFormattingFieldsTestWrapper connectors={connectors} declarationsByConnector={declarationsByConnector} />,
        );

        await choose(page, 'contentSigningFormattingConnector', 'PAdES Connector');
        await page.getByTestId('select-signatureFamily-trigger').click();
        await expect(page.getByRole('option')).toHaveText(['PAdES', 'CAdES']);
        await page.getByRole('option', { name: 'PAdES', exact: true }).click();

        await page.getByTestId('select-signatureLevel-trigger').click();
        await expect(page.getByRole('option')).toHaveText(['PAdES-B', 'PAdES-B-T']);
        await page.getByRole('option', { name: 'PAdES-B-T', exact: true }).click();

        await expectDraft(page, { connectorUuid: 'c-pades', familyCode: 'pades', level: SignatureLevel.Timestamped });
    });

    test('clears the level on a family change and both on a connector change', async ({ mount, page }) => {
        await mount(
            <ContentSigningFormattingFieldsTestWrapper connectors={connectors} declarationsByConnector={declarationsByConnector} />,
        );
        await choose(page, 'contentSigningFormattingConnector', 'PAdES Connector');
        await choose(page, 'signatureFamily', 'PAdES');
        await choose(page, 'signatureLevel', 'PAdES-B');

        await choose(page, 'signatureFamily', 'CAdES');
        await expectDraft(page, { connectorUuid: 'c-pades', familyCode: 'cades' });

        await choose(page, 'contentSigningFormattingConnector', 'Empty Connector');
        await expectDraft(page, { connectorUuid: 'c-empty' });
    });

    test('names the connector whose declarations cannot be read and keeps the others selectable', async ({ mount, page }) => {
        await mount(
            <ContentSigningFormattingFieldsTestWrapper connectors={connectors} declarationsByConnector={declarationsByConnector} />,
        );

        await choose(page, 'contentSigningFormattingConnector', 'Broken Connector');
        await expect(page.getByText('The declarations of Broken Connector could not be read. Connector unreachable')).toBeVisible();

        await choose(page, 'contentSigningFormattingConnector', 'PAdES Connector');
        await expect(page.getByText('The declarations of Broken Connector could not be read.')).toBeHidden();
        await choose(page, 'signatureFamily', 'PAdES');
        await expectDraft(page, { connectorUuid: 'c-pades', familyCode: 'pades' });
    });

    test('says when a connector declares no signature family', async ({ mount, page }) => {
        await mount(
            <ContentSigningFormattingFieldsTestWrapper connectors={connectors} declarationsByConnector={declarationsByConnector} />,
        );

        await choose(page, 'contentSigningFormattingConnector', 'Empty Connector');

        await expect(page.getByText('Empty Connector declares no signature family.')).toBeVisible();
    });

    test('keeps the family and level of a profile being edited', async ({ mount, page }) => {
        const initialDraft = { connectorUuid: 'c-pades', familyCode: 'pades', level: SignatureLevel.Signed };
        await mount(
            <ContentSigningFormattingFieldsTestWrapper
                connectors={connectors}
                declarationsByConnector={declarationsByConnector}
                initialDraft={initialDraft}
            />,
        );

        await expect(page.getByTestId('select-signatureLevel-trigger')).toContainText('PAdES-B');
        await expectDraft(page, initialDraft);
    });

    test('authorizes the declarations fetch against the profile being edited', async ({ mount, page }) => {
        await mount(
            <ContentSigningFormattingFieldsTestWrapper
                connectors={connectors}
                declarationsByConnector={declarationsByConnector}
                initialDraft={{ connectorUuid: 'c-pades' }}
                signingProfileUuid="sp-1"
            />,
        );

        await expect(page.getByTestId('declarations-requests')).toHaveText(
            JSON.stringify([{ connectorUuid: 'c-pades', signingProfileUuid: 'sp-1' }]),
        );
    });

    test('offers a family code that only the connector knows', async ({ mount, page }) => {
        await mount(
            <ContentSigningFormattingFieldsTestWrapper connectors={connectors} declarationsByConnector={declarationsByConnector} />,
        );

        await choose(page, 'contentSigningFormattingConnector', 'Custom Connector');
        await choose(page, 'signatureFamily', 'Vendor Family');
        await choose(page, 'signatureLevel', 'Vendor-B');

        await expectDraft(page, { connectorUuid: 'c-custom', familyCode: 'x-vendor-family', level: SignatureLevel.Signed });
    });

    test('clears the family and level when another connector replaces a complete choice', async ({ mount, page }) => {
        await mount(
            <ContentSigningFormattingFieldsTestWrapper connectors={connectors} declarationsByConnector={declarationsByConnector} />,
        );
        await choose(page, 'contentSigningFormattingConnector', 'PAdES Connector');
        await choose(page, 'signatureFamily', 'CAdES');
        await choose(page, 'signatureLevel', 'CAdES-B');

        await choose(page, 'contentSigningFormattingConnector', 'Custom Connector');

        await expectDraft(page, { connectorUuid: 'c-custom' });
    });

    test('keeps the family and level when the same connector and family are chosen again', async ({ mount, page }) => {
        await mount(
            <ContentSigningFormattingFieldsTestWrapper connectors={connectors} declarationsByConnector={declarationsByConnector} />,
        );
        await choose(page, 'contentSigningFormattingConnector', 'PAdES Connector');
        await choose(page, 'signatureFamily', 'PAdES');
        await choose(page, 'signatureLevel', 'PAdES-B-T');

        await choose(page, 'signatureFamily', 'PAdES');
        await choose(page, 'contentSigningFormattingConnector', 'PAdES Connector');

        await expectDraft(page, { connectorUuid: 'c-pades', familyCode: 'pades', level: SignatureLevel.Timestamped });
    });

    test('clearing the connector unsets the family and level too', async ({ mount, page }) => {
        await mount(
            <ContentSigningFormattingFieldsTestWrapper
                connectors={connectors}
                declarationsByConnector={declarationsByConnector}
                initialDraft={{ connectorUuid: 'c-pades', familyCode: 'pades', level: SignatureLevel.Signed }}
            />,
        );
        await expect(page.getByTestId('select-signatureLevel-trigger')).toContainText('PAdES-B');

        await page.getByTestId('select-contentSigningFormattingConnector-clear').click();

        await expectDraft(page, {});
    });

    test('names a saved family the connector no longer declares', async ({ mount, page }) => {
        await mount(
            <ContentSigningFormattingFieldsTestWrapper
                connectors={connectors}
                declarationsByConnector={declarationsByConnector}
                initialDraft={{ connectorUuid: 'c-pades', familyCode: 'xades', level: SignatureLevel.Signed }}
            />,
        );
        await expect(page.getByText('PAdES Connector no longer declares the family xades.')).toBeVisible();

        await choose(page, 'signatureFamily', 'CAdES');
        await expectDraft(page, { connectorUuid: 'c-pades', familyCode: 'cades' });
    });

    test('names a saved level the family no longer declares', async ({ mount, page }) => {
        await mount(
            <ContentSigningFormattingFieldsTestWrapper
                connectors={connectors}
                declarationsByConnector={declarationsByConnector}
                initialDraft={{ connectorUuid: 'c-pades', familyCode: 'cades', level: SignatureLevel.Timestamped }}
            />,
        );

        await expect(page.getByText(`CAdES of PAdES Connector no longer declares the level ${SignatureLevel.Timestamped}.`)).toBeVisible();
    });

    test('keeps a saved connector that the search no longer returns, so it can be cleared', async ({ mount, page }) => {
        await mount(
            <ContentSigningFormattingFieldsTestWrapper
                connectors={[]}
                declarationsByConnector={declarationsByConnector}
                initialDraft={{ connectorUuid: 'c-pades', familyCode: 'pades' }}
            />,
        );
        await expect(page.getByTestId('select-contentSigningFormattingConnector-trigger')).toContainText('c-pades');

        await page.getByTestId('select-contentSigningFormattingConnector-clear').click();

        await expectDraft(page, {});
    });

    test('says why the connector list is empty when the search failed', async ({ mount, page }) => {
        await mount(
            <ContentSigningFormattingFieldsTestWrapper
                connectors={[]}
                declarationsByConnector={declarationsByConnector}
                failedConnectorsFetch={{ reason: 'Core unreachable' }}
            />,
        );

        await expect(page.getByText('The Content Signing Formatting Connectors could not be listed. Core unreachable')).toBeVisible();
    });
});
