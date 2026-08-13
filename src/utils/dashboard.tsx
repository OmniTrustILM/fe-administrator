import type { ColorOptions } from 'components/_pages/dashboard/DashboardItem/DonutChart';
import { useMemo } from 'react';
import type {
    CertificateEventHistoryDtoStatusEnum,
    CertificateState,
    CertificateValidationStatus,
    ComplianceRuleStatus,
    ComplianceStatus,
} from 'types/openapi';
import type { DashboardDict } from 'types/statisticsDashboard';
import { getCertificateStatusColor, useGetStatusText } from './certificate';
import { toChartHex } from './chart-contrast';
import { getSecretStatusColor, useGetSecretStatusText } from './secret';

type Status =
    | CertificateState
    | CertificateValidationStatus
    | CertificateEventHistoryDtoStatusEnum
    | ComplianceStatus
    | ComplianceRuleStatus;

export function useGetLabels(data: DashboardDict) {
    const getStatusText = useGetStatusText();
    const getSecretStatusText = useGetSecretStatusText();

    const labels = useMemo(() => {
        const result: string[] = [];

        for (const i of Object.entries(data)) {
            const certLabel = getStatusText(i[0] as Status);
            if (certLabel === 'Unknown') {
                const secretLabel = getSecretStatusText(i[0] as Parameters<typeof getSecretStatusText>[0]);
                if (secretLabel === 'Unknown') {
                    const splitValue = i[0].split('=');
                    result.push(splitValue.at(-1)!);
                } else {
                    result.push(secretLabel);
                }
            } else {
                result.push(certLabel);
            }
        }

        return result;
    }, [data, getStatusText, getSecretStatusText]);

    return labels;
}
export function getDefaultColors() {
    return ['#1473b5', '#3aa547', '#2c7c35', '#438fc3', '#66a012'];
}

export function getValues(data: DashboardDict) {
    const values: number[] = [];

    for (const i of Object.entries(data)) {
        values.push(i[1]);
    }

    return values;
}

function updateColorObject(status: Status, colorObject: ColorOptions): ColorOptions {
    const color = getCertificateStatusColor(status);

    if (color) {
        colorObject.colors.push(color);
    }
    return colorObject;
}

export function getCertificateDonutChartColors(certificateStatByStatus?: { [key: string]: number }) {
    const colorsObject: ColorOptions = {
        colors: [],
    };

    if (!certificateStatByStatus) {
        return colorsObject;
    }

    const arrayOfStatuses = Object.entries(certificateStatByStatus).map(([status, value]) => ({ status, value }));

    if (arrayOfStatuses.length === 0) {
        return colorsObject;
    }

    const updatedColorObject = arrayOfStatuses.reduce((acc, { status }) => updateColorObject(status as Status, acc), colorsObject);

    return updatedColorObject;
}

export function getSecretDonutChartColors(secretStatByStatus?: { [key: string]: number }): ColorOptions {
    const colorsObject: ColorOptions = { colors: [] };

    if (!secretStatByStatus) return colorsObject;

    return Object.keys(secretStatByStatus).reduce((acc, status) => {
        acc.colors.push(getSecretStatusColor(status as Parameters<typeof getSecretStatusColor>[0]));
        return acc;
    }, colorsObject);
}

const colorMapByDaysOfExpiration: { [key: string]: string } = {
    '10': '#6B7280',
    '20': '#4f688c',
    '30': '#b68b06',
    '60': '#12a393',
    '90': '#2798E7',
    More: '#12a393',
    Expired: '#EF4444',
};

export function getCertificateDonutChartColorsByDaysOfExpiration(certificateStatByExpirationDays?: {
    [key: string]: number;
}): ColorOptions | undefined {
    if (!certificateStatByExpirationDays) {
        return undefined;
    }

    const getColorByDaysOfExpiration = (certificateStatByExpirationDay: string) => {
        return colorMapByDaysOfExpiration[certificateStatByExpirationDay];
    };

    return { colors: Object.keys(certificateStatByExpirationDays).map((key) => getColorByDaysOfExpiration(key)) };
}

const baseColors = ['#5d80f9', '#009bdb', '#686663', '#EF4444', '#12a393', '#c2870f', '#6c757d', '#3f61be', '#3aa547', '#1473b5'];

export function getDonutChartColorsByRandomNumberOfOptions(numberOfOptions: number): ColorOptions {
    const colors = [...baseColors];
    const saturation = 70;
    const lightness = 50;

    const additionalColorsNeeded = numberOfOptions - baseColors.length;
    if (additionalColorsNeeded > 0) {
        const hueStep = 360 / additionalColorsNeeded;
        for (let i = 0; i < additionalColorsNeeded; i++) {
            const hue = (i * hueStep) % 360; // evenly spaced hues for additional colors
            colors.push(toChartHex(hue, saturation, lightness));
        }
    }

    return { colors: colors.slice(0, numberOfOptions) };
}

export const SIGNING_SCHEME_LABELS: Record<string, string> = {
    delegated: 'Delegated',
    managed_static_key: 'Managed – static key',
    managed_one_time_key: 'Managed – one-time key',
};

export function getSigningSchemeLabel(code: string): string {
    return SIGNING_SCHEME_LABELS[code] ?? code;
}

export function getSigningRecordDonutChartColors(stat?: { [key: string]: number }): ColorOptions {
    return getDonutChartColorsByRandomNumberOfOptions(Object.keys(stat ?? {}).length);
}
