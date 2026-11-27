import type { AttributeDescriptorModel } from 'types/attributes';
import type { BaseAttributeDto } from 'types/openapi';
import { describe, expect, it } from 'vitest';
import { permissionTitleOf, readableGroupTitle, withPanesByKind, withPermission } from './requestAttributePermissions';

describe('readableGroupTitle', () => {
    it('reads a snake_case group code as a sentence', () => {
        expect(readableGroupTitle('visible_signature_placement')).toBe('Visible signature placement');
    });

    it('capitalizes a one-word group code', () => {
        expect(readableGroupTitle('scope')).toBe('Scope');
    });
});

describe('permissionTitleOf', () => {
    const declared = [
        { name: 'stamp-page', properties: { label: 'Stamp page', group: 'signature_appearance' } },
        { name: 'timestamp-policy', properties: { label: 'Timestamp policy' } },
    ] as BaseAttributeDto[];

    it('names a request group by its readable title', () => {
        expect(permissionTitleOf('signature_appearance', declared)).toBe('Signature appearance');
    });

    it('names an ungrouped request attribute by its label', () => {
        expect(permissionTitleOf('timestamp-policy', declared)).toBe('Timestamp policy');
    });

    it('keeps a name the connector no longer declares, including one inside a group', () => {
        expect(permissionTitleOf('retired-policy', declared)).toBe('retired-policy');
        expect(permissionTitleOf('stamp-page', declared)).toBe('stamp-page');
    });
});

describe('withPermission', () => {
    it('appends a name turned on', () => {
        expect(withPermission(['signer_identity'], 'signature_context', true)).toEqual(['signer_identity', 'signature_context']);
    });

    it('keeps a name turned on twice once', () => {
        expect(withPermission(['signer_identity'], 'signer_identity', true)).toEqual(['signer_identity']);
    });

    it('removes a name turned off and keeps the order of the rest', () => {
        expect(withPermission(['a', 'b', 'c'], 'b', false)).toEqual(['a', 'c']);
    });
});

describe('withPanesByKind', () => {
    const descriptor = (name: string, group?: string) =>
        ({ name, properties: { label: name, group } }) as unknown as AttributeDescriptorModel;
    const panes = (descriptors: AttributeDescriptorModel[]) =>
        descriptors.map((model) => [
            model.name,
            (model as unknown as BaseAttributeDto & { properties: { group?: string } }).properties.group,
        ]);

    it('moves each attribute without a group into the pane of its kind', () => {
        const policy = descriptor('policy');

        const regrouped = withPanesByKind([descriptor('reason'), policy], [policy as unknown as BaseAttributeDto]);

        expect(panes(regrouped)).toEqual([
            ['reason', '__profile__'],
            ['policy', '__request__'],
        ]);
    });

    it("moves a request group's profile attributes into a pane of their own right after the group", () => {
        const page = descriptor('page', 'appearance');

        const regrouped = withPanesByKind(
            [descriptor('font', 'appearance'), descriptor('reason'), page],
            [page as unknown as BaseAttributeDto],
        );

        expect(panes(regrouped)).toEqual([
            ['reason', '__profile__'],
            ['page', 'appearance'],
            ['font', '__profile__:appearance'],
        ]);
    });

    it("keeps a request group's profile pane next to the group when another group interleaves with it", () => {
        const page = descriptor('page', 'appearance');
        const corner = descriptor('corner', 'placement');
        const image = descriptor('image', 'appearance');
        const requestAttributes = [page, corner, image] as unknown as BaseAttributeDto[];

        const regrouped = withPanesByKind([descriptor('font', 'appearance'), page, corner, image], requestAttributes);

        const paneOrder = [...new Set(panes(regrouped).map(([, group]) => group))];
        expect(paneOrder).toEqual(['appearance', '__profile__:appearance', 'placement']);
    });

    it('keeps a group that holds only profile attributes in one pane', () => {
        expect(panes(withPanesByKind([descriptor('font', 'appearance')], []))).toEqual([['font', 'appearance']]);
    });
});
