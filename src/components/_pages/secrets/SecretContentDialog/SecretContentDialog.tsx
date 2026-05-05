import { Copy } from 'lucide-react';
import Button from 'components/Button';
import Spinner from 'components/Spinner';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import type {
    ApiKeySecretContent,
    BasicAuthSecretContent,
    GenericSecretContent,
    JwtTokenSecretContent,
    KeyStoreSecretContent,
    KeyValueSecretContent,
    PrivateKeySecretContent,
    SecretContent,
    SecretKeySecretContent,
} from 'types/openapi';
import { SecretType } from 'types/openapi';
import { useCopyToClipboard } from 'utils/common-hooks';

const headers: TableHeader[] = [
    { id: 'property', content: 'Property' },
    { id: 'value', content: 'Value' },
    { id: 'action', content: 'Action' },
];

function buildRows(content: SecretContent, copyToClipboard: (text: string, msg: string) => void): TableDataRow[] {
    const copyButton = (value: string, label: string) => (
        <Button
            key="copy"
            variant="transparent"
            color="secondary"
            onClick={() => copyToClipboard(value, `"${label}" copied to clipboard`)}
            title={`Copy "${label}" to clipboard`}
            aria-label={`Copy "${label}" to clipboard`}
        >
            <Copy size={16} />
        </Button>
    );

    const row = (label: string, value: string, multiline = false): TableDataRow => ({
        id: label,
        columns: [
            label,
            <span key="copyToClipboardValue" className={multiline ? 'font-mono break-all whitespace-pre-wrap' : 'font-mono break-all'}>
                {value}
            </span>,
            copyButton(value, label),
        ],
    });

    switch (content.type) {
        case SecretType.BasicAuth: {
            const c = content as BasicAuthSecretContent;
            return [row('Username', c.username), row('Password', c.password)];
        }
        case SecretType.ApiKey: {
            const c = content as ApiKeySecretContent;
            return [row('API Key', c.content)];
        }
        case SecretType.JwtToken: {
            const c = content as JwtTokenSecretContent;
            return [row('JWT Token', c.content)];
        }
        case SecretType.PrivateKey: {
            const c = content as PrivateKeySecretContent;
            return [row('Private Key (PEM, BASE64)', c.content, true)];
        }
        case SecretType.SecretKey: {
            const c = content as SecretKeySecretContent;
            return [row('Secret Key (BASE64)', c.content)];
        }
        case SecretType.KeyStore: {
            const c = content as KeyStoreSecretContent;
            return [row('Key Store Type', c.keyStoreType), row('Content (BASE64)', c.content), row('Password', c.password)];
        }
        case SecretType.KeyValue: {
            const c = content as KeyValueSecretContent;
            return Object.entries(c.content).map(([key, value]) => {
                const displayValue = typeof value === 'string' ? value : JSON.stringify(value);
                return row(key, displayValue);
            });
        }
        case SecretType.Generic: {
            const c = content as GenericSecretContent;
            return [row('Content', c.content, true)];
        }
        default:
            return [];
    }
}

type Props = Readonly<{
    content: SecretContent | undefined;
    isFetching: boolean;
}>;

export function SecretContentDialog({ content, isFetching }: Props) {
    const copyToClipboard = useCopyToClipboard();

    if (isFetching) {
        return (
            <div className="relative h-20">
                <Spinner active />
            </div>
        );
    }

    if (!content) return null;

    return <CustomTable headers={headers} data={buildRows(content, copyToClipboard)} />;
}
