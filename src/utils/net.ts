import { AjaxError } from 'rxjs/ajax';
import { ErrorCodeDetailMap, ErrorCodeTexteMap, LockTypeEnum, type WidgetLockErrorModel } from 'types/user-interface';

export function extractErrorReason(err: unknown): string | undefined {
    if (err instanceof AjaxError) return extractResponseMessage(err.response) ?? err.message;
    if (err instanceof Event) return 'Network connection failure';
    return err instanceof Error ? err.message : undefined;
}

function extractResponseMessage(response: unknown): string | undefined {
    if (typeof response === 'string') return response === '' ? undefined : response;
    if (Array.isArray(response)) {
        const messages = response.filter((item): item is string => typeof item === 'string' && item !== '');
        return messages.length > 0 ? messages.join('\n') : undefined;
    }
    if (typeof response === 'object' && response !== null && 'message' in response && typeof response.message === 'string') {
        return response.message;
    }
    return undefined;
}

export function extractError(err: Error, headline: string): string {
    if (!err) return headline;

    if (err instanceof AjaxError) return `${headline} (${err.status}): ${extractErrorReason(err)}`;
    if (err instanceof Event) return `${headline}: Network connection failure`;

    return `${headline}. ${err.message}`;
}

function getLockEnumFromStatus(status: number): LockTypeEnum {
    if (status === 403 || status === 401) return LockTypeEnum.PERMISSION;
    else if (status > 400 && status < 500) return LockTypeEnum.CLIENT;
    else if (status === 503) return LockTypeEnum.SERVICE_ERROR;
    else if (status > 500 && status < 600) return LockTypeEnum.SERVER_ERROR;
    return LockTypeEnum.GENERIC;
}

export function getLockWidgetObject(error: AjaxError): WidgetLockErrorModel {
    if (error?.response?.message && error.response.code) {
        const lockTitle = ErrorCodeTexteMap[error.response.code as keyof typeof ErrorCodeTexteMap] || 'Something went wrong';
        return {
            lockTitle,
            lockText: error.response.message,
            lockType: getLockEnumFromStatus(error.status),
            lockDetails: ErrorCodeDetailMap[error.response.code as keyof typeof ErrorCodeDetailMap],
        };
    }

    if (error.status === 404)
        return {
            lockTitle: 'Not Found',
            lockText: 'The requested resource does not exist',
            lockType: LockTypeEnum.GENERIC,
        };
    else if (error.status === 422)
        return {
            lockTitle: 'Validation Error',
            lockText: 'There was a problem in validating the request',
            lockType: getLockEnumFromStatus(error.status),
            lockDetails: !error.response || !Array.isArray(error.response) ? undefined : error.response.join(' '),
        };
    else if (error.status > 400 && error.status < 500)
        return {
            lockTitle: 'Client Error',
            lockText: 'There was some problem at the client side',
            lockType: getLockEnumFromStatus(error.status),
        };
    else if (error.status === 503)
        return {
            lockTitle: 'Service unavailable',
            lockText: 'There was some issue with the service',
            lockType: getLockEnumFromStatus(error.status),
        };
    else if (error.status > 500 && error.status < 600)
        return {
            lockTitle: 'Server Error',
            lockText: 'There was some issue with the server',
            lockType: getLockEnumFromStatus(error.status),
        };
    return {
        lockTitle: 'Something went wrong',
        lockText: 'There was some issue please try again later',
        lockType: LockTypeEnum.GENERIC,
    };
}
