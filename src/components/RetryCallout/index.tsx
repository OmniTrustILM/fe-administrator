import Button from 'components/Button';
import Callout from 'components/Callout';

type Props = Readonly<{
    message: string | undefined;
    onRetry: () => void;
}>;

/** Something a form needs that failed to load, said in its flow, with a Retry that loads it again. */
export default function RetryCallout({ message, onRetry }: Props) {
    return (
        <Callout severity="danger" role="alert" className="flex items-center justify-between gap-3">
            <span>{message}</span>
            <Button variant="outline" color="danger" onClick={onRetry}>
                Retry
            </Button>
        </Callout>
    );
}
