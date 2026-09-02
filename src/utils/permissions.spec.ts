import { describe, expect, it } from 'vitest';
import type { UserProfileDetailModel } from 'types/auth';
import { Resource, ResourceAction } from 'types/openapi';
import { hasResourceAction } from './permissions';

const profileWith = (allowedActions: UserProfileDetailModel['permissions']['allowedActions']): UserProfileDetailModel =>
    ({ permissions: { allowedListings: [Resource.Settings], allowedActions } }) as UserProfileDetailModel;

describe('hasResourceAction', () => {
    it('finds an action granted on the resource', () => {
        const profile = profileWith([{ resource: Resource.Settings, actions: [ResourceAction.Detail, ResourceAction.UpdateBranding] }]);

        expect(hasResourceAction(profile, Resource.Settings, ResourceAction.UpdateBranding)).toBe(true);
    });

    /** The whole point of the field: UPDATE on settings is not UPDATE_BRANDING, which is what Core actually gates on. */
    it('does not read a broader action as a narrower one', () => {
        const profile = profileWith([{ resource: Resource.Settings, actions: [ResourceAction.Update] }]);

        expect(hasResourceAction(profile, Resource.Settings, ResourceAction.UpdateBranding)).toBe(false);
    });

    it('does not match the action on a different resource', () => {
        const profile = profileWith([{ resource: Resource.Users, actions: [ResourceAction.UpdateBranding] }]);

        expect(hasResourceAction(profile, Resource.Settings, ResourceAction.UpdateBranding)).toBe(false);
    });

    it('answers false for a resource the profile omits', () => {
        const profile = profileWith([{ resource: Resource.Users, actions: [ResourceAction.Update] }]);

        expect(hasResourceAction(profile, Resource.Settings, ResourceAction.UpdateBranding)).toBe(false);
    });

    /**
     * A profile that has not loaded, and one served by a Core predating the field, both reach this the same way. Either
     * must deny rather than throw: the caller is a render path, and an exception there costs the whole page.
     */
    it('denies rather than throwing when the profile or the field is absent', () => {
        expect(hasResourceAction(undefined, Resource.Settings, ResourceAction.UpdateBranding)).toBe(false);
        expect(
            hasResourceAction(
                { permissions: { allowedListings: [Resource.Settings] } } as UserProfileDetailModel,
                Resource.Settings,
                ResourceAction.UpdateBranding,
            ),
        ).toBe(false);
    });
});
