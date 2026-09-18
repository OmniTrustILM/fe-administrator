import { describe, expect, test } from 'vitest';
import { isBrandedUtility } from 'utils/brand-tokens';
import { SEVERITY_CLASSES } from './index';

describe('Callout', () => {
    /**
     * A callout carries the contrast warnings, which are a message about the operator's own colours. Painting one in a
     * token branding derives would write the complaint in the colour being complained about, so the severities that
     * carry those messages have to sit outside the override table.
     */
    test.each(['warning', 'danger', 'success'] as const)('should paint %s in tokens branding never overrides', (severity) => {
        expect(SEVERITY_CLASSES[severity].split(' ').filter(isBrandedUtility)).toStrictEqual([]);
    });
});
