import { useCallback } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';

import Button from 'components/Button';
import Container from 'components/Container';
import ProgressButton from 'components/ProgressButton';
import TextInput from 'components/TextInput';
import { actions as certificateActions, selectors as certificateSelectors } from 'ducks/certificates';
import { actions as raProfileActions, selectors as raProfileSelectors } from 'ducks/ra-profiles';
import { composeValidators, validatePositiveInteger, validateRange } from 'utils/validators';

export type EarlyRenewalTarget =
    | { kind: 'raProfile'; authorityUuid: string; raProfileUuid: string; name?: string }
    | { kind: 'selection'; uuids: string[] };

type Props = Readonly<{
    target: EarlyRenewalTarget;
    onClose: () => void;
}>;

type FormValues = {
    spreadHours: string;
    explanationUrl: string;
};

const DEFAULT_SPREAD_HOURS = 24;
const MIN_SPREAD_HOURS = 1;
const MAX_SPREAD_HOURS = 720;
const SECONDS_PER_HOUR = 3600;

const validateSpreadHours = composeValidators(
    (value: unknown) =>
        value === undefined || value === null || (typeof value === 'string' && value.trim() === '') ? 'Required Field' : undefined,
    validatePositiveInteger(),
    validateRange(MIN_SPREAD_HOURS, MAX_SPREAD_HOURS, `Value must be between ${MIN_SPREAD_HOURS} and ${MAX_SPREAD_HOURS}`),
);

const validateExplanationUrl = (value: string) => {
    if (!value.trim()) return undefined;
    try {
        const { protocol } = new URL(value.trim());
        return protocol === 'http:' || protocol === 'https:' ? undefined : 'Value must be an absolute http or https URL';
    } catch {
        return 'Value must be an absolute http or https URL';
    }
};

export default function EarlyRenewalDialog({ target, onClose }: Props) {
    const dispatch = useDispatch();
    const isRaProfileBusy = useSelector(raProfileSelectors.isRequestingEarlyRenewal);
    const isBulkBusy = useSelector(certificateSelectors.isRequestingEarlyRenewal);
    const isBusy = target.kind === 'raProfile' ? isRaProfileBusy : isBulkBusy;

    const methods = useForm<FormValues>({
        mode: 'onTouched',
        defaultValues: { spreadHours: String(DEFAULT_SPREAD_HOURS), explanationUrl: '' },
    });
    const { control, handleSubmit } = methods;
    const spreadHours = useWatch({ control, name: 'spreadHours' });
    const shownHours = validateSpreadHours(spreadHours) ? '...' : `${Number(spreadHours)} h`;

    const onSubmit = useCallback(
        (values: FormValues) => {
            const explanationUrl = values.explanationUrl.trim();
            const request = {
                spreadSeconds: Number(values.spreadHours) * SECONDS_PER_HOUR,
                ...(explanationUrl ? { explanationUrl } : {}),
            };

            if (target.kind === 'raProfile') {
                dispatch(
                    raProfileActions.requestRaProfileEarlyRenewal({
                        authorityUuid: target.authorityUuid,
                        raProfileUuid: target.raProfileUuid,
                        request,
                    }),
                );
            } else {
                dispatch(certificateActions.bulkRequestEarlyRenewal({ uuids: target.uuids, ...request }));
            }
            onClose();
        },
        [dispatch, onClose, target],
    );

    const scope =
        target.kind === 'raProfile'
            ? `all eligible certificates of ${target.name ?? 'this RA profile'}`
            : `the eligible certificates among the ${target.uuids.length} selected`;

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="mt-2">
                <Controller
                    name="spreadHours"
                    control={control}
                    rules={{ validate: validateSpreadHours }}
                    render={({ field, fieldState }) => (
                        <TextInput
                            id="spreadHours"
                            label="Spread (hours)"
                            type="number"
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            invalid={!!fieldState.error && fieldState.isTouched}
                            error={fieldState.error?.message}
                        />
                    )}
                />
                <Controller
                    name="explanationUrl"
                    control={control}
                    rules={{ validate: validateExplanationUrl }}
                    render={({ field, fieldState }) => (
                        <TextInput
                            id="explanationUrl"
                            label="Explanation URL (optional)"
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            invalid={!!fieldState.error && fieldState.isTouched}
                            error={fieldState.error?.message}
                        />
                    )}
                />

                <p className="mb-4 text-sm text-content-muted" data-testid="early-renewal-effect">
                    For {scope}, the renewal windows are set to now … now + {shownHours}; nothing is revoked. Clients spread their renewals
                    across the window.
                </p>

                <Container className="flex-row justify-end modal-footer" gap={4}>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <ProgressButton
                        title="Request early renewal"
                        inProgressTitle="Requesting..."
                        disabled={isBusy}
                        inProgress={isBusy}
                        type="submit"
                    />
                </Container>
            </form>
        </FormProvider>
    );
}
