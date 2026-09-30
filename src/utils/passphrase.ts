const MINIMUM_CODE_POINTS = 12;
const PRINTABLE_ASCII = /^[\x20-\x7E]*$/;

function lengthProblem(value: string): string | undefined {
    return value.trim().length === 0 || [...value].length < MINIMUM_CODE_POINTS ? 'Use at least 12 characters' : undefined;
}

export function passphraseProblem(value: string): string | undefined {
    return lengthProblem(value) ?? (value.normalize('NFC') === value ? undefined : 'Use a passphrase in its composed form (NFC)');
}

/** A PKCS#12 file opens in every tool, Java keytool among them, only under a printable-ASCII passphrase, which is
 * always in NFC. */
export function keystorePassphraseProblem(value: string): string | undefined {
    return (
        lengthProblem(value) ??
        (PRINTABLE_ASCII.test(value)
            ? undefined
            : 'Use printable ASCII characters only, so every tool, including Java keytool, can open the file')
    );
}
