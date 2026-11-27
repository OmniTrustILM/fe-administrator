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

// One function per grant set, like the real hook, which returns a new function only when an answer changes.
const resolvers = new WeakMap<Set<ResourceAction>, (action: ResourceAction) => Availability>();

const resolverFor = (granted: Set<ResourceAction>) => {
    let resolver = resolvers.get(granted);
    if (!resolver) {
        resolver = (action: ResourceAction): Availability =>
            granted.has(action)
                ? { available: true, hidden: false, loading: false }
                : { available: false, hidden: false, loading: false, reason: `You need the ${action} permission.` };
        resolvers.set(granted, resolver);
    }
    return resolver;
};

export const actionAvailabilityFakeModule = () => ({
    useActionAvailability: (resource: Resource, objects?: string | readonly string[]) => {
        actionAvailabilityFake.requests.push({ resource, objects });
        return resolverFor(actionAvailabilityFake.granted);
    },
});
