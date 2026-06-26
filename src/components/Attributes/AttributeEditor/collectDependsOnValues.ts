import { type AttributeDescriptorModel, isDataAttributeModel, isGroupAttributeModel } from 'types/attributes';
import { AttributeVersion, type BaseAttributeContentDtoV2, type RequestAttribute } from 'types/openapi';

/**
 * Extracts the raw attribute content array from a stored react-hook-form value.
 *
 * The AttributeEditor stores form values in several shapes depending on the
 * descriptor:
 *  - list / RESOURCE (single select): the option object `{ label, value }`,
 *    where `value` is the raw content object (e.g. `{ reference, data }`);
 *  - list multiSelect: an array of such option objects;
 *  - scalar (non-list): the primitive value directly (string / number / boolean);
 *  - File: `{ content, fileName, mimeType }`.
 *
 * For the NG (Attributes v2) `dependsOn` callback we forward the *raw content*
 * with no dot-path resolution and no scalar flattening of objects — exactly the
 * content the connector expects to receive back. Returns `undefined` when the
 * value is absent (empty string, null, undefined, empty array).
 */
function extractRawContent(formValue: unknown): Array<BaseAttributeContentDtoV2> | undefined {
    if (formValue === undefined || formValue === null || formValue === '') return undefined;

    // list multiSelect → array of { label, value }
    if (Array.isArray(formValue)) {
        if (formValue.length === 0) return undefined;
        const content = formValue
            .map((option) => (isOptionObject(option) ? option.value : option))
            .filter((c): c is BaseAttributeContentDtoV2 => c !== undefined && c !== null);
        return content.length > 0 ? content : undefined;
    }

    // single list / RESOURCE select → { label, value }
    if (isOptionObject(formValue)) {
        return formValue.value === undefined || formValue.value === null ? undefined : [formValue.value as BaseAttributeContentDtoV2];
    }

    // scalar (string / number / boolean) → wrap as a content object
    return [{ data: formValue } as BaseAttributeContentDtoV2];
}

function isOptionObject(value: unknown): value is { label?: unknown; value: unknown } {
    return typeof value === 'object' && value !== null && 'value' in value && 'label' in value;
}

/**
 * Builds the `RequestAttribute[]` payload for an NG (`dependsOn`) callback.
 *
 * For each name in the triggering descriptor's `attributeCallback.dependsOn`,
 * finds the matching descriptor among all descriptors and reads the *raw current
 * content* of that attribute from the form values. Sends only the `dependsOn`-named
 * attributes (never the whole form) as raw content objects — no `from`/`to`
 * mapping, no dot-path resolution.
 *
 * Returns `undefined` (the all-present gate) when ANY named dependency has no
 * value, so the caller does not fire the callback.
 */
export function collectDependsOnValues(
    callbackDescriptor: AttributeDescriptorModel,
    allDescriptors: AttributeDescriptorModel[],
    formValues: Record<string, any>,
    id: string,
): RequestAttribute[] | undefined {
    if (!isDataAttributeModel(callbackDescriptor) && !isGroupAttributeModel(callbackDescriptor)) return undefined;

    const dependsOn = callbackDescriptor.attributeCallback?.dependsOn;
    if (!dependsOn) return undefined;

    // dependsOn: [] fires with an empty payload (the caller drives the once-on-mount semantics).
    if (dependsOn.length === 0) return [];

    const formAttributes = (formValues?.[`__attributes__${id}__`] ?? {}) as Record<string, any>;
    const result: RequestAttribute[] = [];

    for (const name of dependsOn) {
        const descriptor = allDescriptors.find((d) => d.name === name);
        // A named dependency without a resolvable Data descriptor cannot be serialised — treat as missing.
        if (!descriptor || !isDataAttributeModel(descriptor)) return undefined;

        const content = extractRawContent(formAttributes[name]);
        // All-present gate: any missing dependency suppresses the callback.
        if (content === undefined) return undefined;

        result.push({
            uuid: descriptor.uuid,
            name: descriptor.name,
            contentType: descriptor.contentType,
            version: AttributeVersion.V2,
            content,
        });
    }

    return result;
}
