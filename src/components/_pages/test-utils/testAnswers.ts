import type { BaseAttributeDto } from 'types/openapi';

/** The answer the nth request takes from answers taken in order: its own, or the last one for any further request. */
export const nth = <T>(answers: readonly T[] | undefined, index: number): T | undefined => answers?.[Math.min(index, answers.length - 1)];

/** The answer to one attribute schema listing, taken in order; a `pending` one leaves its listing in flight. */
export type SchemaAnswer = Readonly<{ descriptors?: BaseAttributeDto[]; error?: string; pending?: boolean }>;
