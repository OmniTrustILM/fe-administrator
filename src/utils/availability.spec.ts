import { describe, expect, it } from 'vitest';
import type { UserProfileDetailModel } from 'types/auth';
import { Resource, ResourceAction } from 'types/openapi';
import { type ActionRule, missingPermissionReason, resolveAvailability } from './availability';
import { objectAnswerFor } from './useActionAvailability';

const profileWith = (allowedActions: UserProfileDetailModel['permissions']['allowedActions']): UserProfileDetailModel =>
    ({ permissions: { allowedListings: [], allowedActions } }) as unknown as UserProfileDetailModel;

const labels = { resource: 'Secrets', action: 'Update' };
const rule: ActionRule = { resource: Resource.Secrets, action: ResourceAction.Update };
const denied = { available: false, hidden: false, loading: false, reason: missingPermissionReason(labels) };
const available = { available: true, hidden: false, loading: false };

const withUpdate = profileWith([{ resource: Resource.Secrets, actions: [ResourceAction.Update] }]);
const withoutGrants = profileWith([]);

describe('resolveAvailability', () => {
    it('offers an action granted on the resource', () => {
        expect(resolveAvailability({ rule, profile: withUpdate, labels })).toEqual(available);
    });

    it('disables an action the resource grants do not include, naming the missing permission', () => {
        expect(resolveAvailability({ rule, profile: withoutGrants, labels })).toEqual(denied);
        expect(denied.reason).toBe('You need the Update permission on Secrets.');
    });

    it('hides a denied action when the rule asks for it', () => {
        expect(resolveAvailability({ rule: { ...rule, hideWhenDenied: true }, profile: withoutGrants, labels })).toEqual({
            ...denied,
            hidden: true,
        });
    });

    it('offers an action the object answer grants on an ownable resource without a resource grant', () => {
        const objectAnswer = { status: 'loaded' as const, allowedActions: [ResourceAction.Detail, ResourceAction.Update] };

        expect(resolveAvailability({ rule, profile: withoutGrants, objectAnswer, labels })).toEqual(available);
    });

    it('disables an action the object answer leaves out despite a resource grant', () => {
        expect(
            resolveAvailability({
                rule,
                profile: withUpdate,
                objectAnswer: { status: 'loaded', allowedActions: [ResourceAction.Detail] },
                labels,
            }),
        ).toEqual(denied);
    });

    it('disables every action on an object left out of the answer', () => {
        expect(
            resolveAvailability({ rule, profile: withUpdate, objectAnswer: { status: 'loaded', allowedActions: undefined }, labels }),
        ).toEqual(denied);
    });

    it('lets the profile decide when no object answer is asked for', () => {
        expect(resolveAvailability({ rule, profile: withUpdate, objectAnswer: undefined, labels })).toEqual(available);
    });

    it('falls back to the profile when the object request failed', () => {
        expect(resolveAvailability({ rule, profile: withUpdate, objectAnswer: { status: 'failed' }, labels })).toEqual(available);
        expect(resolveAvailability({ rule, profile: withoutGrants, objectAnswer: { status: 'failed' }, labels })).toEqual(denied);
    });

    it('reports loading while the object answer is pending', () => {
        expect(resolveAvailability({ rule, profile: withUpdate, objectAnswer: { status: 'loading' }, labels })).toEqual({
            available: false,
            hidden: false,
            loading: true,
        });
    });

    it('reports loading while the profile is not loaded', () => {
        expect(resolveAvailability({ rule, profile: undefined, labels })).toEqual({ available: false, hidden: false, loading: true });
    });
});

describe('objectAnswerFor', () => {
    it('counts a requested object without a stored answer as loading', () => {
        expect(objectAnswerFor(undefined, 'uuid-1')).toEqual({ status: 'loading' });
    });

    it('returns the stored answer for a requested object', () => {
        expect(objectAnswerFor({ status: 'failed' }, 'uuid-1')).toEqual({ status: 'failed' });
    });

    it('returns no answer when no object is requested', () => {
        expect(objectAnswerFor({ status: 'failed' }, undefined)).toBeUndefined();
    });
});
