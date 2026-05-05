import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import { Copy } from 'lucide-react';
import React, { useCallback, useMemo } from 'react';
import Button from 'components/Button';
import type { JwkModel } from 'types/auth-settings';
import { useCopyToClipboard } from 'utils/common-hooks';

type Props = {
    jwkSetKeys?: JwkModel[];
};

const JwkSetKeysTable = ({ jwkSetKeys }: Props) => {
    const copyToClipboard = useCopyToClipboard();
    const headers: TableHeader[] = useMemo(
        () => [
            {
                id: 'kid',
                content: 'Key ID',
            },
            {
                id: 'type',
                content: 'Key Type',
            },
            {
                id: 'algorithm',
                content: 'Algorithm',
            },
            {
                id: 'moreInfo',
                content: '',
                width: '2%',
            },
        ],
        [],
    );
    const detailHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'kid',
                content: 'Property',
            },
            {
                id: 'algorithm',
                content: 'Value',
            },
            {
                id: 'moreInfo',
                content: '',
                width: '2%',
            },
        ],
        [],
    );

    const renderCopyKeyButton = useCallback(
        (publicKey: string) => (
            <Button
                variant="transparent"
                color="primary"
                title="Public Key"
                key="copy"
                onClick={() =>
                    copyToClipboard(
                        publicKey,
                        'Public key content was copied to clipboard',
                        'Failed to copy public key content to clipboard',
                    )
                }
            >
                <Copy size={16} />
            </Button>
        ),
        [copyToClipboard],
    );

    const createDetailDataForTable = useCallback(
        (jwkKeySet: JwkModel): TableDataRow[] => {
            return [
                {
                    id: 'kid',
                    columns: ['Key ID', jwkKeySet.kid],
                },
                {
                    id: 'type',
                    columns: ['Key Type', jwkKeySet.keyType ?? ''],
                },
                {
                    id: 'use',
                    columns: ['Key Use', jwkKeySet.use ?? ''],
                },
                {
                    id: 'algorithm',
                    columns: ['Algorithm', jwkKeySet.algorithm ?? ''],
                },
                {
                    id: 'value',
                    columns: [
                        'Base64 Encoded Value',
                        <span
                            key="value"
                            style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                wordBreak: 'break-all',
                            }}
                        >
                            {jwkKeySet.publicKey}
                        </span>,
                        renderCopyKeyButton(jwkKeySet.publicKey),
                    ],
                },
            ];
        },
        [renderCopyKeyButton],
    );

    const data: TableDataRow[] = useMemo(
        () =>
            jwkSetKeys
                ? jwkSetKeys.map(
                      (key) =>
                          ({
                              id: key.kid,
                              columns: [key.kid, key.keyType, key.algorithm, renderCopyKeyButton(key.publicKey)],
                              detailColumns: [
                                  <></>,
                                  <CustomTable
                                      key="details"
                                      hasHeader={false}
                                      headers={detailHeaders}
                                      data={createDetailDataForTable(key)}
                                  />,
                              ],
                          }) as TableDataRow,
                  )
                : [],
        [jwkSetKeys, createDetailDataForTable, detailHeaders, renderCopyKeyButton],
    );
    return <CustomTable hasDetails={true} headers={headers} data={data} />;
};

export default JwkSetKeysTable;
