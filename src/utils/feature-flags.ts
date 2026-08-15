/**
 * Centralized feature-flag helpers.
 *
 * Flags are sourced from `globalThis.__ENV__`, which is injected at runtime from `config.js` before the application boots
 * (in browsers `window === globalThis`). Reading them once at module-load time is safe and avoids scattering the raw
 * `globalThis?.__ENV__?.ENABLE_*` expression across the codebase.
 */
const env = (globalThis as typeof globalThis & { __ENV__?: Env }).__ENV__;

export const featureFlags = {
    /** When `false`, all proxy-related UI (routes, sidebar, columns, forms) is hidden. */
    isProxiesEnabled: env?.ENABLE_PROXIES === true,

    /** When `false`, all trusted-certificate-related UI is hidden. */
    isTrustedCertificatesEnabled: env?.ENABLE_TRUSTED_CERTIFICATES === true,

    /**
     * When `false`, the platform renders its own identity and the branding duck resolves to defaults without issuing a
     * request. Off by default like the other flags, so an instance that has not opted in behaves exactly as before.
     */
    isBrandingEnabled: env?.ENABLE_BRANDING === true,
} as const;
