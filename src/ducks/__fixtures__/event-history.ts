import type {
    EventHistoryRequestDto,
    PaginationResponseDtoEventHistoryDto,
    PaginationResponseDtoObjectEventHistoryDto,
} from 'types/openapi';
import { EventStatus, Resource, ResourceEvent } from 'types/openapi';

export const sampleEventHistory: PaginationResponseDtoEventHistoryDto = {
    items: [
        {
            startedAt: '2026-05-14T10:24:12Z',
            finishedAt: '2026-05-14T10:24:13Z',
            status: EventStatus.Finished,
            resource: Resource.Certificates,
            objectsEvaluated: 1,
            objectsMatched: 1,
            objectsIgnored: 0,
            objectHistories: { items: [], totalItems: 0, itemsPerPage: 10, pageNumber: 1, totalPages: 0 },
        },
    ],
    totalItems: 1,
    itemsPerPage: 10,
    pageNumber: 1,
    totalPages: 1,
};

export const sampleObjectEventHistory: PaginationResponseDtoObjectEventHistoryDto = {
    items: [
        {
            event: ResourceEvent.CertificateStatusChanged,
            trigger: { uuid: 't-1', name: 'cert_status_trigger' },
            conditionsMatched: true,
            actionsPerformed: true,
            triggeredAt: '2026-05-14T10:24:13Z',
            message: 'OK',
            records: [],
        },
    ],
    totalItems: 1,
    itemsPerPage: 10,
    pageNumber: 1,
    totalPages: 1,
};

export const sampleEventHistoryRequest: EventHistoryRequestDto = { pagination: { itemsPerPage: 10, pageNumber: 1 } };
