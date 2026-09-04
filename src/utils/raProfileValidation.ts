import type { RaProfileCertificateRequestAttributesDto, RaProfileCertificateRequestAttributesUpdateDto } from 'types/openapi';
import { DEFAULT_MERGE_MODE, MERGE_MODE_AND_BINDINGS_ENABLED } from 'utils/requestAttributeAuthoring';

export type RequestValidationFormValues = {
    usePlatformSettings: boolean;
    strict: boolean;
};

export function resolveExternalCsrStrict(profileStrict: boolean | null | undefined, platformStrict: boolean | null | undefined): boolean {
    return profileStrict ?? platformStrict ?? false;
}

export function externalCsrValidationModeLabel(strict: boolean): string {
    return strict ? 'Strict' : 'Lenient';
}

export function externalCsrValidationModeDescription(strict: boolean): string {
    return strict ? 'Non-compliant external CSRs are rejected' : 'Non-compliant external CSRs are accepted';
}

export function requestValidationDefaultFormValues(
    profileStrict: boolean | null | undefined,
    platformStrict: boolean | null | undefined,
): RequestValidationFormValues {
    const usePlatformSettings = profileStrict === null || profileStrict === undefined;
    return {
        usePlatformSettings,
        strict: resolveExternalCsrStrict(profileStrict, platformStrict),
    };
}

export function requestValidationFormValuesToUpdateDto(
    values: RequestValidationFormValues,
    currentConfiguration?: RaProfileCertificateRequestAttributesDto,
    enabled: boolean = MERGE_MODE_AND_BINDINGS_ENABLED,
): RaProfileCertificateRequestAttributesUpdateDto {
    // This dialog has no UI for merge mode / bindings, so while the feature is hidden (fe#1908) it
    // coerces them to `DEFAULT_MERGE_MODE` / no bindings like every other save path. `enabled`
    // defaults to the flag and is a seam so tests can exercise the re-enabled round-trip.
    return {
        requestAttributes: currentConfiguration?.requestAttributes,
        mergeMode: enabled ? currentConfiguration?.mergeMode : DEFAULT_MERGE_MODE,
        valueSourceBindings: enabled ? currentConfiguration?.valueSourceBindings : [],
        // `null` means "inherit the platform default", but the generated model types this field as
        // `boolean | undefined` (the spec omits `nullable`). Narrow the cast to just this field so the
        // rest of the literal stays type-checked against the DTO.
        externalCsrValidationStrict: (values.usePlatformSettings ? null : values.strict) as unknown as boolean | undefined,
    };
}

function complianceErrorMessage(item: unknown): string | undefined {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') {
        const message = (item as { message?: unknown }).message;
        if (typeof message === 'string') return message;
    }
    return undefined;
}

function isString(value: string | undefined): value is string {
    return typeof value === 'string' && value.length > 0;
}

const REQUEST_ATTRIBUTE_POLICY_MARKER = 'does not satisfy the request-attribute policy';

function extractWrappedPolicyErrors(response: unknown): string[] | undefined {
    const message = (response as { message?: unknown } | undefined)?.message;
    if (typeof message !== 'string' || !message.includes(REQUEST_ATTRIBUTE_POLICY_MARKER)) return undefined;

    const [headline, ...violations] = message
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    if (violations.length > 0) return violations;
    return headline ? [headline] : undefined;
}

export function extractComplianceErrors(err: unknown): string[] | undefined {
    const ajaxError = err as { status?: unknown; response?: unknown };
    if (ajaxError?.status === 400) return extractWrappedPolicyErrors(ajaxError.response);
    if (ajaxError?.status !== 422) return undefined;

    const response = ajaxError.response;

    if (Array.isArray(response)) {
        const messages = response.map(complianceErrorMessage).filter(isString);
        return messages.length > 0 ? messages : undefined;
    }

    if (response && typeof response === 'object') {
        const { errors, message } = response as { errors?: unknown; message?: unknown };
        if (Array.isArray(errors)) {
            const messages = errors.map(complianceErrorMessage).filter(isString);
            if (messages.length > 0) return messages;
        }
        if (typeof message === 'string' && message.length > 0) return [message];
    }

    return undefined;
}

/** A rendered attribute a backend validation message can be attributed to. */
export type AttributeErrorTarget = { name: string; label: string };

const ATTRIBUTE_ERROR_PREFIX = 'Extension value of attribute ';

/**
 * Split backend validation messages into per-attribute errors and the rest. The 422 body is a flat
 * list of strings, each `Extension value of attribute <label>: ...`, where `<label>` is the
 * definition's `properties.label` falling back to `name` — there is no field identifier in the
 * payload, so placing an error on its field means matching that prefix against the rendered
 * descriptors' labels. Longer labels are tried first, because a label may itself contain `: ` and
 * would otherwise be shadowed by a shorter prefix-sharing one. A label shared by several targets
 * cannot be disambiguated, so its messages stay unattributed rather than land on the wrong field.
 */
export function splitAttributeValidationErrors(
    errors: string[],
    targets: AttributeErrorTarget[],
): { byAttributeName: Map<string, string[]>; unattributed: string[] } {
    const byAttributeName = new Map<string, string[]>();
    const unattributed: string[] = [];
    const targetCountByLabel = new Map<string, number>();
    for (const t of targets) {
        targetCountByLabel.set(t.label, (targetCountByLabel.get(t.label) ?? 0) + 1);
    }
    const byLabelLengthDesc = [...targets].sort((a, b) => b.label.length - a.label.length);
    for (const error of errors) {
        const target = byLabelLengthDesc.find((t) => error.startsWith(`${ATTRIBUTE_ERROR_PREFIX}${t.label}: `));
        if (!target || (targetCountByLabel.get(target.label) ?? 0) > 1) {
            unattributed.push(error);
            continue;
        }
        const message = error.slice(ATTRIBUTE_ERROR_PREFIX.length + target.label.length + 2);
        const existing = byAttributeName.get(target.name);
        if (existing) {
            existing.push(message);
        } else {
            byAttributeName.set(target.name, [message]);
        }
    }
    return { byAttributeName, unattributed };
}
