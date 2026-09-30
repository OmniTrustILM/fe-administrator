import { actions, selectors } from 'ducks/certificates';
import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { FieldValues } from 'react-hook-form';
import type { AttributeDescriptorModel, AttributeRequestModel } from 'types/attributes';
import { collectFormAttributes } from 'utils/attributes/attributes';

const operations = {
    renew: {
        schemaSelector: selectors.renewAttributes,
        isFetchingSelector: selectors.isFetchingRenewAttributes,
        get: actions.getRenewAttributes,
        clear: actions.clearRenewAttributes,
    },
    identify: {
        schemaSelector: selectors.identifyAttributes,
        isFetchingSelector: selectors.isFetchingIdentifyAttributes,
        get: actions.getIdentifyAttributes,
        clear: actions.clearIdentifyAttributes,
    },
};

export type AttributeOperation = keyof typeof operations;

export type OperationAttributes = {
    operation: AttributeOperation;
    raProfileUuid?: string;
    descriptors: AttributeDescriptorModel[];
    isFetching: boolean;
    callbackAttributes: AttributeDescriptorModel[];
    setCallbackAttributes: Dispatch<SetStateAction<AttributeDescriptorModel[]>>;
    collect: (values: FieldValues) => AttributeRequestModel[];
};

export function useOperationAttributes(operation: AttributeOperation, raProfileUuid?: string, authorityUuid?: string): OperationAttributes {
    const dispatch = useDispatch();
    const { schemaSelector, isFetchingSelector, get, clear } = operations[operation];
    const assigned = !!raProfileUuid && !!authorityUuid;
    const schema = useSelector(schemaSelector);
    const descriptors = useMemo(() => (assigned ? schema : []), [assigned, schema]);
    const isFetching = useSelector(isFetchingSelector);
    const [callbackAttributes, setCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);

    useEffect(() => {
        setCallbackAttributes([]);
        if (raProfileUuid && authorityUuid) {
            dispatch(get({ raProfileUuid, authorityUuid }));
        } else {
            dispatch(clear());
        }
        return () => {
            dispatch(clear());
        };
    }, [dispatch, get, clear, raProfileUuid, authorityUuid]);

    const collect = useCallback(
        (values: FieldValues) => (assigned ? collectFormAttributes(operation, [...descriptors, ...callbackAttributes], values) : []),
        [operation, assigned, descriptors, callbackAttributes],
    );

    return { operation, raProfileUuid, descriptors, isFetching, callbackAttributes, setCallbackAttributes, collect };
}
