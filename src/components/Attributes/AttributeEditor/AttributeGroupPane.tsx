import Button from 'components/Button';
import Widget from 'components/Widget';
import cn from 'classnames';
import { ChevronRight } from 'lucide-react';
import type React from 'react';
import { useEffect, useId, useState } from 'react';
import { get, useFormState, useWatch } from 'react-hook-form';
import type { CustomAttributeModel, DataAttributeModel, InfoAttributeModel } from 'types/attributes';
import { collectFormAttributes } from 'utils/attributes/attributes';
import {
    getAttributeEditorAttributeKey,
    getAttributeEditorAttributesKey,
    getAttributeEditorDeletedAttributesKey,
} from './attributeEditorKeys';

type GroupDescriptor = DataAttributeModel | InfoAttributeModel | CustomAttributeModel;

type Props = Readonly<{
    editorId: string;
    group: string;
    title: string;
    control?: React.ReactNode;
    descriptors: GroupDescriptor[];
    /** Text the folded summary line adds after the values. */
    summaryNote?: string;
    busy: boolean;
    children: React.ReactNode;
}>;

const isRequired = (descriptor: GroupDescriptor) => 'required' in descriptor.properties && !!descriptor.properties.required;

/** Labels of the group's attributes that hold a value, in the order the group shows them. */
function useSetLabels(editorId: string, descriptors: GroupDescriptor[]): string[] {
    const attributesKey = getAttributeEditorAttributesKey(editorId);
    const deletedKey = getAttributeEditorDeletedAttributesKey(editorId);
    const [attributes, deleted] = useWatch({ name: [attributesKey, deletedKey] });
    const setNames = new Set(
        collectFormAttributes(editorId, descriptors, { [attributesKey]: attributes, [deletedKey]: deleted }, undefined, {
            omitEmptyContent: true,
        }).map((attribute) => attribute.name),
    );
    return descriptors.filter((descriptor) => setNames.has(descriptor.name)).map((descriptor) => descriptor.properties.label);
}

/**
 * Bordered section of one attribute group that folds to a summary line. Its fields stay mounted while folded, so their values
 * and validation carry on, and the section opens when it gains a value or an error so neither is hidden from the operator.
 */
export default function AttributeGroupPane({ editorId, group, title, control, descriptors, summaryNote, busy, children }: Props) {
    const setLabels = useSetLabels(editorId, descriptors);
    const { errors } = useFormState();
    const hasValue = setLabels.length > 0;
    const errorLabels = descriptors
        .filter((descriptor) => !!get(errors, getAttributeEditorAttributeKey(editorId, descriptor.name)))
        .map((descriptor) => descriptor.properties.label);
    const hasError = errorLabels.length > 0;
    const [expanded, setExpanded] = useState(() => hasValue || hasError || descriptors.some(isRequired));
    const contentId = useId();

    useEffect(() => {
        if (hasValue || hasError) setExpanded(true);
    }, [hasValue, hasError]);

    return (
        <Widget busy={busy} dataTestId={`attribute-group-${group}`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
                <h5>
                    <Button
                        variant="transparent"
                        color="secondary"
                        type="button"
                        className="-ml-2"
                        onClick={() => setExpanded(!expanded)}
                        aria-expanded={expanded}
                        aria-controls={contentId}
                        data-testid={`attribute-group-toggle-${group}`}
                    >
                        <ChevronRight size={16} className={cn('shrink-0 transition-transform', { 'rotate-90': expanded })} />
                        {/* The button's own text size and weight would compete with classes set on it. */}
                        <span className="text-base font-bold">{title}</span>
                    </Button>
                </h5>
                {control}
            </div>
            {!expanded && (
                <p className="mt-2 pl-6 text-sm text-content-subtle" data-testid={`attribute-group-summary-${group}`}>
                    {[hasValue ? `Set: ${setLabels.join(', ')}` : 'Nothing set', summaryNote].filter(Boolean).join(' · ')}
                    {hasError && <span className="text-danger">{` · Needs attention: ${errorLabels.join(', ')}`}</span>}
                </p>
            )}
            {/* A browser refuses a submit over an invalid field it cannot show, so such a field opens its section. */}
            <div id={contentId} hidden={!expanded} onInvalidCapture={() => setExpanded(true)} className="mt-3 [&>div:last-child]:mb-0">
                {children}
            </div>
        </Widget>
    );
}
