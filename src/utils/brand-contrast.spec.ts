import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { AA_NON_TEXT, AA_TEXT, brandContrastFindings, describeFinding, PLATFORM_TOKENS } from './brand-contrast';
import { brandColors, brandTokenValues } from './brand-tokens';
import { contrastRatio } from './contrast';
import { readSemanticTokens } from './theme-tokens';

/** A brand chosen to pass everywhere: the platform's own palette, restated as operator input. */
const PASSING = brandColors({
    primaryColor: '#0073cf',
    secondaryColor: '#0369a1',
    backgroundColor: '#f8fafc',
    textColor: '#1f2937',
});

describe('brand-contrast', () => {
    describe('PLATFORM_TOKENS', () => {
        const tokens = readSemanticTokens(readFileSync(path.resolve(__dirname, '../tailwindcss.css'), 'utf8'));

        test.each(['light', 'dark'] as const)('should match the %s values the stylesheet declares', (theme) => {
            for (const [token, value] of Object.entries(PLATFORM_TOKENS[theme])) {
                expect(tokens[theme][token], `--${token} in the ${theme} theme`).toBe(value);
            }
        });

        test('should carry the same tokens for both compositions', () => {
            expect(Object.keys(PLATFORM_TOKENS.dark).sort()).toStrictEqual(Object.keys(PLATFORM_TOKENS.light).sort());
        });
    });

    // The white-on-header pairing speaks for primary buttons too, which is only honest while the mapping derives both
    // from Primary. If that ever diverges, the label has to be split and a second pairing added.
    describe.each(['light', 'dark'] as const)('%s composition invariants', (theme) => {
        test('should derive the header surface and the brand fill from the same colour', () => {
            const values = brandTokenValues(PASSING, theme);

            expect(values['surface-header']).toBe(values['brand-solid']);
        });
    });

    describe('brandContrastFindings', () => {
        test('should report nothing for a brand that passes everywhere', () => {
            expect(brandContrastFindings(PASSING)).toStrictEqual([]);
        });

        test('should report nothing for an unbranded instance', () => {
            expect(brandContrastFindings({})).toStrictEqual([]);
        });

        test('should report a text failure when the text colour is too light for the background', () => {
            const findings = brandContrastFindings(brandColors({ backgroundColor: '#ffffff', textColor: '#b9b9b9' }));

            expect(findings.map(({ label }) => label)).toContain('Body text on the page background');
            expect(findings.every(({ threshold }) => threshold === AA_TEXT)).toBe(true);
        });

        test('should report a non-text failure when the informational indicator is too pale for the surface', () => {
            const findings = brandContrastFindings(brandColors({ secondaryColor: '#e8f4ff' }));

            expect(findings.some(({ label, threshold }) => label.includes('Informational indicators') && threshold === AA_NON_TEXT)).toBe(
                true,
            );
        });

        test('should evaluate both compositions', () => {
            // A pale Primary cannot carry white text, and the header takes Primary in both themes, so the same input
            // fails on both sides of the theme switch. The branded link fails only in light, where the card is white:
            // the dark composition lightens Primary further against a near-black card, where it still passes.
            const findings = brandContrastFindings(brandColors({ primaryColor: '#7fc4ff' }));
            const themes = new Set(findings.map(({ theme }) => theme));

            expect(themes).toStrictEqual(new Set(['light', 'dark']));
            expect(findings.filter(({ theme }) => theme === 'light').map(({ label }) => label)).toContain(
                'Links and active states on cards and dialogs',
            );
            expect(findings.filter(({ theme }) => theme === 'dark').map(({ label }) => label)).not.toContain(
                'Links and active states on cards and dialogs',
            );
        });

        test('should report a failure in one composition only when the colours that cause it apply there only', () => {
            // Background and Text reach the light composition alone, so nothing they can be set to may produce a
            // finding against the dark theme's own surfaces and content.
            const findings = brandContrastFindings(brandColors({ backgroundColor: '#111111', textColor: '#0d0d0d' }));

            expect(findings.length).toBeGreaterThan(0);
            expect(findings.every(({ theme }) => theme === 'light')).toBe(true);
        });

        test('should name the colours it compared and the ratio they achieve', () => {
            const [finding] = brandContrastFindings(brandColors({ backgroundColor: '#ffffff', textColor: '#c9c9c9' }));

            expect(finding.foreground).toBe('#c9c9c9');
            expect(finding.background).toBe('#ffffff');
            expect(finding.ratio).toBeCloseTo(contrastRatio('#c9c9c9', '#ffffff'), 1);
            expect(finding.ratio).toBeLessThan(AA_TEXT);
        });

        test('should measure the derived steps, not only the raw inputs', () => {
            // Text itself clears AA on white; the two quieter weights derived from it do not, which is exactly what a
            // check over the four inputs alone would miss.
            const colors = brandColors({ backgroundColor: '#ffffff', textColor: '#767676' });
            const labels = brandContrastFindings(colors).map(({ label }) => label);

            expect(contrastRatio('#767676', '#ffffff')).toBeGreaterThanOrEqual(AA_TEXT);
            expect(labels).not.toContain('Body text on the page background');
            expect(labels).toContain('Secondary text on the page background');
        });

        test('should round the ratio down, so a stated figure never rounds up past its threshold', () => {
            for (const finding of brandContrastFindings(brandColors({ primaryColor: '#7fc4ff' }))) {
                expect(finding.ratio).toBeLessThan(finding.threshold);
            }
        });
    });

    describe('describeFinding', () => {
        test('should name the theme, the pairing, the ratio and the threshold', () => {
            const [finding] = brandContrastFindings(brandColors({ backgroundColor: '#ffffff', textColor: '#c9c9c9' }));

            expect(describeFinding(finding)).toMatch(
                /^Light theme: Body text on the page background reaches \d+\.\d{2}:1, below the required 4\.5:1\.$/,
            );
        });
    });
});
