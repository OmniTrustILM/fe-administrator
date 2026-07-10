import Container from 'components/Container';
import ProgressButton from 'components/ProgressButton';
import RequestAttributeAuthoringEditor from 'components/RequestAttributes/RequestAttributeAuthoringEditor';
import Widget from 'components/Widget';
import { actions, selectors } from 'ducks/raProfileRequestAttributes';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    buildPlatformDefaultUpdateDto,
    emptyAuthoringForm,
    parsePlatformDefaultDto,
    type RequestAttributeAuthoringFormValues,
} from 'utils/requestAttributeAuthoring';

/**
 * Platform-wide default request-attribute set editor. Reads/writes the `/platform`
 * `CertificateSettings.requestAttributes` sub-section through the duck (no bespoke endpoint,
 * no merge mode).
 */
export default function RequestAttributesSettings() {
    const dispatch = useDispatch();

    const defaultSet = useSelector(selectors.defaultSet);
    const isFetching = useSelector(selectors.isFetchingDefaultSet);
    const isUpdating = useSelector(selectors.isUpdatingDefaultSet);

    const [form, setForm] = useState<RequestAttributeAuthoringFormValues>(emptyAuthoringForm());

    useEffect(() => {
        dispatch(actions.getPlatformDefaultRequestAttributes());
    }, [dispatch]);

    useEffect(() => {
        setForm({ ...emptyAuthoringForm(), attributes: parsePlatformDefaultDto(defaultSet) });
    }, [defaultSet]);

    const onSave = useCallback(() => {
        dispatch(
            actions.updatePlatformDefaultRequestAttributes({
                data: buildPlatformDefaultUpdateDto(form.attributes),
            }),
        );
    }, [dispatch, form.attributes]);

    const editor = useMemo(
        () => <RequestAttributeAuthoringEditor value={form} onChange={setForm} disabled={isUpdating} />,
        [form, isUpdating],
    );

    return (
        <Widget title="Default Request Attributes" titleSize="large" busy={isFetching} noBorder>
            <div className="space-y-4">
                <p className="text-sm text-gray-500">
                    The platform default request-attribute set is the terminal fallback used when an RA Profile does not define its own set.
                </p>
                {editor}
                <Container className="flex-row justify-end" gap={4}>
                    <ProgressButton
                        title="Save Default Request Attributes"
                        inProgressTitle="Saving..."
                        inProgress={isUpdating}
                        onClick={onSave}
                        type="button"
                    />
                </Container>
            </div>
        </Widget>
    );
}
