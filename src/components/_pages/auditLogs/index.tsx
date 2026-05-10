import { actions as auditLogActions, selectors } from 'ducks/auditLogs';
import { selectors as enumSelectors } from 'ducks/enums';
import { EntityType, selectors as filterSelectors } from 'ducks/filters';
import { actions as userInterfaceActions } from '../../../ducks/user-interface';

import { useCallback, useMemo } from 'react';
import type React from 'react';
import { useNavigate } from 'react-router';

import { useDispatch, useSelector } from 'react-redux';

import type { ApiClients } from '../../../api';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import CustomTable, { type TableDataRow } from 'components/CustomTable';
import { LockWidgetNameEnum } from 'types/user-interface';
import type { SearchRequestModel } from 'types/certificate';
import PagedList from 'components/PagedList/PagedList';
import { type AuditLogDto, PlatformEnum } from 'types/openapi';
import { auditLogsDetailRowHeaders, auditLogsRowHeaders, createAuditLogDetailData, createAuditLogsList } from './utils';

type AuditLogDetailItem = {
    property: string;
    propertyValue: string | React.ReactNode;
};

function AuditLogs() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const auditLogs = useSelector(selectors.auditLogs);
    const currentFilters = useSelector(filterSelectors.currentFilters(EntityType.AUDIT_LOG));

    const isFetchingPageData = useSelector(selectors.isFetchingPageData);
    const isPurging = useSelector(selectors.isPurging);
    const isExporting = useSelector(selectors.isExporting);

    // enum selectors
    const moduleEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Module));
    const actorEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ActorType));
    const authMethodEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.AuthMethod));
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const operationEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Operation));
    const operationResultEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.OperationResult));

    const isBusy = isFetchingPageData || isPurging || isExporting;

    const onListCallback = useCallback((filters: SearchRequestModel) => dispatch(auditLogActions.listAuditLogs(filters)), [dispatch]);

    const purgeCallback = useCallback(() => dispatch(auditLogActions.purgeLogs(currentFilters)), [dispatch, currentFilters]);

    const exportCallback = useCallback(() => dispatch(auditLogActions.exportLogs(currentFilters)), [dispatch, currentFilters]);

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'download',
                disabled: false,
                tooltip: 'Export Audit logs',
                onClick: () => {
                    exportCallback();
                },
            },
            {
                icon: 'trash',
                disabled: false,
                tooltip: 'Purge Audit logs',
                onClick: () => {
                    purgeCallback();
                },
            },
        ],
        [exportCallback, purgeCallback],
    );

    const onLinkClick = useCallback(() => {
        dispatch(userInterfaceActions.hideGlobalModal());
    }, [dispatch]);

    const createAuditLogDetailRows = (a: AuditLogDetailItem) => ({
        id: a.property,
        columns: [a.property, a.propertyValue],
    });

    const onInfoClick = useCallback(
        (log: AuditLogDto) => {
            dispatch(
                userInterfaceActions.showGlobalModal({
                    content: (
                        <CustomTable
                            headers={auditLogsDetailRowHeaders}
                            data={
                                createAuditLogDetailData(log, resourceEnum, onLinkClick).map(
                                    createAuditLogDetailRows,
                                ) as unknown as TableDataRow[]
                            }
                        />
                    ),
                    isOpen: true,
                    showCloseButton: true,
                    title: 'Audit log detail',
                    size: 'xl',
                }),
            );
        },
        [dispatch, resourceEnum, onLinkClick],
    );

    const auditLogsList: TableDataRow[] = useMemo(
        () =>
            createAuditLogsList(
                auditLogs,
                {
                    resource: resourceEnum,
                    module: moduleEnum,
                    actor: actorEnum,
                    authMethod: authMethodEnum,
                    operation: operationEnum,
                    operationResult: operationResultEnum,
                },
                navigate,
                onInfoClick,
            ),
        [auditLogs, resourceEnum, moduleEnum, actorEnum, authMethodEnum, operationEnum, operationResultEnum, navigate, onInfoClick],
    );

    return (
        <PagedList
            entity={EntityType.AUDIT_LOG}
            onListCallback={onListCallback}
            getAvailableFiltersApi={useCallback((apiClients: ApiClients) => apiClients.auditLogs.getAuditLogSearchableFields(), [])}
            addHidden
            hasCheckboxes={false}
            additionalButtons={buttons}
            headers={auditLogsRowHeaders}
            data={auditLogsList}
            hasDetails={false}
            isBusy={isBusy}
            title="Audit logs"
            entityNameSingular="an Audit log"
            entityNamePlural="Audit logs"
            filterTitle="Audit logs Filter"
            pageWidgetLockName={LockWidgetNameEnum.AuditLogs}
        />
    );
}

export default AuditLogs;
