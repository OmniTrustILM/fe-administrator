import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
    AA_NON_TEXT,
    AA_TEXT,
    type BrandFinding,
    type ContrastFinding,
    brandContrastFindings,
    brandFindings,
    describeFinding,
    groupBrandFindings,
    PAIRINGS,
    suggestBrandColor,
    PLATFORM_TOKENS,
} from './brand-contrast';
import { brandColors, type BrandColors, brandTokenSources, brandTokenValues } from './brand-tokens';
import { contrastRatio } from './contrast';
import { readSemanticTokens } from './theme-tokens';

/** A brand chosen to pass everywhere: the platform's own palette, restated as operator input. */
const PASSING = brandColors({
    primaryColor: '#0073cf',
    secondaryColor: '#0369a1',
    backgroundColor: '#f8fafc',
    textColor: '#1f2937',
});

/** Every field set, so every pairing has both sides branded and can be attributed in both compositions. */
const ALL_SET = { primaryColor: '#7fc4ff', secondaryColor: '#cfe9ff', backgroundColor: '#ffffff', textColor: '#c9c9c9' };

/** A finding as the operator meets it: which field it blames, which composition it is in, and what it says. */
const identify = ({ category, theme, consequence }: ContrastFinding) => `${category}|${theme}|${consequence}`;

