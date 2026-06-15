import type {
    PaginationResponseDtoSigningRecordListDto,
    SearchFieldDataByGroupDto,
    SearchRequestDto,
    SigningRecordDto,
    SigningRecordListDto,
} from 'types/openapi';

export function transformSigningRecordListDtoToModel(record: SigningRecordListDto): SigningRecordListDto {
    return { ...record };
}

export function transformSigningRecordDtoToModel(record: SigningRecordDto): SigningRecordDto {
    return { ...record };
}

export function transformSearchRequestModelToDto(search: SearchRequestDto): SearchRequestDto {
    return { ...search };
}

export function transformSearchableFieldsDtoToModel(fields: Array<SearchFieldDataByGroupDto>): Array<SearchFieldDataByGroupDto> {
    return fields.map((f) => ({ ...f }));
}

export function transformPaginationResponseDtoToModel(
    resp: PaginationResponseDtoSigningRecordListDto,
): PaginationResponseDtoSigningRecordListDto {
    return { ...resp };
}
