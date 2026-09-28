import { actions, selectors } from 'ducks/certificates';
import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { FieldValues } from 'react-hook-form';
import type { AttributeDescriptorModel, AttributeRequestModel } from 'types/attributes';
import { collectFormAttributes } from 'utils/attributes/attributes';

export const IDENTIFY_ATTRIBUTES_FORM_ID = 'identify';

export type IdentifyAttributes = {
    raProfileUuid?: string;
    descriptors: AttributeDescriptorModel[];
    isFetching: boolean;
    callbackAttributes: AttributeDescriptorModel[];
    setCallbackAttributes: Dispatch<SetStateAction<AttributeDescriptorModel[]>>;
    collect: (values: FieldValues) => AttributeRequestModel[];
};

export function useIdentifyAttributes(raProfileUuid?: string, authorityUuid?: string): IdentifyAttributes {
    const dispatch = useDispatch();
    const assigned = !!raProfileUuid && !!authorityUuid;
    const schema = useSelector(selectors.identifyAttributes);
    const descriptors = useMemo(() => (assigned ? schema : []), [assigned, schema]);
    const isFetching = useSelector(selectors.isFetchingIdentifyAttributes);
    const [callbackAttributes, setCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);

    useEffect(() => {
        if (raProfileUuid && authorityUuid) {
            dispatch(actions.getIdentifyAttributes({ raProfileUuid, authorityUuid }));
        } else {
            dispatch(actions.clearIdentifyAttributes());
        }
        return () => {
            dispatch(actions.clearIdentifyAttributes());
        };
    }, [dispatch, raProfileUuid, authorityUuid]);

    const collect = useCallback(
        (values: FieldValues) =>
            assigned ? collectFormAttributes(IDENTIFY_ATTRIBUTES_FORM_ID, [...descriptors, ...callbackAttributes], values) : [],
        [assigned, descriptors, callbackAttributes],
    );

    return { raProfileUuid, descriptors, isFetching, callbackAttributes, setCallbackAttributes, collect };
}
