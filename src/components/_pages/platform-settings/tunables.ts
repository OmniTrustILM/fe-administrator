/**
 * A whole-number platform setting an operator owns, with the bounds and default copied by hand from its schema. The
 * generated types leave them out.
 */
export type IntegerTunable<Name extends string = string> = Readonly<{
    name: Name;
    label: string;
    unit: string;
    unitOne: string;
    /** The schema's `default`, which the platform uses while the value is unset. */
    defaultValue: number;
    /** The schema's `minimum`. The form refuses a smaller value before sending it. */
    min: number;
    /** The schema's `maximum`. The form refuses a larger value before sending it. */
    max: number;
    help: string;
}>;

/** The form keeps numbers as text. Empty text means unset, which the platform reads as its default. */
export const integerText = (value?: number): string => (value == null ? '' : String(value));

export const parseOptionalInteger = (value?: string): number | undefined =>
    value === undefined || value === '' ? undefined : Number.parseInt(value, 10);

/** What the read view shows: the value with its unit, or the platform default while nothing is set. */
export const describeTunable = (tunable: IntegerTunable, value: number | undefined): string => {
    if (value == null) return `platform default (${tunable.defaultValue} ${tunable.unit})`;
    return `${value} ${value === 1 ? tunable.unitOne : tunable.unit}`;
};
