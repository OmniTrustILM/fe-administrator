import { test, expect } from '../../../playwright/ct-test';
import { FieldType, ObjectType } from 'types/openapi';
import type { FieldMapping } from 'types/openapi';
import { withProviders } from 'utils/test-helpers';
import RequestAttributeMappingBadge from './RequestAttributeMappingBadge';

const mapping = (fields: unknown[]): FieldMapping => ({ objectType: ObjectType.X509Certificate, fields }) as unknown as FieldMapping;

test.describe('RequestAttributeMappingBadge', () => {
    test('renders the mapping summary tokens', async ({ mount }) => {
        const component = await mount(
            withProviders(
                <RequestAttributeMappingBadge
                    fieldMapping={mapping([
                        { fieldType: FieldType.Rdn, rdn: 'CN', order: 1 },
                        { fieldType: FieldType.San, generalNameType: 'dns', order: 2 },
                    ])}
                />,
            ),
        );
        await expect(component.getByText('→ Subject CN + SAN dNSName')).toBeVisible();
    });

    test('exposes a "Maps to" tooltip title', async ({ mount }) => {
        const component = await mount(
            withProviders(<RequestAttributeMappingBadge fieldMapping={mapping([{ fieldType: FieldType.Rdn, rdn: 'O' }])} />),
        );
        await expect(component).toHaveAttribute('title', 'Maps to: Subject O');
        await expect(component).toHaveAttribute('data-testid', 'request-attribute-mapping-badge');
    });

    test('renders nothing when there is no mapping', async ({ mount }) => {
        const component = await mount(withProviders(<RequestAttributeMappingBadge />));
        await expect(component).toBeEmpty();
    });
});
