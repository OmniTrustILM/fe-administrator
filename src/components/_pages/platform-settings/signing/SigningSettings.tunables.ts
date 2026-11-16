import type { IntegerTunable } from '../tunables';

/** This one entry drives both the form field and the read row. */
export const MAX_ITEMS_PER_REQUEST: IntegerTunable<'maxItemsPerRequest'> = {
    name: 'maxItemsPerRequest',
    label: 'Max Items per Request',
    unit: 'items',
    unitOne: 'item',
    defaultValue: 100,
    min: 1,
    max: 1_000,
    help: 'How many items one request of the Native Signing API may carry, the same for every Signing Profile.',
};
