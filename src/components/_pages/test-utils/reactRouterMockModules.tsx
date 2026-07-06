import type { ReactNode } from 'react';

const Link = ({ to, children }: { to: string; children?: ReactNode }) => <a href={to}>{children}</a>;

export const listRouterMockModule = {
    Link,
};

export const secretDetailRouterMockModule = {
    Link,
    useParams: () => ({ id: 'sec-1' }),
};

export const vaultProfileDetailRouterMockModule = {
    Link,
    useParams: () => ({ vaultUuid: 'vault-1', id: 'vp-1' }),
};
