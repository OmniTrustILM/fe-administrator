import type { AttributeDescriptorModel } from 'types/attributes';
import type { BaseAttributeDto } from 'types/openapi';
import { describe, expect, it } from 'vitest';
import { readableGroupTitle, withPanesByKind, withPermission } from './requestAttributePermissions';

describe('readableGroupTitle', () => {
    it('reads a snake_case group code as a sentence', () => {
        expect(readableGroupTitle('visible_signature_placement')).toBe('Visible signature placement');
    });

    it('capitalizes a one-word group code', () => {
        expect(readableGroupTitle('scope')).toBe('Scope');
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

    it('keeps a group that holds only profile attributes in one pane', () => {
        expect(panes(withPanesByKind([descriptor('font', 'appearance')], []))).toEqual([['font', 'appearance']]);
    });
});
