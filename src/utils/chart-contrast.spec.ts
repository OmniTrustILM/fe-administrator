import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
    CertificateEventHistoryDtoStatusEnum,
    CertificateState,
    CertificateSubjectType,
    CertificateValidationStatus,
    ComplianceRuleStatus,
    ComplianceStatus,
    SecretState,
} from 'types/openapi';
import { type CertificateStatusLike, getCertificateStatusColor } from './certificate';
import { CHART_MIN_CONTRAST, CHART_SURFACES, meetsChartContrast, toChartHex } from './chart-contrast';
import { contrastRatio } from './contrast';
import {
    getCertificateDonutChartColorsByDaysOfExpiration,
    getDefaultColors,
    getDonutChartColorsByRandomNumberOfOptions,
} from './dashboard';
import { getSecretStatusColor } from './secret';
import { readSemanticTokens } from './theme-tokens';

const css = readFileSync(path.resolve(__dirname, '../tailwindcss.css'), 'utf8');
const tokens = readSemanticTokens(css);

const certificateStatuses: CertificateStatusLike[] = [
    ...Object.values(CertificateState),
    ...Object.values(CertificateValidationStatus),
    ...Object.values(CertificateEventHistoryDtoStatusEnum),
    ...Object.values(ComplianceStatus),
    ...Object.values(ComplianceRuleStatus),
    ...Object.values(CertificateSubjectType),
];

// Every key the certificate expiry donut is bucketed into.
const expiryBuckets = { '10': 1, '20': 1, '30': 1, '60': 1, '90': 1, More: 1, Expired: 1 };

const expectLegible = (colour: string) => {
    for (const surface of CHART_SURFACES) {
        expect(contrastRatio(colour, surface)).toBeGreaterThanOrEqual(CHART_MIN_CONTRAST);
    }
};

describe('chart contrast', () => {
    test('should paint charts on the same surfaces the stylesheet declares', () => {
        expect([tokens.light['surface-raised'], tokens.dark['surface-raised']]).toEqual([...CHART_SURFACES]);
    });

    describe('toChartHex', () => {
        test('should leave a mid-luminance hue at the requested lightness', () => {
            expect(toChartHex(210, 70, 50)).toBe('#2680d9');
        });

        test('should darken a hue that is too light for the light surface', () => {
            const yellow = toChartHex(60, 70, 50);

            expect(yellow).not.toBe('#d9d926');
            expectLegible(yellow);
        });

        test('should lighten a hue that is too dark for the dark surface', () => {
            const blue = toChartHex(240, 70, 50);

            expect(blue).not.toBe('#2626d9');
            expectLegible(blue);
        });

        test.each([0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330])('should return a legible colour for hue %i', (hue) => {
            expectLegible(toChartHex(hue, 70, 50));
        });
    });

    describe('meetsChartContrast', () => {
        test('should reject a near-black colour that disappears on the dark surface', () => {
            expect(meetsChartContrast('#1f2937')).toBe(false);
        });

        test('should reject a near-white colour that disappears on the light surface', () => {
            expect(meetsChartContrast('#eab308')).toBe(false);
        });

        test('should accept a mid-luminance colour', () => {
            expect(meetsChartContrast('#6c757d')).toBe(true);
        });
    });

    describe('palettes', () => {
        test.each(certificateStatuses)('should keep the %s certificate status dot legible', (status) => {
            expectLegible(getCertificateStatusColor(status));
        });

        test.each(Object.values(SecretState))('should keep the %s secret status dot legible', (status) => {
            expectLegible(getSecretStatusColor(status));
        });

        test('should keep the default donut palette legible', () => {
            for (const colour of getDefaultColors()) {
                expectLegible(colour);
            }
        });

        test('should keep the expiry-bucket palette legible', () => {
            const colours = getCertificateDonutChartColorsByDaysOfExpiration(expiryBuckets)?.colors ?? [];

            expect(colours).toHaveLength(Object.keys(expiryBuckets).length);

            for (const colour of colours) {
                expectLegible(colour);
            }
        });

        test('should keep the generated palette legible past the base colours', () => {
            const colours = getDonutChartColorsByRandomNumberOfOptions(40).colors;

            expect(colours).toHaveLength(40);

            for (const colour of colours) {
                expectLegible(colour);
            }
        });
    });
});
