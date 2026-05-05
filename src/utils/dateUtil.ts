import cronstrue from 'cronstrue';
import { AttributeContentType, FilterConditionOperator, FilterFieldType, type SearchFieldDataDto } from 'types/openapi';

function leading0(s: string, count: number) {
    while (s.length < count) {
        s = '0' + s;
    }

    return s;
}

export function durationFormatter(startDate: string | null | undefined, endDate: string | null | undefined): string {
    try {
        if (!startDate) return '';
        const endMs = endDate ? new Date(endDate).valueOf() : new Date().valueOf();
        return timeFormatter(endMs - new Date(startDate).valueOf());
    } catch (error) {
        console.debug('Unable to convert the given date strings to date object');
        return '';
    }
}

export function timeFormatter(date: any): string {
    try {
        const dateObj = new Date(date);

        const days = Math.floor(dateObj.getTime() / (1000 * 60 * 60 * 24));
        const hours = leading0(dateObj.getUTCHours().toString(), 2);
        const minutes = leading0(dateObj.getMinutes().toString(), 2);
        const seconds = leading0(dateObj.getSeconds().toString(), 2);

        return days > 0 ? `${leading0(days.toString(), 2)}.${hours}:${minutes}:${seconds}` : `${hours}:${minutes}:${seconds}`;
    } catch (error) {
        console.debug('Unable to convert the given time to date object');
        return date;
    }
}

export function dateFormatter(date: any): string {
    try {
        const dateObj = new Date(date);

        const year = dateObj.getFullYear().toString();
        const month = leading0((dateObj.getMonth() + 1).toString(), 2);
        const day = leading0(dateObj.getDate().toString(), 2);
        const hours = leading0(dateObj.getHours().toString(), 2);
        const minutes = leading0(dateObj.getMinutes().toString(), 2);
        const seconds = leading0(dateObj.getSeconds().toString(), 2);

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
        console.debug('Unable to convert the given date to date object');
        return date;
    }
}

export const getStrongFromCronExpression = (cronExpression: string | undefined) => {
    if (cronExpression) {
        try {
            return cronstrue.toString(cronExpression);
        } catch (err) {}
    }
    return undefined;
};

export const formatTimeAgo = (input: any) => {
    const date = input instanceof Date ? input : new Date(input);
    const formatter = new Intl.RelativeTimeFormat('en');
    const ranges = {
        years: 3600 * 24 * 365,
        months: 3600 * 24 * 30,
        weeks: 3600 * 24 * 7,
        days: 3600 * 24,
        hours: 3600,
        minutes: 60,
        seconds: 1,
    };
    const secondsElapsed = (date.getTime() - Date.now()) / 1000;
    for (const key in ranges) {
        const keyTyped = key as keyof typeof ranges;
        if (ranges[keyTyped] < Math.abs(secondsElapsed)) {
            const delta = secondsElapsed / ranges[keyTyped];
            return formatter.format(Math.round(delta), keyTyped);
        }
    }
};

export const getDateInString = (daysOffset: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);

    return date.toISOString();
};

export function getFormattedDateTime(dateString: string): string {
    if (Number.isNaN(Date.parse(dateString))) {
        return dateString;
    }

    const date = new Date(dateString);
    const formattedDateTime = `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(-2)}-${('0' + date.getDate()).slice(-2)} ${(
        '0' + date.getHours()
    ).slice(-2)}:${('0' + date.getMinutes()).slice(-2)}:${('0' + date.getSeconds()).slice(-2)}`;

    return formattedDateTime;
}

export function getFormattedDate(dateString: string): string {
    if (Number.isNaN(Date.parse(dateString))) {
        return dateString;
    }

    const date = new Date(dateString);
    const formattedDate = `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(-2)}-${('0' + date.getDate()).slice(-2)}`;

    return formattedDate;
}

export function getFormattedUtc(type: AttributeContentType | FilterFieldType, dateString: string): string {
    if (type === 'datetime') {
        const date = new Date(dateString);
        return date.toISOString();
    } else if (type === 'date') {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0]; // returns YYYY-MM-DD
    } else if (type === 'time') {
        const timeParts = dateString.split(':');
        if (timeParts.length === 2) {
            // If the time string is in HH:mm format, add ':00' to make it HH:mm:ss
            dateString += ':00';
        } else if (timeParts.length === 1) {
            // If the time string is in HH format, add ':00:00' to make it HH:mm:ss
            dateString += ':00:00';
        }
        return dateString;
    }

    return dateString;
}

export const getFormattedDateByType = (dateString: string, type: AttributeContentType): string => {
    if (type === 'time') {
        // If the type is 'time', format the time string directly
        const [hours, minutes, seconds] = dateString.split(':');
        const formattedTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
        return formattedTime; // Outputs: 22:22:02
    }

    const date = new Date(dateString);

    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are 0-based in JavaScript
    const year = date.getUTCFullYear();

    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    if (type === 'datetime') {
        const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
        return formattedDate; // Outputs: 2024-12-12T07:43:13
    } else if (type === 'date') {
        const formattedDate = `${year}-${month}-${day}`;
        return formattedDate; // Outputs: 2024-12-12
    }

    return dateString;
};

export const checkIfFieldAttributeTypeIsDate = (field: SearchFieldDataDto) => {
    if (
        field.attributeContentType === AttributeContentType.Date ||
        field.attributeContentType === AttributeContentType.Time ||
        field.attributeContentType === AttributeContentType.Datetime
    ) {
        return true;
    } else {
        return false;
    }
};

export const checkIfFieldTypeIsDate = (type?: FilterFieldType) => {
    if (type === FilterFieldType.Date || type === FilterFieldType.Datetime) {
        return true;
    }
};

export const checkIfFieldOperatorIsInterval = (operator?: FilterConditionOperator) => {
    if (operator === FilterConditionOperator.InNext || operator === FilterConditionOperator.InPast) {
        return true;
    }
};
