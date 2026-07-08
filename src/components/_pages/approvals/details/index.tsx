import DetailPageSkeleton from 'components/DetailPageSkeleton';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import StatusBadge from 'components/StatusBadge';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { actions as approvalActions, selectors as approvalSelectors } from 'ducks/approvals';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { EnumColumnDescription, EnumValueDescription } from 'components/EnumDescription';
import Breadcrumb from 'components/Breadcrumb';
import Container from 'components/Container';
import TabLayout from 'components/Layout/TabLayout';
import ObjectEventHistoryWidget from 'components/_pages/notifications/events-settings/ObjectEventHistoryWidget';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router';
import Button from 'components/Button';
import TextArea from 'components/TextArea';
import { ApproverType, type ProfileApprovalStepModel } from 'types/approval-profiles';
import type { DetailApprovalStepModel } from 'types/approvals';
import { ApprovalDetailDtoStatusEnum, PlatformEnum, Resource } from 'types/openapi';
import { dateFormatter } from 'utils/dateUtil';
import { createWidgetDetailHeaders } from 'utils/widget';
import { ArrowRightCircle } from 'lucide-react';

export default function ApprovalDetails() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { id } = useParams();

    const approvalDetails = useSelector(approvalSelectors.approvalDetails);
    const isFetchingDetail = useSelector(approvalSelectors.isFetchingDetail);
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const [recipientApproveDialog, setRecipientApproveDialog] = useState(false);
    const [recipientRejectDialog, setRecipientRejectDialog] = useState(false);
    const [comment, setcomment] = useState<string>();
    const isBusy = useMemo(() => isFetchingDetail, [isFetchingDetail]);

    const getFreshData = useCallback(() => {
        if (!id) return;
        dispatch(approvalActions.getApproval({ uuid: id }));
    }, [dispatch, id]);

    useEffect(() => {
        if (id) {
            getFreshData();
        }
    }, [id, dispatch, getFreshData]);

    const onApproveRecipient = useCallback(() => {
        if (!approvalDetails?.approvalUuid) return;
        dispatch(
            approvalActions.approveApprovalRecipient({
                uuid: approvalDetails?.approvalUuid,
                userApproval: {
                    comment,
                },
            }),
        );
        setRecipientApproveDialog(false);
    }, [dispatch, approvalDetails, setRecipientApproveDialog, comment]);

    const onRejectRecipient = useCallback(() => {
        if (!approvalDetails?.approvalUuid) return;
        dispatch(
            approvalActions.rejectApprovalRecipient({
                uuid: approvalDetails.approvalUuid,
                userApproval: {
                    comment,
                },
            }),
        );
        setRecipientRejectDialog(false);
    }, [dispatch, approvalDetails, comment]);

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'check',
                disabled: approvalDetails?.status !== ApprovalDetailDtoStatusEnum.Pending,
                tooltip: 'Approve',
                onClick: () => {
                    setRecipientApproveDialog(true);
                },
            },
            {
                icon: 'times',
                disabled: approvalDetails?.status !== ApprovalDetailDtoStatusEnum.Pending,
                tooltip: 'Reject',
                onClick: () => {
                    setRecipientRejectDialog(true);
                },
            },
        ],
        [approvalDetails],
    );
    const getApprovalType = (approvalStep: DetailApprovalStepModel) => {
        if (approvalStep.userUuid) {
            return ApproverType.User;
        }
        if (approvalStep.roleUuid) {
            return ApproverType.Role;
        }
        if (approvalStep.groupUuid) {
            return ApproverType.Group;
        }
    };

    const detailHeaders: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const detailData: TableDataRow[] = useMemo(
        () =>
            approvalDetails
                ? [
                      {
                          id: 'uuid',
                          columns: ['UUID', approvalDetails.approvalUuid],
                      },
                      {
                          id: 'name',
                          columns: [
                              'Name',
                              approvalDetails.approvalProfileUuid ? (
                                  <Link to={`../../../approvalprofiles/detail/${approvalDetails.approvalProfileUuid}`}>
                                      {approvalDetails.approvalProfileName}
                                  </Link>
                              ) : (
                                  ''
                              ),
                          ],
                      },
                      {
                          id: 'description',
                          columns: ['Description', approvalDetails.description || ''],
                      },
                      {
                          id: 'requestedBy',
                          columns: ['Requested By', approvalDetails.creatorUsername || ''],
                      },
                      {
                          id: 'status',
                          columns: [
                              'Status',
                              <span key="status" className="inline-flex items-center gap-1">
                                  <StatusBadge textStatus={approvalDetails.status} />
                                  <EnumValueDescription platformEnum={PlatformEnum.ApprovalStatusEnum} value={approvalDetails.status} />
                                  <Button
                                      variant="transparent"
                                      title="Go to details"
                                      className="!p-1 ml-1"
                                      onClick={() => {
                                          navigate(`../../${approvalDetails.resource}/detail/${approvalDetails.objectUuid}`);
                                      }}
                                  >
                                      <ArrowRightCircle size={16} />
                                  </Button>
                              </span>,
                          ],
                      },

                      {
                          id: 'createdAt',
                          columns: ['Created At', dateFormatter(approvalDetails.createdAt)],
                      },
                      {
                          id: 'closedAt',
                          columns: ['Closed At', approvalDetails.closedAt ? dateFormatter(approvalDetails.closedAt) : ''],
                      },

                      {
                          id: 'action',
                          columns: ['Action', approvalDetails.resourceAction],
                      },
                      {
                          id: 'resource',
                          columns: [
                              'Resource',
                              <span key="resource" className="inline-flex items-center gap-1">
                                  {approvalDetails.resource || ''}
                                  <EnumValueDescription platformEnum={PlatformEnum.Resource} value={approvalDetails.resource} />
                              </span>,
                          ],
                      },

                      {
                          id: 'expiry',
                          columns: ['Expiry (in hours)', approvalDetails?.expiry ? approvalDetails.expiry.toString() : ''],
                      },

                      {
                          id: 'version',
                          columns: ['Version', approvalDetails?.version.toString() || ''],
                      },
                  ]
                : [],
        [approvalDetails, navigate],
    );

    const stepsHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'order',
                content: 'Order',
            },
            {
                id: 'requiredApprovals',
                content: 'Required Approvals',
            },
            {
                id: 'approverType',
                content: 'Approver Type',
            },
            {
                id: 'selectedApprover',
                content: 'Selected Approver',
            },
            {
                id: 'description',
                content: 'Description',
            },
        ],
        [],
    );

    const renderApproverRedirect = useCallback((appovalProfileStep: ProfileApprovalStepModel) => {
        if (appovalProfileStep.userUuid) {
            return <Link to={`../users/detail/${appovalProfileStep.userUuid}`}>{appovalProfileStep.username}</Link>;
        }
        if (appovalProfileStep.roleUuid) {
            return <Link to={`../roles/detail/${appovalProfileStep.roleUuid}`}>{appovalProfileStep.roleUuid}</Link>;
        }
        if (appovalProfileStep.groupUuid) {
            return <Link to={`../groups/detail/${appovalProfileStep.groupUuid}`}>{appovalProfileStep.groupUuid}</Link>;
        }
    }, []);

    const renderRecipiensDetails = useCallback((approvalStep: DetailApprovalStepModel) => {
        const data = approvalStep.approvalStepRecipients.map((recipient, i) => ({
            id: recipient.approvalRecipientUuid,
            columns: [
                <Link key="username" to={`../users/detail/${approvalStep.userUuid}`}>
                    {recipient.username}
                </Link>,
                recipient.closedAt ? dateFormatter(recipient.closedAt) : '',
                <StatusBadge key="status" textStatus={recipient.status} />,
                recipient.comment || '',
            ],
        }));

        const headers = [
            {
                id: 'recipient',
                content: 'Recipient',
            },
            {
                id: 'closedAt',
                content: 'Closed At',
            },
            {
                id: 'status',
                content: (
                    <span className="inline-flex items-center gap-1">
                        Status
                        <EnumColumnDescription platformEnum={PlatformEnum.ApprovalStatusEnum} title="Status" />
                    </span>
                ),
            },
            {
                id: 'comment',
                content: 'Comment',
            },
        ];

        return <CustomTable data={data} headers={headers} />;
    }, []);

    const stepsRows: TableDataRow[] = useMemo(
        () =>
            approvalDetails
                ? (approvalDetails.approvalSteps || []).map((approvalStep) => ({
                      id: approvalStep.order,
                      columns: [
                          approvalStep.order.toString(),

                          approvalStep?.requiredApprovals ? approvalStep.requiredApprovals.toString() : '',

                          getApprovalType(approvalStep) || '',

                          renderApproverRedirect(approvalStep) || '',

                          approvalStep.description || '',
                      ],
                      detailColumns: [
                          <></>,
                          <></>,
                          <></>,
                          <></>,
                          <></>,
                          approvalStep.approvalStepRecipients.length ? renderRecipiensDetails(approvalStep) : '',
                      ],
                  }))
                : [],
        [approvalDetails, renderApproverRedirect, renderRecipiensDetails],
    );

    if (isFetchingDetail) {
        return <DetailPageSkeleton layout="simple" buttonsCount={2} />;
    }

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: `${getEnumLabel(resourceEnum, Resource.Approvals)} Inventory`, href: '/approvals' },
                    { label: approvalDetails?.approvalUuid || 'Approval Details', href: '' },
                ]}
            />
            <Container>
                <TabLayout
                    tabUrlParam="tab"
                    tabs={[
                        {
                            title: 'Details',
                            content: (
                                <>
                                    <Widget
                                        title="Approval Details"
                                        busy={isBusy}
                                        titleSize="large"
                                        widgetButtons={buttons}
                                        refreshAction={getFreshData}
                                    >
                                        <CustomTable headers={detailHeaders} data={detailData} />
                                    </Widget>
                                    <Widget title="Approval Steps" busy={isBusy}>
                                        <CustomTable headers={stepsHeaders} data={stepsRows} hasDetails={true} />
                                    </Widget>
                                </>
                            ),
                        },
                        {
                            title: 'Event History',
                            content: approvalDetails ? (
                                <ObjectEventHistoryWidget resource={Resource.Approvals} uuid={approvalDetails.approvalUuid} />
                            ) : null,
                        },
                    ]}
                />

                <Dialog
                    isOpen={recipientApproveDialog}
                    body={
                        <div>
                            <span>Comment (optional) :</span>
                            <TextArea value={comment} onChange={(value) => setcomment(value)} />
                        </div>
                    }
                    caption="Accept approval?"
                    toggle={() => setRecipientApproveDialog(false)}
                    buttons={[
                        { color: 'primary', variant: 'outline', onClick: () => setRecipientApproveDialog(false), body: 'Cancel' },
                        { color: 'primary', onClick: onApproveRecipient, body: 'Yes, approve' },
                    ]}
                />

                <Dialog
                    isOpen={recipientRejectDialog}
                    caption="Reject approval?"
                    toggle={() => setRecipientRejectDialog(false)}
                    body={
                        <div>
                            <span>Comment (optional) :</span>
                            <TextArea value={comment} onChange={(value) => setcomment(value)} />
                        </div>
                    }
                    buttons={[
                        { color: 'primary', variant: 'outline', onClick: () => setRecipientRejectDialog(false), body: 'Cancel' },
                        { color: 'primary', onClick: onRejectRecipient, body: 'Yes, reject' },
                    ]}
                />
            </Container>
        </div>
    );
}
