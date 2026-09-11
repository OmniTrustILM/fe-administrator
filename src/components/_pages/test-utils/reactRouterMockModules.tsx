import type { ReactNode } from 'react';

const Link = ({ to, children }: { to: string; children?: ReactNode }) => <a href={to}>{children}</a>;

const useSearchParams = () => [new URLSearchParams(), () => undefined] as const;

export const listRouterMockModule = {
    Link,
};

export const secretDetailRouterMockModule = {
    Link,
    useParams: () => ({ id: 'sec-1' }),
    useSearchParams,
};

export const vaultProfileDetailRouterMockModule = {
    Link,
    useParams: () => ({ vaultUuid: 'vault-1', id: 'vp-1' }),
    useSearchParams,
};