/** Everything one pairing produced, which is what `describeFinding` collapses into a single line. */
const forPairing = (colors: BrandColors, consequence: string): [ContrastFinding, ...ContrastFinding[]] => {
    const [first, ...rest] = brandContrastFindings(colors).filter((finding) => finding.consequence === consequence);

    if (first === undefined) {
        throw new Error(`No finding for "${consequence}"; the palette this test relies on no longer trips it.`);
    }

    return [first, ...rest];
};

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
    // from Primary. If that ever diverges, the sentence has to be split and a second pairing added.
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

            expect(findings.map(({ consequence }) => consequence)).toContain('Body text is hard to read on the page background');
            expect(findings.every(({ threshold }) => threshold === AA_TEXT)).toBe(true);
        });

        test('should report a non-text failure when the informational indicator is too pale for the surface', () => {
            const findings = brandContrastFindings(brandColors({ secondaryColor: '#e8f4ff' }));

            expect(
                findings.some(
                    ({ consequence, threshold }) => consequence.includes('Informational status dots') && threshold === AA_NON_TEXT,
                ),
            ).toBe(true);
        });

        test('should evaluate both compositions', () => {
            // A pale Primary cannot carry white text, and the header takes Primary in both themes, so the same input
            // fails on both sides of the theme switch. The branded link fails only in light, where the card is white:
            // the dark composition lightens Primary further against a near-black card, where it still passes.
            const findings = brandContrastFindings(brandColors({ primaryColor: '#7fc4ff' }));
            const themes = new Set(findings.map(({ theme }) => theme));

            expect(themes).toStrictEqual(new Set(['light', 'dark']));
            expect(findings.filter(({ theme }) => theme === 'light').map(({ consequence }) => consequence)).toContain(
                'Links and active controls are hard to read on cards and dialogs',
            );
            expect(findings.filter(({ theme }) => theme === 'dark').map(({ consequence }) => consequence)).not.toContain(
                'Links and active controls are hard to read on cards and dialogs',
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
            const consequences = brandContrastFindings(colors).map(({ consequence }) => consequence);

            expect(contrastRatio('#767676', '#ffffff')).toBeGreaterThanOrEqual(AA_TEXT);
            expect(consequences).not.toContain('Body text is hard to read on the page background');
            expect(consequences).toContain('Supporting text is hard to read on the page background');
        });

        test('should round the ratio down, so a stated figure never rounds up past its threshold', () => {
            for (const finding of brandContrastFindings(brandColors({ primaryColor: '#7fc4ff' }))) {
                expect(finding.ratio).toBeLessThan(finding.threshold);
            }
        });
    });

    describe('attribution', () => {
        test('should file a pairing under its foreground when branding reaches both sides', () => {
            const findings = brandContrastFindings(brandColors({ backgroundColor: '#ffffff', textColor: '#c9c9c9' }));

            expect(findings.length).toBeGreaterThan(0);
            expect(findings.every(({ category }) => category === 'text')).toBe(true);
        });

        test('should file a pairing under its background when that is the only branded side', () => {
            // The input border keeps its platform colour whatever the brand is, so a surface it cannot be seen on is
            // the Background colour's doing and nothing else's.
            const findings = brandContrastFindings(brandColors({ backgroundColor: '#e8e8e8' }));

            expect(findings.map(({ consequence }) => consequence)).toContain('Input borders are hard to see on cards and dialogs');
            expect(findings.every(({ category }) => category === 'background')).toBe(true);
        });

        test('should file a branded fill under the colour that fills it', () => {
            const findings = brandContrastFindings(brandColors({ primaryColor: '#7fc4ff' }));

            expect(findings.every(({ category }) => category === 'primary')).toBe(true);
        });
    });

    describe('describeFinding', () => {
        test('should lead with the consequence and leave the measurement as evidence', () => {
            const finding = describeFinding(
                forPairing(
                    brandColors({ backgroundColor: '#ffffff', textColor: '#c9c9c9' }),
                    'Body text is hard to read on the page background',
                ),
            );

            expect(finding.message).toBe('Body text is hard to read on the page background in the light theme.');
            expect(finding.detail).toMatch(/^\d+\.\d{2}:1, needs 4\.5:1$/);
            expect(finding.category).toBe('text');
            expect(finding.severity).toBe('warning');
        });

        test('should name both themes on one line when the pairing fails in both, quoting the worse ratio', () => {
            const measured = forPairing(
                brandColors({ primaryColor: '#7fc4ff' }),
                'White text is hard to read on the page header and on primary buttons',
            );
            const finding = describeFinding(measured);
            const worst = Math.min(...measured.map(({ ratio }) => ratio));

            expect(measured).toHaveLength(2);
            expect(finding.message).toBe(
                'White text is hard to read on the page header and on primary buttons in the light and dark themes.',
            );
            expect(finding.detail).toBe(`${worst.toFixed(2)}:1, needs 4.5:1`);
        });
    });

    describe('brandFindings', () => {
        test('should report nothing for a brand that passes everywhere', () => {
            expect(brandFindings(PASSING)).toStrictEqual([]);
        });

        test('should report a pairing that fails in both compositions once', () => {
            const messages = brandFindings(brandColors({ primaryColor: '#7fc4ff' })).map(({ message }) => message);

            expect(messages.filter((message) => message.startsWith('White text is hard to read'))).toStrictEqual([
                'White text is hard to read on the page header and on primary buttons in the light and dark themes.',
            ]);
            expect(new Set(messages).size).toBe(messages.length);
        });

        /**
         * The merge is keyed on the sentence, so two pairings that ever read alike would fold into one line and the
         * second one's threshold would go unreported. Asserted over the table rather than over a sample, because no
         * one palette trips every pairing.
         */
        test('should give every pairing a sentence of its own', () => {
            expect(new Set(PAIRINGS.map(({ consequence }) => consequence)).size).toBe(PAIRINGS.length);
        });

        /**
         * A merged line takes its category from the first composition, so the two have to agree for every pairing -
         * walked over the table rather than over a palette, since only one pairing happens to fail in both themes.
         */
        test('should keep every pairing in one category across both compositions', () => {
            const colors = brandColors(ALL_SET);
            const sources = { light: brandTokenSources(colors, 'light'), dark: brandTokenSources(colors, 'dark') };
            const categoryIn = (theme: 'light' | 'dark', pairing: (typeof PAIRINGS)[number]) =>
                sources[theme][pairing.foreground] ?? sources[theme][pairing.background];

            const inBothThemes = PAIRINGS.filter(
                (pairing) => categoryIn('light', pairing) !== undefined && categoryIn('dark', pairing) !== undefined,
            );
            const disagreeing = inBothThemes.filter((pairing) => categoryIn('light', pairing) !== categoryIn('dark', pairing));

            expect(inBothThemes.length).toBeGreaterThan(0);
            expect(disagreeing.map(({ consequence }) => consequence)).toStrictEqual([]);
        });

        test('should name no token and no standard in any sentence', () => {
            const findings = brandFindings(brandColors({ primaryColor: '#7fc4ff', backgroundColor: '#ffffff', textColor: '#c9c9c9' }));

            expect(findings.length).toBeGreaterThan(0);

            for (const { message } of findings) {
                expect(message).not.toMatch(/WCAG|:1|surface|content/);
            }
        });
    });

    describe('suggestBrandColor', () => {
        test.each([
            ['primary', '#7FC4FF'],
            ['secondary', '#CFE9FF'],
            ['text', '#C9C9C9'],
            ['background', '#8A8A8A'],
        ] as const)('should return a shade of %s that silences the field', (category, hex) => {
            const colors = brandColors({ [`${category}Color`]: hex });
            const suggestion = suggestBrandColor(colors, category);

            expect(suggestion).toMatch(/^#[0-9A-F]{6}$/);
            expect(brandContrastFindings(colors).filter((finding) => finding.category === category).length).toBeGreaterThan(0);
            expect(
                brandContrastFindings({ ...colors, [category]: suggestion }).filter((finding) => finding.category === category),
            ).toStrictEqual([]);
        });

        /**
         * A category owns only the pairings where its token is the foreground, so silencing it says nothing about what
         * the same shade does to the rest. Compared line by line rather than by count, at any granularity: one input
         * drives several tokens, so a shade can lift a warning off a field and drop a different one on it with the
         * count standing still, and the sentence the operator then reads is one they were never shown before.
         */
        test.each([
            ['primary', ALL_SET],
            ['secondary', ALL_SET],
            ['text', ALL_SET],
        ] as const)('should leave every other field with the findings it already had when fixing %s', (category, palette) => {
            const colors = brandColors(palette);
            const suggestion = suggestBrandColor(colors, category);

            expect(suggestion, `no suggestion for ${category}; this palette no longer exercises it`).toBeDefined();

            const reported = new Set(brandContrastFindings(colors).map(identify));

            for (const finding of brandContrastFindings({ ...colors, [category]: suggestion })) {
                expect(reported, `${identify(finding)} was not reported before the suggestion`).toContain(identify(finding));
            }
        });

        /**
         * The trade the rule exists to refuse, as a palette: every shade that clears Background here also pushes one
         * onto Text, while the total still falls - so a summed guard would offer one of them. Offering nothing is the
         * honest answer; the operator is not handed a fix that moves the problem.
         */
        test('should offer nothing when every shade trades one field for another', () => {
            const colors = brandColors({
                primaryColor: '#0073CF',
                secondaryColor: '#CFE9FF',
                backgroundColor: '#5A5A5A',
                textColor: '#C9C9C9',
            });

            expect(brandContrastFindings(colors).filter((finding) => finding.category === 'background')).not.toStrictEqual([]);
            expect(suggestBrandColor(colors, 'background')).toBeUndefined();
        });

        /**
         * The same trade within a single field, which a per-field count misses: white as Background clears Text's body
         * failures and newly breaks its supporting weight on the page, so Text's own count falls while the operator is
         * handed a sentence they had not seen.
         */
        test('should offer nothing when a shade swaps a finding on the same field for a new one', () => {
            const colors = brandColors({
                primaryColor: '#7D7F95',
                secondaryColor: '#0B49E4',
                backgroundColor: '#0B082B',
                textColor: '#5278A1',
            });
            const reported = new Set(brandContrastFindings(colors).map(identify));
            const novel = brandContrastFindings({ ...colors, background: '#ffffff' }).filter((finding) => !reported.has(identify(finding)));

            expect(novel.map(identify)).toStrictEqual(['text|light|Supporting text is hard to read on the page background']);
            expect(suggestBrandColor(colors, 'background')).toBeUndefined();
        });

        /** A field that already passes is not a field to suggest anything for, and a near-identical shade is noise. */
        test('should suggest nothing when the colour already passes', () => {
            expect(suggestBrandColor(PASSING, 'primary')).toBeUndefined();
        });

        test('should return nothing for a colour the operator has not set', () => {
            expect(suggestBrandColor({}, 'primary')).toBeUndefined();
        });
    });

    describe('groupBrandFindings', () => {
        test('should box findings by field, in the order the Appearance tab lists them', () => {
            const groups = groupBrandFindings(
                brandFindings(brandColors({ primaryColor: '#7fc4ff', backgroundColor: '#ffffff', textColor: '#c9c9c9' })),
            );

            expect(groups.map(({ category }) => category)).toStrictEqual(['primary', 'text']);
            expect(groups.every(({ severity }) => severity === 'warning')).toBe(true);
            expect(groups.flatMap(({ findings }) => findings).length).toBeGreaterThan(groups.length);
        });

        test('should give an advisory a box of its own', () => {
            const advisory: BrandFinding = { category: 'logo', severity: 'info', message: 'The light logo is an unusual shape.' };
            const groups = groupBrandFindings([...brandFindings(brandColors({ primaryColor: '#7fc4ff' })), advisory]);

            expect(groups.at(-1)).toStrictEqual({ category: 'logo', severity: 'info', findings: [advisory] });
        });
    });
});
