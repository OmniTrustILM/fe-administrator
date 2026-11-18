import type { SearchFilterModel } from 'types/certificate';
import { FilterConditionOperator, FilterFieldSource, SortDirection } from 'types/openapi';
import type { ColumnSort } from 'utils/tableColumns';
import { describe, expect, it } from 'vitest';
import { describeViewSwitch, listingSignature, toViewSwitchChanges } from './viewSwitch';

const filter = (identifier: string, value: string): SearchFilterModel => ({
    fieldSource: FilterFieldSource.Property,
    fieldIdentifier: identifier,
    condition: FilterConditionOperator.Equals,
    value,
});

const state = filter('CERTIFICATE_STATE', 'issued');
const name = filter('COMMON_NAME', 'example.com');

const sort = (direction: SortDirection = SortDirection.Asc): ColumnSort => ({
    fieldSource: FilterFieldSource.Property,
    fieldIdentifier: 'NOT_AFTER',
    direction,
});

type Listing = Parameters<typeof toViewSwitchChanges>[0];

/** A switch to a view the page applies in full, so the listing it lands on is the one the view carries. */
const landsAsCarried = (from: Listing, to: Listing) => toViewSwitchChanges(from, to, to);

describe('toViewSwitchChanges', () => {
    it('reports nothing when the filters and ordering already match', () => {
        expect(landsAsCarried({ filters: [state], sort: sort() }, { filters: [state], sort: sort() })).toEqual({});
        expect(landsAsCarried({ filters: [] }, { filters: [] })).toEqual({});
    });

    it('reads the same filters in another order as a match, since they list the same rows', () => {
        expect(landsAsCarried({ filters: [state, name] }, { filters: [name, state] })).toEqual({});
    });

    it('reports a view that brings filters of its own as having applied them', () => {
        expect(landsAsCarried({ filters: [] }, { filters: [state] })).toEqual({ filters: 'applied' });
        expect(landsAsCarried({ filters: [name] }, { filters: [state] })).toEqual({ filters: 'applied' });
    });

    it('reports a view that carries no filters as having cleared the ones applied', () => {
        expect(landsAsCarried({ filters: [name] }, { filters: [] })).toEqual({ filters: 'cleared' });
    });

    it('reports a filter whose value differs as a change', () => {
        expect(landsAsCarried({ filters: [state] }, { filters: [filter('CERTIFICATE_STATE', 'revoked')] })).toEqual({
            filters: 'applied',
        });
    });

    it('reports the ordering on the same terms', () => {
        expect(landsAsCarried({ filters: [] }, { filters: [], sort: sort() })).toEqual({ sort: 'applied' });
        expect(landsAsCarried({ filters: [], sort: sort() }, { filters: [], sort: sort(SortDirection.Desc) })).toEqual({
            sort: 'applied',
        });
        expect(landsAsCarried({ filters: [], sort: sort() }, { filters: [] })).toEqual({ sort: 'cleared' });
    });

    it('tells an ordering the page could not apply from one the view does not carry', () => {
        const custom = { ...sort(), fieldIdentifier: 'COMMON_NAME' };
        expect(toViewSwitchChanges({ filters: [], sort: custom }, { filters: [] }, { filters: [], sort: sort() })).toEqual({
            sort: 'unavailable',
        });
    });

    it('reports a change the page landed on, not one the view asked for', () => {
        expect(toViewSwitchChanges({ filters: [] }, { filters: [] }, { filters: [], sort: sort() })).toEqual({});
    });

    it('reports the filters and the ordering together', () => {
        expect(landsAsCarried({ filters: [name] }, { filters: [], sort: sort() })).toEqual({ filters: 'cleared', sort: 'applied' });
    });
});

describe('describeViewSwitch', () => {
    it('says nothing when nothing changed', () => {
        expect(describeViewSwitch('Expiry watch', {})).toBeUndefined();
    });

    it('names the filters a view applied', () => {
        expect(describeViewSwitch('Expiry watch', { filters: 'applied' })).toBe('Switching to "Expiry watch" applied its filters.');
    });

    it('says a view without filters cleared them', () => {
        expect(describeViewSwitch('Audit', { filters: 'cleared' })).toBe('Switching to "Audit" cleared the filters, as it carries none.');
    });

    it('names the ordering a view applied or cleared', () => {
        expect(describeViewSwitch('Expiry watch', { sort: 'applied' })).toBe('Switching to "Expiry watch" applied its ordering.');
        expect(describeViewSwitch('Audit', { sort: 'cleared' })).toBe('Switching to "Audit" cleared the ordering, as it carries none.');
    });

    it('joins the filters and the ordering when both went the same way', () => {
        expect(describeViewSwitch('Expiry watch', { filters: 'applied', sort: 'applied' })).toBe(
            'Switching to "Expiry watch" applied its filters and ordering.',
        );
        expect(describeViewSwitch('Audit', { filters: 'cleared', sort: 'cleared' })).toBe(
            'Switching to "Audit" cleared the filters and ordering, as it carries none.',
        );
    });

    it('says an ordering the view carries but could not apply was cleared for that reason', () => {
        expect(describeViewSwitch('Expiry watch', { sort: 'unavailable' })).toBe(
            'Switching to "Expiry watch" cleared the ordering, as its own cannot be applied here.',
        );
        expect(describeViewSwitch('Expiry watch', { filters: 'applied', sort: 'unavailable' })).toBe(
            'Switching to "Expiry watch" applied its filters and cleared the ordering, as its own cannot be applied here.',
        );
    });

    it('tells an applied half from a cleared one', () => {
        expect(describeViewSwitch('Expiry watch', { filters: 'applied', sort: 'cleared' })).toBe(
            'Switching to "Expiry watch" applied its filters and cleared the ordering, as it carries none.',
        );
        expect(describeViewSwitch('Standard', { filters: 'cleared', sort: 'applied' })).toBe(
            'Switching to "Standard" applied its ordering and cleared the filters, as it carries none.',
        );
    });
});

describe('listingSignature', () => {
    it('matches listings with the same filters in any order under the same ordering', () => {
        expect(listingSignature({ filters: [state, name], sort: sort() })).toBe(listingSignature({ filters: [name, state], sort: sort() }));
    });

    it('tells listings apart by their filters or their ordering', () => {
        expect(listingSignature({ filters: [state] })).not.toBe(listingSignature({ filters: [] }));
        expect(listingSignature({ filters: [], sort: sort() })).not.toBe(listingSignature({ filters: [], sort: sort(SortDirection.Desc) }));
        expect(listingSignature({ filters: [], sort: sort() })).not.toBe(listingSignature({ filters: [] }));
    });
});
