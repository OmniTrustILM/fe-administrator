const MINIMUM_CODE_POINTS = 12;

export function passphraseProblem(value: string): string | undefined {
    if (value.trim().length === 0 || [...value].length < MINIMUM_CODE_POINTS) return 'Use at least 12 characters';
    if (value.normalize('NFC') !== value) return 'Use a passphrase in its composed form (NFC)';
    return undefined;
}
