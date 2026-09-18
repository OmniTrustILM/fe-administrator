import { describe, expect, test } from 'vitest';
import { PqcVerdict } from 'types/openapi';
import { describeEvidenceCoverage, diffPayloads, getPqcVerdictBadgeColor, getPqcVerdictDotClass, isSamePayload } from './crypto-assets';

describe('getPqcVerdictBadgeColor', () => {
    test.each([
        [PqcVerdict.Ready, 'success'],
        [PqcVerdict.NotReady, 'danger'],
        [PqcVerdict.Unknown, 'warning'],
        [PqcVerdict.NotApplicable, 'secondary'],
    ])('%s maps to the %s badge', (verdict, expected) => {
        expect(getPqcVerdictBadgeColor(verdict)).toBe(expected);
    });

    test('every verdict keeps a text-safe surface fill: none maps to a solid-only colour', () => {
        const textSafe = ['success', 'danger', 'warning', 'secondary'];
        for (const verdict of Object.values(PqcVerdict)) {
            expect(textSafe).toContain(getPqcVerdictBadgeColor(verdict));
        }
    });

    // A verdict core adds later must not land on the neutral badge, which reads as "nothing to do here".
    test('a verdict this build does not know reads as needing a look, not as benign', () => {
        expect(getPqcVerdictBadgeColor('somethingCoreAddedLater' as PqcVerdict)).toBe('warning');
    });
});

describe('getPqcVerdictDotClass', () => {
    test.each([
        [PqcVerdict.Ready, 'bg-success-solid'],
        [PqcVerdict.NotReady, 'bg-danger-solid'],
        [PqcVerdict.Unknown, 'bg-warning-solid'],
        [PqcVerdict.NotApplicable, 'bg-outline'],
    ])('%s takes the %s dot', (verdict, expected) => {
        expect(getPqcVerdictDotClass(verdict)).toBe(expected);
    });

    test('every dot is a semantic background utility, never a literal colour', () => {
        for (const verdict of Object.values(PqcVerdict)) {
            expect(getPqcVerdictDotClass(verdict)).toMatch(/^bg-[a-z-]+$/);
        }
    });

    test('an unknown verdict takes the amber dot, matching its badge', () => {
        expect(getPqcVerdictDotClass('somethingCoreAddedLater' as PqcVerdict)).toBe('bg-warning-solid');
    });
});

const elected = {
    assetType: 'algorithm',
    oid: '1.2.840.113549.1.1.11',
    algorithmProperties: { primitive: 'signature', parameterSetIdentifier: '2048', cryptoFunctions: ['sign', 'verify'] },
};

describe('diffPayloads', () => {
    test('identical payloads have no differences, whatever their key order', () => {
        const reordered = {
            algorithmProperties: { cryptoFunctions: ['sign', 'verify'], parameterSetIdentifier: '2048', primitive: 'signature' },
            oid: '1.2.840.113549.1.1.11',
            assetType: 'algorithm',
        };

        expect(diffPayloads(elected, reordered)).toEqual([]);
        expect(isSamePayload(elected, reordered)).toBe(true);
    });

    test('a source that disagrees reports each nested path: missing, changed and extra keys are told apart', () => {
        const source = {
            assetType: 'algorithm',
            oid: '1.2.840.113549.1.1.1',
            algorithmProperties: { primitive: 'signature', cryptoFunctions: ['sign', 'verify'], padding: 'pkcs1v15' },
        };

        expect(diffPayloads(elected, source)).toEqual([
            { path: 'algorithmProperties.padding', kind: 'onlyInSource' },
            { path: 'algorithmProperties.parameterSetIdentifier', kind: 'notRecorded' },
            { path: 'oid', kind: 'changed' },
        ]);
        expect(isSamePayload(elected, source)).toBe(false);
    });

    test('arrays compare as a whole, so a reordered list counts as a change', () => {
        const source = { ...elected, algorithmProperties: { ...elected.algorithmProperties, cryptoFunctions: ['verify', 'sign'] } };

        expect(diffPayloads(elected, source)).toEqual([{ path: 'algorithmProperties.cryptoFunctions', kind: 'changed' }]);
    });

    test('an object inside an array is read by its keys, not by the order they were written in', () => {
        const withProperties = { ...elected, properties: [{ name: 'fips', value: 'true' }] };
        const reordered = { ...elected, properties: [{ value: 'true', name: 'fips' }] };

        expect(diffPayloads(withProperties, reordered)).toEqual([]);
        expect(isSamePayload(withProperties, reordered)).toBe(true);
    });

    test('a genuinely different entry, and a list of a different length, are still reported', () => {
        const withProperties = { ...elected, properties: [{ name: 'fips', value: 'true' }] };
        const changedEntry = { ...elected, properties: [{ name: 'fips', value: 'false' }] };
        const shorter = { ...elected, properties: [] };

        expect(diffPayloads(withProperties, changedEntry)).toEqual([{ path: 'properties', kind: 'changed' }]);
        expect(diffPayloads(withProperties, shorter)).toEqual([{ path: 'properties', kind: 'changed' }]);
    });
});

describe('describeEvidenceCoverage', () => {
    test('a capped list names the sample and the true total', () => {
        expect(describeEvidenceCoverage(50, 1284)).toBe('50 shown of 1,284 recorded');
    });

    test('a list that fits says it is complete', () => {
        expect(describeEvidenceCoverage(37, 37)).toBe('all 37');
    });

    test('a source with no occurrences says so', () => {
        expect(describeEvidenceCoverage(0, 0)).toBe('none recorded');
    });
});
