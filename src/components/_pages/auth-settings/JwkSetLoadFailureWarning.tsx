import Callout from 'components/Callout';
import { getEnumDescription, getEnumLabel, selectors as enumSelectors } from 'ducks/enums';
import { useSelector } from 'react-redux';
import { type JwkSetLoadFailure, PlatformEnum } from 'types/openapi';

type Props = Readonly<{
    failure?: JwkSetLoadFailure;
}>;

export default function JwkSetLoadFailureWarning({ failure }: Props) {
    const failures = useSelector(enumSelectors.platformEnum(PlatformEnum.JwkSetLoadFailure));

    if (!failure) return null;

    const label = getEnumLabel(failures, failure);
    const description = getEnumDescription(failures, failure);

    return (
        <Callout severity="warning" role="status" className="mb-3" dataTestId="jwk-set-load-failure-warning">
            <div className="font-semibold">{label}</div>
            {description && <div className="mt-1">{description}</div>}
        </Callout>
    );
}
