import { firstValueFrom, of } from 'rxjs';
import { describe, expect, test, vi } from 'vitest';
import { TokenInstanceAttributesApi } from './token-instance-api';

function createClientWithRequestSpy() {
    const client = new TokenInstanceAttributesApi();
    const request = vi.fn(() => of([]));
    Object.defineProperty(client, 'request', { value: request });
    return { client, request };
}

describe('TokenInstanceManagementApi.listTokenAttributes', () => {
    test('listTokenAttributes_buildsTokenInstanceRequest_withLegacyKind', async () => {
        // given
        const connectorUuid = 'legacy-connector';
        const kind = 'PKCS11';
        const { client, request } = createClientWithRequestSpy();

        // when
        await firstValueFrom(client.listTokenAttributes({ connectorUuid, kind }));

        // then
        expect(request).toHaveBeenCalledWith(
            {
                url: `/v1/tokens/${connectorUuid}/attributes`,
                method: 'GET',
                queryParams: { kind },
            },
            undefined,
        );
    });

    test('listTokenAttributes_omitsKind_forV2Connector', async () => {
        // given
        const connectorUuid = 'v2-connector';
        const { client, request } = createClientWithRequestSpy();

        // when
        await firstValueFrom(client.listTokenAttributes({ connectorUuid }));

        // then
        expect(request).toHaveBeenCalledWith(
            {
                url: `/v1/tokens/${connectorUuid}/attributes`,
                method: 'GET',
                queryParams: {},
            },
            undefined,
        );
    });
});
