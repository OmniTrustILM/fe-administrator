import { Link } from 'react-router';

type Props = {
    uuid?: string;
    name?: string;
    fallback?: string;
};

// Instances can carry a provider name without a resolvable connector UUID. Linking anyway navigates to
// /connectors/detail/undefined, which the backend rejects with 400 and locks the page.
export default function ConnectorLink({ uuid, name, fallback = '' }: Props) {
    const label = name || fallback;
    return uuid ? <Link to={`/connectors/detail/${uuid}`}>{label}</Link> : <>{label}</>;
}
