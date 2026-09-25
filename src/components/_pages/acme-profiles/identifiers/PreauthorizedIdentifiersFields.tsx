import Button from 'components/Button';
import Checkbox from 'components/Checkbox';
import RadioRow from 'components/RadioRow';
import Select from 'components/Select';
import TextInput from 'components/TextInput';
import { getEnumDescription, getEnumLabel, selectors as enumSelectors } from 'ducks/enums';
import { Trash2 } from 'lucide-react';
import { useId, useMemo } from 'react';
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { AcmeIdentifierAuthorizationMode, AcmeIdentifierMatchType, AcmeIdentifierType, PlatformEnum } from 'types/openapi';
import {
    entryProblem,
    IDENTIFIER_TYPE_LABELS,
    type IdentifierPolicyFormValues,
    MATCH_TYPE_HELP,
    MODE_DESCRIPTIONS,
    newPreauthorizedIdentifier,
    PREAUTHORIZED_ONLY_NEEDS_ENTRY,
    WILDCARD_HELP,
} from 'utils/acme-identifier-policy';

export type { IdentifierPolicyFormValues } from 'utils/acme-identifier-policy';

const TYPE_OPTIONS = [AcmeIdentifierType.Dns, AcmeIdentifierType.Ip].map((type) => ({ value: type, label: IDENTIFIER_TYPE_LABELS[type] }));

const MODES = [AcmeIdentifierAuthorizationMode.PreauthorizedOrChallenge, AcmeIdentifierAuthorizationMode.PreauthorizedOnly];

type Props = Readonly<{ disabled?: boolean }>;

