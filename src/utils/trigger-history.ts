import { getEnumLabel } from 'ducks/enums';
import type { PlatformEnumMap } from 'types/enums';
import type { ConditionItemDto, TriggerHistoryRecordDto } from 'types/openapi';

const toCoreString = (value: unknown): string => {
    if (Array.isArray(value)) return `[${value.map(toCoreString).join(', ')}]`;
    if (typeof value === 'object' && value !== null) {
        return `{${Object.entries(value)
            .map(([key, entry]) => `${key}=${toCoreString(entry)}`)
            .join(', ')}}`;
    }
    return String(value);
};

// Core names the unmet item only in the record message, so the item is the one that message was built from.
export const findUnmetConditionItem = (
    record: TriggerHistoryRecordDto,
    fieldSourceEnum: PlatformEnumMap,
    operatorEnum: PlatformEnumMap,
): ConditionItemDto | undefined =>
    record.condition?.items?.find((item) => {
        const fieldSource = getEnumLabel(fieldSourceEnum, item.fieldSource);
        const operator = getEnumLabel(operatorEnum, item.operator);
        return (
            record.message ===
            `Condition item '${fieldSource} ${item.fieldIdentifier} ${operator} ${toCoreString(item.value ?? '')}' is false.`
        );
    });
