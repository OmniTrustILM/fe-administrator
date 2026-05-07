import type { TrustedCertificateRequestDto, TrustedCertificateResponseDto } from 'types/trusted-certificates';

export function transformTrustedCertificateResponseDtoToModel(
    trustedCertificate: TrustedCertificateResponseDto,
): TrustedCertificateResponseDto {
    return { ...trustedCertificate };
}

export function transformTrustedCertificateRequestModelToDto(
    trustedCertificate: TrustedCertificateRequestDto,
): TrustedCertificateRequestDto {
    return { ...trustedCertificate };
}
