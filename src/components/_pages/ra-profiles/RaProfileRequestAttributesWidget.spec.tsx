import { test, expect } from '../../../../playwright/ct-test';
import type { RaProfileCertificateRequestAttributesDto } from 'types/openapi';
import { RaProfileRequestAttributesWidgetTestWrapper } from './RaProfileRequestAttributesWidgetTestWrapper';

const authoredSet = {
    requestAttributes: [
        {
            uuid: 'u1',
            name: 'cn',
            type: 'data',
            contentType: 'string',
            version: 3,
            properties: { label: 'Common Name', visible: true, required: true, readOnly: false, list: false, multiSelect: false },
        },
    ],
} as unknown as RaProfileCertificateRequestAttributesDto;

test.describe('RaProfileRequestAttributesWidget', () => {
    test('with no authored set, the note links to platform settings and previews the resolved set', async ({ mount, page }) => {
        await mount(
            <RaProfileRequestAttributesWidgetTestWrapper
                preloadedState={{
                    certificates: {
                        csrAttributeDescriptors: [
                            {
                                uuid: 'r1',
                                name: 'cn',
                                type: 'data',
                                contentType: 'string',
                                content: [],
                                properties: {
                                    label: 'Common Name',
                                    visible: true,
                                    required: true,
                                    readOnly: false,
                                    list: false,
                                    multiSelect: false,
                                },
                                fieldMapping: { objectType: 'x509Certificate', fields: [{ fieldType: 'keyUsage' }] },
                            },
                        ],
                    } as never,
                }}
            />,
        );

        const note = page.getByTestId('request-attributes-platform-default-note');
        await expect(note).toBeVisible();
        await expect(note.getByRole('link', { name: 'platform settings' })).toHaveAttribute('href', '/settings?tab=request-attributes');
        await expect(page.getByTestId('resolved-set-row')).toHaveCount(1);
        await expect(page.getByTestId('resolved-set-row')).toContainText('Common Name');
        await expect(page.getByTestId('resolved-set-row').getByTestId('request-attribute-mapping-badge')).toContainText('Key Usage');
    });

    test('with an authored set, the platform-default note and preview stay hidden', async ({ mount, page }) => {
        await mount(<RaProfileRequestAttributesWidgetTestWrapper certificateRequestAttributes={authoredSet} />);

        await expect(page.getByTestId('ra-profile-request-attributes-widget')).toBeVisible();
        await expect(page.getByTestId('request-attributes-platform-default-note')).toHaveCount(0);
        await expect(page.getByTestId('resolved-set-preview')).toHaveCount(0);
    });
});
