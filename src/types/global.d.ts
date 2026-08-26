type Env = {
    BASE_URL: string;
    API_URL: string;
    LOGIN_URL: string;
    LOGOUT_URL: string;
    ENABLE_PROXIES?: boolean;
    ENABLE_TRUSTED_CERTIFICATES?: boolean;
};

interface Window {
    readonly __ENV__: Env;
}

declare const __ENV__: Env;

declare const __BUILD_TIME__: string;
