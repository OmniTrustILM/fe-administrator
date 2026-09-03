import { getEnumAsSelectOptions, selectors as enumSelectors } from 'ducks/enums';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { CertificateKeyUsage, PlatformEnum } from 'types/openapi';

export type KeyUsageOption = { value: string; label: string; description?: string };

/**
 * The closed set of Key Usage bits offered as a permitted-set multi-select, labelled via the
 * platform enum. What a selection submits is the `CertificateKeyUsage` code (e.g. `digitalSignature`,
 * `cRLSign` — that capitalization), so the option value is always the code; only the label comes
 * from the enum, falling back to the code itself while the enum has not loaded.
 */
export function useKeyUsageOptions(): KeyUsageOption[] {
    const keyUsageEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.CertificateKeyUsage));
    return useMemo(() => {
        const fromEnum = getEnumAsSelectOptions(keyUsageEnum);
        if (fromEnum.length > 0) return fromEnum;
        return Object.values(CertificateKeyUsage).map((code) => ({ value: code, label: code }));
    }, [keyUsageEnum]);
}
