import { test, expect } from '../../playwright/ct-test';
import { Resource, ResourceAction } from 'types/openapi';
import { UseActionAvailabilityWithStore } from './useActionAvailability-harness';

const profileWithout = { username: 'owner', permissions: { allowedListings: [], allowedActions: [] } };
const enums = {
    platformEnums: {
        Resource: { [Resource.Secrets]: { label: 'Secrets' } },
        ResourceAction: { [ResourceAction.Update]: { label: 'Update' } },
    },
};

test.describe('useActionAvailability', () => {
    test('lets the profile decide without an object and names the missing permission by its labels', async ({ mount }) => {
        const component = await mount(
            <UseActionAvailabilityWithStore resource={Resource.Secrets} preloadedState={{ auth: { profile: profileWithout }, enums }} />,
        );

        await expect(component.getByTestId('availability')).toHaveText(
            JSON.stringify({ available: false, hidden: false, loading: false, reason: 'You need the Update permission on Secrets.' }),
        );
        await expect(component.getByTestId('dispatched')).toHaveText('[]');
    });

    test('asks for the object once and reports loading until it answers', async ({ mount }) => {
        const component = await mount(
            <UseActionAvailabilityWithStore
                resource={Resource.Secrets}
                objectUuid="uuid-1"
                preloadedState={{ auth: { profile: profileWithout }, enums }}
            />,
        );

        await expect(component.getByTestId('dispatched')).toHaveText(
            JSON.stringify([{ type: 'resource/listObjectAllowedActions', payload: { resource: Resource.Secrets, uuid: 'uuid-1' } }]),
        );
        await expect(component.getByTestId('availability')).toHaveText(JSON.stringify({ available: false, hidden: false, loading: true }));
    });

    test('offers an action the object answer grants to an owner without a resource grant', async ({ mount }) => {
        const component = await mount(
            <UseActionAvailabilityWithStore
                resource={Resource.Secrets}
                objectUuid="uuid-1"
                preloadedState={{
                    auth: { profile: profileWithout },
                    enums,
                    resource: {
                        resourcesList: [],
                        isFetchingResourcesList: false,
                        objectAllowedActions: {
                            [`${Resource.Secrets}/uuid-1`]: { status: 'loaded', allowedActions: [ResourceAction.Update] },
                        },
                    },
                }}
            />,
        );

        await expect(component.getByTestId('availability')).toHaveText(JSON.stringify({ available: true, hidden: false, loading: false }));
    });
});
