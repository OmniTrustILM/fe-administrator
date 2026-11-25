import { type ReactElement, useEffect, useRef } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { useSelector } from 'react-redux';
import Select from 'components/Select';
import { selectors as signingProfileSelectors } from 'ducks/signing-profiles';
import type { NameAndUuidDto, SigningProfileDto } from 'types/openapi';
import { validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import type { ContentSigningFormValues } from './ContentSigningWorkflowFields';

interface Props {
    /** Timestamp source the profile being edited saved, shown by name even when it no longer meets the floor. */
    savedSource?: NameAndUuidDto;
    /** Profile being edited, which Core refuses as its own timestamp source. */
    signingProfileUuid?: string;
}

const optionLabel = (candidate: SigningProfileDto) => (candidate.enabled ? candidate.name : `${candidate.name} (disabled)`);

const ineligibleMessage = (source: NameAndUuidDto) => `${source.name} no longer meets the requirements for a timestamp source.`;

/**
 * Required timestamp-source select offering the TIMESTAMPING profiles Core accepts, and naming each candidate it could not read.
 * A saved source read and found ineligible blocks the save; one this account cannot list is left for Core to judge.
 */
export default function TimestampSourceField({ savedSource, signingProfileUuid }: Readonly<Props>): ReactElement {
    const candidates = useSelector(signingProfileSelectors.timestampSourceCandidates);
    const ineligible = useSelector(signingProfileSelectors.ineligibleTimestampSourceCandidates);
    const unreadable = useSelector(signingProfileSelectors.unreadableTimestampSourceCandidates);
    const failure = useSelector(signingProfileSelectors.failedTimestampSourceCandidatesFetch);
    const isFetching = useSelector(signingProfileSelectors.isFetchingTimestampSourceCandidates);
    const { control, getValues, trigger } = useFormContext<ContentSigningFormValues>();

    // The rule reads the listing through this ref. A Controller captures its rules at registration.
    const ineligibleRef = useRef(ineligible);
    ineligibleRef.current = ineligible;
    const eligibleOrUnknown = (value: unknown) => {
        const source = ineligibleRef.current.find((candidate) => candidate.uuid === value);
        return source ? ineligibleMessage(source) : undefined;
    };
    const { field, fieldState } = useController({
        control,
        name: 'timestampSourceProfileUuid',
        rules: buildValidationRules([validateRequired(), eligibleOrUnknown]),
    });

    // biome-ignore lint/correctness/useExhaustiveDependencies: the source is re-validated whenever a listing reports ineligible sources.
    useEffect(() => {
        if (getValues('timestampSourceProfileUuid')) void trigger('timestampSourceProfileUuid');
    }, [ineligible, getValues, trigger]);

    const options = candidates
        .filter((candidate) => candidate.uuid !== signingProfileUuid)
        .map((candidate) => ({ value: candidate.uuid, label: optionLabel(candidate) }));
    const savedSourceMissing =
        !isFetching &&
        !failure &&
        savedSource !== undefined &&
        field.value === savedSource.uuid &&
        !options.some((o) => o.value === field.value);
    if (savedSourceMissing) options.push({ value: savedSource.uuid, label: savedSource.name });
    const savedSourceUnreadable = savedSourceMissing && unreadable.some((source) => source.uuid === savedSource.uuid);
    const savedSourceIneligible = savedSourceMissing && ineligible.some((source) => source.uuid === savedSource.uuid);

    let error = getFieldErrorMessage(fieldState);
    if (savedSourceUnreadable)
        error = `${savedSource.name} could not be read to check it still meets the requirements for a timestamp source.`;
    else if (savedSourceIneligible) error = ineligibleMessage(savedSource);
    else if (savedSourceMissing) error = `${savedSource.name} is not among the timestamping profiles this account can list.`;
    else if (failure) error = `Failed to list the timestamp sources${failure.reason ? `: ${failure.reason}` : ''}`;

    return (
        <div className="flex flex-col gap-1">
            <Select
                id="timestampSource"
                label="Timestamp Source"
                required
                value={field.value}
                onChange={(value) => field.onChange(typeof value === 'string' ? value : '')}
                options={options}
                placeholder="Select a timestamping profile…"
                isDisabled={isFetching}
                placement="bottom"
                error={error}
            />
            <div aria-live="polite">
                {unreadable
                    .filter((source) => source.uuid !== savedSource?.uuid)
                    .map((source) => (
                        <p key={source.uuid} className="text-xs text-content-subtle">
                            {source.name} could not be read, so it is not offered.
                        </p>
                    ))}
            </div>
        </div>
    );
}
