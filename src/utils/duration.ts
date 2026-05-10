export type Duration = {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
};

export function getInputStringFromIso8601String(string: string): string {
    return getInputStringFromDuration(getDurationFromIso8601String(string));
}
export function getIso8601StringFromInputString(string: string): string {
    return getIso8601StringFromDuration(getDurationFromInputString(string));
}

const ISO_8601_DATE_PART = /^P(\d+D)?(T.*)?$/;
const ISO_8601_TIME_PART = /^T(\d+H)?(\d+M)?(\d+(?:\.\d+)?S)?$/;

function isValidIso8601Duration(s: string): boolean {
    const datePart = ISO_8601_DATE_PART.exec(s);
    if (!datePart) return false;
    const timePart = datePart[2];
    return !timePart || ISO_8601_TIME_PART.test(timePart);
}

export function getMillisecondsFromIso8601String(string: string | undefined | null): number | undefined {
    if (!string) return undefined;
    const trimmed = string.trim();
    if (!trimmed || trimmed === 'P' || trimmed.endsWith('T') || !isValidIso8601Duration(trimmed)) return undefined;
    const d = getDurationFromIso8601String(trimmed);
    return ((d.days * 24 + d.hours) * 60 + d.minutes) * 60 * 1000 + d.seconds * 1000 + d.milliseconds;
}

function getInputStringFromDuration(duration: Duration): string {
    const parts: string[] = [];

    if (duration.days) parts.push(`${duration.days}d`);
    if (duration.hours) parts.push(`${duration.hours}h`);
    if (duration.minutes) parts.push(`${duration.minutes}m`);
    if (duration.seconds) parts.push(`${duration.seconds}s`);
    if (duration.milliseconds) parts.push(`${duration.milliseconds}ms`);

    return parts.join(' ');
}

function getIso8601StringFromDuration(duration: Duration): string {
    const { days, hours, minutes, seconds, milliseconds } = duration;

    let secondsPart = '';
    if (seconds || milliseconds) {
        const totalSeconds = seconds + milliseconds / 1000;
        secondsPart = `${totalSeconds}S`;
    }

    const timeParts = [hours ? `${hours}H` : '', minutes ? `${minutes}M` : '', secondsPart].filter(Boolean).join('');

    const dayPart = days ? `${days}D` : '';
    const timePart = timeParts ? `T${timeParts}` : '';
    const result = `P${dayPart}${timePart}`;

    return result === 'P' ? 'PT0S' : result;
}

function parseMatch(value: RegExpExecArray | null): number {
    return value ? Number.parseFloat(value[1]) : 0;
}

function getDurationFromIso8601String(input: string): Duration {
    const duration: Duration = {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        milliseconds: 0,
    };

    if (!input || typeof input !== 'string' || !input.startsWith('P')) {
        return duration;
    }

    const weeksMatch = /(\d{1,10}(?:\.\d{1,10})?)W/.exec(input);
    const daysMatch = /(\d{1,10}(?:\.\d{1,10})?)D/.exec(input);

    const hoursMatch = /(\d{1,10}(?:\.\d{1,10})?)H/.exec(input);
    const minutesMatch = /(\d{1,10}(?:\.\d{1,10})?)M/.exec(input);
    const secondsMatch = /(\d{1,10}(?:\.\d{1,10})?)S/.exec(input);

    const weeks = parseMatch(weeksMatch);
    const days = parseMatch(daysMatch);
    const hours = parseMatch(hoursMatch);
    const minutes = parseMatch(minutesMatch);
    const seconds = parseMatch(secondsMatch);

    const totalSeconds = (((weeks * 7 + days) * 24 + hours) * 60 + minutes) * 60 + seconds;
    const totalMs = Math.round(totalSeconds * 1000);

    duration.days = Math.floor(totalMs / 86400000);
    duration.hours = Math.floor((totalMs % 86400000) / 3600000);
    duration.minutes = Math.floor((totalMs % 3600000) / 60000);
    duration.seconds = Math.floor((totalMs % 60000) / 1000);
    duration.milliseconds = totalMs % 1000;

    return duration;
}

function getDurationFromInputString(input: string) {
    // Match "ms" before single-letter units to avoid ambiguity
    const regex = /(\d{1,10})\s*(ms|[dhms])/gi;

    const matches = [...input.matchAll(regex)];

    const duration: Duration = {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        milliseconds: 0,
    };

    for (const [, value, unit] of matches) {
        const num = Number.parseInt(value, 10);
        switch (unit.toLowerCase()) {
            case 'ms':
                duration.milliseconds += num;
                break;
            case 'm':
                duration.minutes += num;
                break;
            case 'h':
                duration.hours += num;
                break;
            case 'd':
                duration.days += num;
                break;
            case 's':
                duration.seconds += num;
                break;
        }
    }

    return duration;
}