export default function PreauthorizedIdentifiersFields({ disabled }: Props) {
    const radioName = useId();
    const { control, getValues, setValue, trigger } = useFormContext<IdentifierPolicyFormValues>();
    const { fields, append, remove } = useFieldArray({ control, name: 'preauthorizedIdentifiers' });
    const entries = useWatch({ control, name: 'preauthorizedIdentifiers' }) ?? [];
    const modeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.AcmeIdentifierAuthorizationMode));
    const matchEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.AcmeIdentifierMatchType));

    const matchOptions = useMemo(
        () =>
            [AcmeIdentifierMatchType.Exact, AcmeIdentifierMatchType.Subdomain].map((code) => ({
                value: code,
                label: getEnumLabel(matchEnum, code),
            })),
        [matchEnum],
    );

    const revalidateMode = () => {
        trigger('identifierAuthorizationMode');
    };

    return (
        <div className="space-y-4">
            <Controller
                name="identifierAuthorizationMode"
                control={control}
                rules={{
                    validate: (mode) =>
                        mode === AcmeIdentifierAuthorizationMode.PreauthorizedOnly && getValues('preauthorizedIdentifiers').length === 0
                            ? PREAUTHORIZED_ONLY_NEEDS_ENTRY
                            : true,
                }}
                render={({ field, fieldState }) => (
                    <div className="space-y-2">
                        <div role="radiogroup" aria-label="Identifiers the list does not cover" className="space-y-2">
                            {MODES.map((mode) => {
                                const onlyWithoutEntries =
                                    mode === AcmeIdentifierAuthorizationMode.PreauthorizedOnly &&
                                    entries.length === 0 &&
                                    field.value !== mode;
                                return (
                                    <RadioRow
                                        key={mode}
                                        name={radioName}
                                        checked={field.value === mode}
                                        onSelect={() => field.onChange(mode)}
                                        disabled={disabled || onlyWithoutEntries}
                                    >
                                        <span className="font-medium text-content" data-testid={`identifier-mode-${mode}`}>
                                            {getEnumLabel(modeEnum, mode)}
                                        </span>
                                        <span className="text-content-subtle">
                                            {onlyWithoutEntries
                                                ? 'Add an identifier first.'
                                                : (getEnumDescription(modeEnum, mode) ?? MODE_DESCRIPTIONS[mode])}
                                        </span>
                                    </RadioRow>
                                );
                            })}
                        </div>
                        {fieldState.error ? (
                            <p className="text-sm text-danger" role="alert" data-testid="identifier-mode-error">
                                {fieldState.error.message}
                            </p>
                        ) : null}
                    </div>
                )}
            />

            <div className="space-y-3">
                <p className="text-sm text-content-subtle" data-testid="identifier-match-help">
                    {MATCH_TYPE_HELP} {WILDCARD_HELP}
                </p>

                {fields.map((row, index) => {
                    const entry = entries[index];
                    const isIp = entry?.type === AcmeIdentifierType.Ip;
                    const wildcardApplies = !isIp && entry?.matchType === AcmeIdentifierMatchType.Subdomain;
                    return (
                        <div
                            key={row.id}
                            className="grid grid-cols-1 items-start gap-2 md:grid-cols-[10rem_1fr_10rem_auto_auto]"
                            data-testid="identifier-row"
                        >
                            <Controller
                                name={`preauthorizedIdentifiers.${index}.type`}
                                control={control}
                                render={({ field }) => (
                                    <div>
                                        <label className="sr-only" htmlFor={`identifier-${index}-type`}>
                                            Type of identifier {index + 1}
                                        </label>
                                        <Select
                                            id={`identifier-${index}-type`}
                                            dataTestId={`identifier-${index}-type`}
                                            options={TYPE_OPTIONS}
                                            value={field.value}
                                            isDisabled={disabled}
                                            onChange={(value) => {
                                                field.onChange(value);
                                                if (value === AcmeIdentifierType.Ip) {
                                                    setValue(`preauthorizedIdentifiers.${index}.matchType`, AcmeIdentifierMatchType.Exact);
                                                    setValue(`preauthorizedIdentifiers.${index}.allowWildcard`, false);
                                                }
                                                // Touched so a value the new type refuses shows its reason at once.
                                                setValue(
                                                    `preauthorizedIdentifiers.${index}.value`,
                                                    getValues(`preauthorizedIdentifiers.${index}.value`),
                                                    {
                                                        shouldTouch: true,
                                                        shouldValidate: true,
                                                    },
                                                );
                                            }}
                                        />
                                    </div>
                                )}
                            />
                            <Controller
                                name={`preauthorizedIdentifiers.${index}.value`}
                                control={control}
                                rules={{
                                    validate: (value) => entryProblem({ ...getValues(`preauthorizedIdentifiers.${index}`), value }) ?? true,
                                }}
                                render={({ field, fieldState }) => (
                                    <div>
                                        <label className="sr-only" htmlFor={`identifier-${index}-value`}>
                                            Identifier {index + 1}
                                        </label>
                                        <TextInput
                                            id={`identifier-${index}-value`}
                                            dataTestId={`identifier-${index}-value`}
                                            value={field.value}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            placeholder={isIp ? '192.0.2.10' : 'apps.example.com'}
                                            disabled={disabled}
                                            invalid={
                                                !!fieldState.error && (fieldState.isTouched || fieldState.isDirty || field.value !== '')
                                            }
                                            error={
                                                fieldState.isTouched || fieldState.isDirty || field.value !== ''
                                                    ? fieldState.error?.message
                                                    : undefined
                                            }
                                        />
                                    </div>
                                )}
                            />
                            <Controller
                                name={`preauthorizedIdentifiers.${index}.matchType`}
                                control={control}
                                render={({ field }) => (
                                    <div>
                                        <label className="sr-only" htmlFor={`identifier-${index}-match`}>
                                            Match of identifier {index + 1}
                                        </label>
                                        <Select
                                            id={`identifier-${index}-match`}
                                            dataTestId={`identifier-${index}-match`}
                                            options={matchOptions}
                                            value={field.value}
                                            isDisabled={disabled || isIp}
                                            onChange={(value) => {
                                                field.onChange(value);
                                                if (value !== AcmeIdentifierMatchType.Subdomain) {
                                                    setValue(`preauthorizedIdentifiers.${index}.allowWildcard`, false);
                                                }
                                            }}
                                        />
                                    </div>
                                )}
                            />
                            <Controller
                                name={`preauthorizedIdentifiers.${index}.allowWildcard`}
                                control={control}
                                render={({ field }) => (
                                    <div className="flex h-full items-center">
                                        <Checkbox
                                            id={`identifier-${index}-wildcard`}
                                            dataTestId={`identifier-${index}-wildcard`}
                                            label="Wildcard"
                                            checked={!!field.value}
                                            onChange={field.onChange}
                                            disabled={disabled || !wildcardApplies}
                                        />
                                    </div>
                                )}
                            />
                            <Button
                                variant="transparent"
                                color="danger"
                                type="button"
                                className="!p-2"
                                title="Remove identifier"
                                aria-label={`Remove identifier ${index + 1}`}
                                disabled={disabled}
                                onClick={() => {
                                    remove(index);
                                    revalidateMode();
                                }}
                            >
                                <Trash2 size={16} />
                            </Button>
                        </div>
                    );
                })}

                <Button
                    variant="outline"
                    type="button"
                    disabled={disabled}
                    data-testid="add-identifier"
                    onClick={() => {
                        append(newPreauthorizedIdentifier(), { shouldFocus: false });
                        revalidateMode();
                    }}
                >
                    Add identifier
                </Button>
            </div>
        </div>
    );
}
