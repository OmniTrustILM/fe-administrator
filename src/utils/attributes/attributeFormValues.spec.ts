import { describe, expect, test } from 'vitest';
import { getDatetimeFormValue, getDateFormValue } from './attributeFormValues';

describe('attributeFormValues', () => {
    describe('getDatetimeFormValue', () => {
        test('uses item.value.data when present', () => {
            const result = getDatetimeFormValue({ value: { data: '2024-06-15T12:00:00Z' } });
            expect(result.data).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });

        test('accepts string and returns ISO datetime', () => {
            const result = getDatetimeFormValue('2024-01-01T00:00:00');
            expect(result.data).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        });

        test('accepts Date-like and returns ISO string', () => {
            const d = new Date('2024-03-10T10:00:00Z');
            const result = getDatetimeFormValue(d);
            expect(result.data).toBe(d.toISOString());
        });

        test('uses item.data when the selected option carries the raw content object (predefined list)', () => {
            const result = getDatetimeFormValue({ data: '2024-06-15T12:00:00Z' });
            expect(result.data).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });
    });

    describe('getDateFormValue', () => {
        test('uses item.value.data when present and returns YYYY-MM-DD', () => {
            const result = getDateFormValue({ value: { data: '2024-06-15T12:00:00Z' } });
            expect(result.data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(result.data).toBe('2024-06-15');
        });

        test('accepts string and returns date part only', () => {
            const result = getDateFormValue('2024-01-01');
            expect(result.data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        test('accepts Date-like and returns date part only', () => {
            const d = new Date('2024-03-10T10:00:00Z');
            const result = getDateFormValue(d);
            expect(result.data).toBe('2024-03-10');
        });

        test('uses item.data when the selected option carries the raw content object (predefined list)', () => {
            // Regression: AttributeFieldSelect stores the picked option's raw content object
            // ({ data: ... }) as the field value for list/predefined-content attributes, not a
            // bare string — this used to hit `new Date({...}).toISOString()` and throw.
            const result = getDateFormValue({ data: '2026-03-29' });
            expect(result.data).toBe('2026-03-29');
        });
    });
});
