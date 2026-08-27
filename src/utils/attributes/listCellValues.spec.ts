import { describe, expect, it } from 'vitest';
import type { BaseAttributeContentModel } from 'types/attributes';
import { AttributeContentType } from 'types/openapi';
import { getListCellValues } from './listCellValues';

const values = (contentType: AttributeContentType, content: BaseAttributeContentModel[] | undefined) =>
    getListCellValues(contentType, content).map((value) => value.label);

describe('getListCellValues', () => {
    it('returns nothing for absent content, so the cell resolves to the empty state', () => {
        expect(getListCellValues(AttributeContentType.String, undefined)).toEqual([]);
        expect(getListCellValues(AttributeContentType.String, [])).toEqual([]);
    });

    it('returns one value per content item, preserving item_order', () => {
        const content = [{ data: 'production' }, { data: 'staging' }, { data: 'dr-site' }];
        expect(values(AttributeContentType.String, content)).toEqual(['production', 'staging', 'dr-site']);
    });

    describe('string and text', () => {
        it('prefers the human-readable reference over the stored data', () => {
            expect(values(AttributeContentType.String, [{ data: 'ACME_1', reference: 'Acme Corp' }])).toEqual(['Acme Corp']);
            expect(values(AttributeContentType.Text, [{ data: 'ACME_1', reference: 'Acme Corp' }])).toEqual(['Acme Corp']);
        });

        it('falls back to the data when there is no reference', () => {
            expect(values(AttributeContentType.String, [{ data: 'ACME_1' }])).toEqual(['ACME_1']);
        });
    });

    describe('numbers', () => {
        it('renders integers and floats as plain numerals', () => {
            expect(values(AttributeContentType.Integer, [{ data: 4820 }])).toEqual(['4820']);
            expect(values(AttributeContentType.Float, [{ data: 12.5 }])).toEqual(['12.5']);
        });

        it('keeps a zero rather than treating it as absent', () => {
            expect(values(AttributeContentType.Integer, [{ data: 0 }])).toEqual(['0']);
        });
    });

    describe('boolean', () => {
        it('renders Yes and No, not the developer-facing true and false', () => {
            expect(values(AttributeContentType.Boolean, [{ data: true }])).toEqual(['Yes']);
            expect(values(AttributeContentType.Boolean, [{ data: false }])).toEqual(['No']);
        });
    });

    describe('dates and times', () => {
        it('renders a date in the platform date format', () => {
            expect(values(AttributeContentType.Date, [{ data: '2026-03-04' }])).toEqual(['2026-03-04']);
        });

        it('renders a datetime through the platform datetime format', () => {
            expect(values(AttributeContentType.Datetime, [{ data: '2026-03-04T10:20:30Z' }])[0]).toMatch(
                /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
            );
        });

        it('renders a time verbatim', () => {
            expect(values(AttributeContentType.Time, [{ data: '22:22:02' }])).toEqual(['22:22:02']);
        });

        it('leaves an unparseable date alone rather than rendering Invalid Date', () => {
            expect(values(AttributeContentType.Date, [{ data: 'not a date' }])).toEqual(['not a date']);
        });
    });

    describe('credential and object', () => {
        it('renders the human label and never the raw object', () => {
            const content = [{ data: { id: 7, secretish: 'x' }, reference: 'Vault credential' }];
            expect(values(AttributeContentType.Credential, content)).toEqual(['Vault credential']);
            expect(values(AttributeContentType.Object, content)).toEqual(['Vault credential']);
        });

        it('renders nothing rather than JSON when there is no reference', () => {
            expect(getListCellValues(AttributeContentType.Object, [{ data: { id: 7 } }])).toEqual([]);
        });
    });

    describe('resource', () => {
        const content = [{ data: { resource: 'certificates', uuid: 'u-1', name: 'api.acme.test' } }];

        it('prefers the reference, then the name, then the uuid', () => {
            expect(values(AttributeContentType.Resource, [{ ...content[0], reference: 'Referenced' }])).toEqual(['Referenced']);
            expect(values(AttributeContentType.Resource, content)).toEqual(['api.acme.test']);
            expect(values(AttributeContentType.Resource, [{ data: { resource: 'certificates', uuid: 'u-1' } }])).toEqual(['u-1']);
        });

        it('carries the link target when the referenced object is addressable', () => {
            expect(getListCellValues(AttributeContentType.Resource, content)[0].link).toEqual({ resource: 'certificates', uuid: 'u-1' });
        });

        it('carries no link when the resource or the uuid is missing', () => {
            expect(getListCellValues(AttributeContentType.Resource, [{ data: { name: 'orphan' } }])[0].link).toBeUndefined();
            expect(getListCellValues(AttributeContentType.Resource, [{ data: { uuid: 'u-1' } }])[0].link).toBeUndefined();
        });
    });

    describe('file', () => {
        const content = [{ data: { fileName: 'chain.pem', mimeType: 'application/x-pem-file', content: 'base64' } }];

        it('shows the file name only, because name plus mime type is too wide for a column', () => {
            expect(values(AttributeContentType.File, content)).toEqual(['chain.pem']);
        });

        it('moves the mime type into the detail the overflow reveals', () => {
            expect(getListCellValues(AttributeContentType.File, content)[0].detail).toBe('application/x-pem-file');
        });

        it('falls back to the reference when the data is not a file payload', () => {
            expect(values(AttributeContentType.File, [{ data: 'raw', reference: 'chain.pem' }])).toEqual(['chain.pem']);
        });
    });

    describe('content types the catalogue must never offer as a column', () => {
        it('masks a secret rather than revealing it', () => {
            expect(values(AttributeContentType.Secret, [{ data: 'hunter2' }])).toEqual(['*****']);
        });

        it('names a code block rather than rendering it, which would be multi-line', () => {
            expect(values(AttributeContentType.Codeblock, [{ data: { code: 'YQ==', language: 'javascript' } }])).toEqual(['Code block']);
        });
    });
});
