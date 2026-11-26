import type { Resource, ResourceAction } from 'types/openapi';
import type { Availability } from 'utils/availability';

/**
 * Stands in for `useActionAvailability`: an action is available exactly when `granted` holds it, and every hook call is
 * recorded, so a page spec can assert which object a page asks about. Reset it in `beforeEach`.
 */
export const actionAvailabilityFake = {
    granted: new Set<ResourceAction>(),
    requests: [] as { resource: Resource; objects: string | readonly string[] | undefined }[],
    reset(granted: Iterable<ResourceAction> = []) {
        this.granted = new Set(granted);
        this.requests = [];
    },
};

export const actionAvailabilityFakeModule = () => ({
    useActionAvailability: (resource: Resource, objects?: string | readonly string[]) => {
        actionAvailabilityFake.requests.push({ resource, objects });
        return (action: ResourceAction): Availability =>
            actionAvailabilityFake.granted.has(action)
                ? { available: true, hidden: false, loading: false }
                : { available: false, hidden: false, loading: false, reason: `You need the ${action} permission.` };
    },
});
