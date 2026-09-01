import { describe, expect, test } from 'vitest';
import {
    getAttributeEditorAttributeKey,
    getAttributeEditorAttributesKey,
    getAttributeEditorDeletedAttributesKey,
} from './attributeEditorKeys';

describe('AttributeEditor form keys', () => {
    test('builds matching attribute and deleted-attribute keys for an editor', () => {
        // given
        const editorId = 'token';
        const attributeName = 'apiKey';

        // when
        const attributesKey = getAttributeEditorAttributesKey(editorId);
        const attributeKey = getAttributeEditorAttributeKey(editorId, attributeName);
        const deletedAttributesKey = getAttributeEditorDeletedAttributesKey(editorId);

        // then
        expect(attributesKey).toBe('__attributes__token__');
        expect(attributeKey).toBe('__attributes__token__.apiKey');
        expect(deletedAttributesKey).toBe('deletedAttributes_token');
    });
});
