import { useMemo } from 'react';
import type { AcmeIdentifierAuthorizationMode, AcmePreauthorizedIdentifierDto } from 'types/openapi';
import { createMockStore, withProviders } from 'utils/test-helpers';
import { IDENTIFIER_ENUMS } from 'components/_pages/acme-profiles/identifiers/identifierEnumsFixture';
import PreauthorizedIdentifiersWidget from 'components/_pages/acme-profiles/identifiers/PreauthorizedIdentifiersWidget';

type Props = Readonly<{
    identifiers: AcmePreauthorizedIdentifierDto[];
    mode?: AcmeIdentifierAuthorizationMode;
}>;

export default function PreauthorizedIdentifiersWidgetHarness({ identifiers, mode }: Props) {
    const store = useMemo(() => createMockStore({ enums: { platformEnums: IDENTIFIER_ENUMS } }), []);
    return withProviders(<PreauthorizedIdentifiersWidget identifiers={identifiers} mode={mode} />, { store });
}
