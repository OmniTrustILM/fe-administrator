import type { AttributeDescriptorModel } from 'types/attributes';
import type { BaseAttributeDto } from 'types/openapi';

const groupOf = (descriptor: BaseAttributeDto): string | undefined =>
    ('properties' in descriptor && descriptor.properties?.group) || undefined;

const isGrouped = (descriptor: BaseAttributeDto) => groupOf(descriptor) !== undefined;

/** Label a request attribute shows, or its name when it has none. */
export const labelOf = (descriptor: BaseAttributeDto): string =>
    ('properties' in descriptor && descriptor.properties?.label) || descriptor.name;

/** The name a profile allows a request attribute by: its group, or its own name when it has none. */
const permissionName = (descriptor: BaseAttributeDto): string => groupOf(descriptor) ?? descriptor.name;

/** Names a profile can allow, one per request-attribute group and per ungrouped request attribute. */
export function permissionNamesOf(requestAttributeDescriptors: BaseAttributeDto[]): Set<string> {
    return new Set(requestAttributeDescriptors.map(permissionName));
}

/** Group codes of the request attributes, each allowing its whole group. */
export function requestGroupCodesOf(requestAttributeDescriptors: BaseAttributeDto[]): Set<string> {
    return new Set(requestAttributeDescriptors.filter(isGrouped).map(permissionName));
}

/** Names of the request attributes without a group, each allowed on its own. */
export function ungroupedRequestAttributeNamesOf(requestAttributeDescriptors: BaseAttributeDto[]): Set<string> {
    return new Set(requestAttributeDescriptors.filter((descriptor) => !isGrouped(descriptor)).map((descriptor) => descriptor.name));
}

/** The allowed names with `name` added once or removed. The other names keep their order. */
export function withPermission(allowedNames: string[], name: string, allowed: boolean): string[] {
    if (!allowed) return allowedNames.filter((allowedName) => allowedName !== name);
    return allowedNames.includes(name) ? allowedNames : [...allowedNames, name];
}

/** A connector's snake_case group code as a section title, so `visible_signature_placement` reads "Visible signature placement". */
export function readableGroupTitle(group: string): string {
    const words = group.replaceAll('_', ' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Group code of the pane holding the profile attributes that have no connector group. */
export const profileOnlyGroup = '__profile__';

/** Group code of the pane holding the request attributes that have no connector group. */
export const ungroupedRequestGroup = '__request__';

/** Group code of the pane holding a request group's profile attributes, which a request cannot set. */
const profileHalfOf = (group: string) => `${profileOnlyGroup}:${group}`;

/** The request group whose profile attributes the pane holds. */
export function splitRequestGroupOf(pane: string): string | undefined {
    const prefix = profileHalfOf('');
    return pane.startsWith(prefix) ? pane.slice(prefix.length) : undefined;
}

const paneOf = (descriptor: AttributeDescriptorModel): string | undefined => groupOf(descriptor as BaseAttributeDto);

/**
 * The descriptors regrouped so each pane holds one kind of attribute under a title. An attribute without a group moves to the pane of
 * its kind, and a request group's profile attributes move to a pane right after the group, so the group's switch covers only what it
 * allows.
 */
export function withPanesByKind(
    descriptors: AttributeDescriptorModel[],
    requestAttributeDescriptors: BaseAttributeDto[],
): AttributeDescriptorModel[] {
    const requestAttributeNames = new Set(requestAttributeDescriptors.map((descriptor) => descriptor.name));
    const requestGroups = new Set(descriptors.filter((descriptor) => requestAttributeNames.has(descriptor.name)).map(paneOf));
    const paneFor = (descriptor: AttributeDescriptorModel): string | undefined => {
        const group = paneOf(descriptor);
        const isRequestAttribute = requestAttributeNames.has(descriptor.name);
        if (group === undefined) return isRequestAttribute ? ungroupedRequestGroup : profileOnlyGroup;
        return requestGroups.has(group) && !isRequestAttribute ? profileHalfOf(group) : undefined;
    };
    const regrouped = descriptors.map((descriptor) => {
        if (!('properties' in descriptor)) return descriptor;
        const pane = paneFor(descriptor);
        return pane ? ({ ...descriptor, properties: { ...descriptor.properties, group: pane } } as AttributeDescriptorModel) : descriptor;
    });
    const isProfileHalf = (descriptor: AttributeDescriptorModel) => splitRequestGroupOf(paneOf(descriptor) ?? '') !== undefined;
    const profileHalves = regrouped.filter(isProfileHalf);
    // The editor orders panes by their first attribute, so each profile half follows the last attribute of its request group.
    const ordered = regrouped.filter((descriptor) => !isProfileHalf(descriptor));
    const lastIndexOf = new Map(ordered.map((descriptor, index) => [paneOf(descriptor), index]));
    return ordered.flatMap((descriptor, index) => {
        const group = paneOf(descriptor);
        if (group === undefined || lastIndexOf.get(group) !== index) return [descriptor];
        return [descriptor, ...profileHalves.filter((half) => paneOf(half) === profileHalfOf(group))];
    });
}
