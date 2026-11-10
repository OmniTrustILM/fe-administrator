import { describe, expect, test } from 'vitest';

import { fieldErrorsShownOnForms, SIGNING_MAX_ITEMS_PER_REQUEST_PATH } from './platform-settings';

const refusedLimit = `${SIGNING_MAX_ITEMS_PER_REQUEST_PATH} must not exceed 1000`;

describe('fieldErrorsShownOnForms', () => {
    test('keys the message after the path by the path', () => {
        expect(fieldErrorsShownOnForms({ status: 422, response: [refusedLimit] })).toStrictEqual({
            [SIGNING_MAX_ITEMS_PER_REQUEST_PATH]: 'must not exceed 1000',
        });
    });

    test('keeps the shown field of a refusal that also refuses anything else', () => {
        expect(fieldErrorsShownOnForms({ status: 422, response: [refusedLimit, 'Something else'] })).toStrictEqual({
            [SIGNING_MAX_ITEMS_PER_REQUEST_PATH]: 'must not exceed 1000',
        });
    });

    test('finds nothing in an entry refusing a field no form shows', () => {
        expect(fieldErrorsShownOnForms({ status: 422, response: ['utils.cbomSyncPageSize must not exceed 1000'] })).toBeUndefined();
    });

    test('finds nothing in a 422 with no entries', () => {
        expect(fieldErrorsShownOnForms({ status: 422, response: [] })).toBeUndefined();
    });

    test('finds nothing in a path that only starts like a shown one', () => {
        expect(
            fieldErrorsShownOnForms({ status: 422, response: [`${SIGNING_MAX_ITEMS_PER_REQUEST_PATH}Extra must not be null`] }),
        ).toBeUndefined();
    });

    test('finds nothing in any status other than 422', () => {
        expect(fieldErrorsShownOnForms({ status: 400, response: [refusedLimit] })).toBeUndefined();
    });

    test('finds nothing in a 422 whose body is not a list', () => {
        expect(fieldErrorsShownOnForms({ status: 422, response: { message: refusedLimit } })).toBeUndefined();
    });
});
