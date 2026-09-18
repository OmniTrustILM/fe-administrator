/** Joins element ids for `aria-describedby`, dropping empties and repeats; `undefined` when nothing is left. */
export const joinAriaIds = (...ids: (string | undefined | false)[]): string | undefined => {
    const unique = [...new Set(ids.filter((id): id is string => !!id))];
    return unique.length > 0 ? unique.join(' ') : undefined;
};
