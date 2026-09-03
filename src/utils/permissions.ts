import type { UserProfileDetailModel } from 'types/auth';
import type { Resource, ResourceAction } from 'types/openapi';

/**
 * Whether the signed-in user holds one action on one resource.
 *
 * Read this rather than `permissions.allowedListings` when gating anything other than a listing. Listing access says
 * only that the resource may be listed, so a narrow action - `UPDATE_BRANDING`, `GET_SECRET_CONTENT`,
 * `UPDATE_SOURCE_VAULT_PROFILE` - is a different question with a different answer.
 *
 * `allowedActions` reports what the caller holds on a resource as a whole and deliberately omits object-scoped grants,
 * so this answers "may they do it at all", not "may they do it to this object". Core enforces either way; a false here
 * means the control should not be offered, never that the request would have been safe to send.
 */
export const hasResourceAction = (profile: UserProfileDetailModel | undefined, resource: Resource, action: ResourceAction): boolean =>
    !!profile?.permissions?.allowedActions?.some((granted) => granted.resource === resource && granted.actions?.includes(action));
