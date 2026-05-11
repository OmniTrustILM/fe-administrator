import { describe, expect, test } from 'vitest';
import { AjaxError } from 'rxjs/ajax';
import { extractError, getLockWidgetObject } from './net';
import { LockTypeEnum } from 'types/user-interface';

function createMockAjaxError(overrides: { status?: number; response?: any; message?: string } = {}): AjaxError {
    const response = overrides.response === undefined ? null : overrides.response;
    const err = Object.assign(new Error(overrides.message ?? 'error'), {
        name: 'AjaxError' as const,
        status: overrides.status ?? 500,
        response,
        responseType: 'json',
        request: {},
        xhr: { status: overrides.status ?? 500, responseType: 'json', responseText: '{}', response },
    });
    Object.setPrototypeOf(err, AjaxError.prototype);
    return err as unknown as AjaxError;
}

describe('net utils', () => {
    describe('extractError', () => {
        test('should return headline when err is null/undefined', () => {
            expect(extractError(null as any, 'Failed')).toBe('Failed');
            expect(extractError(undefined as any, 'Failed')).toBe('Failed');
        });

        test('should format AjaxError with response.message', () => {
            const err = createMockAjaxError({ status: 500, response: { message: 'Server error' } });
            expect(extractError(err, 'Request failed')).toBe('Request failed (500): Server error');
        });

        test('should format AjaxError with response when no message', () => {
            const err = createMockAjaxError({ status: 404, response: 'Not found' });
            expect(extractError(err, 'Failed')).toContain('Failed (404)');
        });

        test('should format AjaxError with err.message as fallback', () => {
            const err = createMockAjaxError({ status: 500, response: null, message: 'Network error' });
            expect(extractError(err, 'Failed')).toContain('Failed (500)');
            expect(extractError(err, 'Failed')).toContain('Network error');
        });

        test('should handle Event as network failure', () => {
            const err = new Event('error');
            expect(extractError(err as any, 'Failed')).toBe('Failed: Network connection failure');
        });

        test('should handle generic Error', () => {
            const err = new Error('Something broke');
            expect(extractError(err, 'Failed')).toBe('Failed. Something broke');
        });
    });

    describe('getLockWidgetObject', () => {
        test('should return custom lock for error with code and message', () => {
            const err = createMockAjaxError({
                status: 401,
                response: { code: 'UNAUTHORIZED', message: 'Please login' },
            });
            const result = getLockWidgetObject(err);
            expect(result.lockTitle).toBe('Unauthorized');
            expect(result.lockText).toBe('Please login');
            expect(result.lockType).toBe(LockTypeEnum.PERMISSION);
        });

        test('should return unknown code as "Something went wrong"', () => {
            const err = createMockAjaxError({
                status: 403,
                response: { code: 'UNKNOWN_CODE', message: 'Custom msg' },
            });
            const result = getLockWidgetObject(err);
            expect(result.lockTitle).toBe('Something went wrong');
            expect(result.lockText).toBe('Custom msg');
        });

        test('should return Validation Error for 422 with array response', () => {
            const err = createMockAjaxError({
                status: 422,
                response: ['Field X is required', 'Field Y invalid'],
            });
            const result = getLockWidgetObject(err);
            expect(result.lockTitle).toBe('Validation Error');
            expect(result.lockText).toBe('There was a problem in validating the request');
            expect(result.lockDetails).toBe('Field X is required Field Y invalid');
        });

        test('should return Not Found for 404', () => {
            const err = createMockAjaxError({ status: 404, response: null });
            const result = getLockWidgetObject(err);
            expect(result.lockTitle).toBe('Not Found');
            expect(result.lockText).toBe('The requested resource does not exist');
            expect(result.lockType).toBe(LockTypeEnum.GENERIC);
        });

        test('should return Client Error for 4xx (except 401, 403, 404, 422)', () => {
            const err = createMockAjaxError({ status: 409, response: null });
            const result = getLockWidgetObject(err);
            expect(result.lockTitle).toBe('Client Error');
            expect(result.lockText).toBe('There was some problem at the client side');
            expect(result.lockType).toBe(LockTypeEnum.CLIENT);
        });

        test('should return Service unavailable for 503', () => {
            const err = createMockAjaxError({ status: 503, response: null });
            const result = getLockWidgetObject(err);
            expect(result.lockTitle).toBe('Service unavailable');
            expect(result.lockText).toBe('There was some issue with the service');
            expect(result.lockType).toBe(LockTypeEnum.SERVICE_ERROR);
        });

        test('should return Server Error for 5xx (except 503)', () => {
            const err = createMockAjaxError({ status: 502, response: null });
            const result = getLockWidgetObject(err);
            expect(result.lockTitle).toBe('Server Error');
            expect(result.lockText).toBe('There was some issue with the server');
            expect(result.lockType).toBe(LockTypeEnum.SERVER_ERROR);
        });

        test('should return generic fallback for other status', () => {
            const err = createMockAjaxError({ status: 999, response: null });
            const result = getLockWidgetObject(err);
            expect(result.lockTitle).toBe('Something went wrong');
            expect(result.lockText).toBe('There was some issue please try again later');
            expect(result.lockType).toBe(LockTypeEnum.GENERIC);
        });

        test('should include lockDetails from ErrorCodeDetailMap for known codes', () => {
            const err = createMockAjaxError({
                status: 403,
                response: { code: 'ACCESS_DENIED', message: 'Access denied' },
            });
            const result = getLockWidgetObject(err);
            expect(result.lockTitle).toBe('Access Denied');
            expect(result.lockDetails).toBe('Please contact your admin to get access');
        });
    });
});
