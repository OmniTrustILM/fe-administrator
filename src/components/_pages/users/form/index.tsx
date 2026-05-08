import CertificateUploadDialog from 'components/_pages/certificates/CertificateUploadDialog';

import CertificateAttributes from 'components/CertificateAttributes';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import ProgressButton from 'components/ProgressButton';
import Label from 'components/Label';

import Widget from 'components/Widget';
import { actions as groupActions, selectors as groupSelectors } from 'ducks/certificateGroups';
import { actions as certActions, selectors as certSelectors } from 'ducks/certificates';
import { selectors as pagingSelectors } from 'ducks/paging';
import { actions as rolesActions, selectors as rolesSelectors } from 'ducks/roles';

import { actions as userActions, selectors as userSelectors } from 'ducks/users';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';
import Select from 'components/Select';
import Button from 'components/Button';
import Container from 'components/Container';
import Switch from 'components/Switch';

import Badge from 'components/Badge';
import type { UserDetailModel } from 'types/auth';
import type { CertificateDetailResponseModel, CertificateListResponseModel } from 'types/certificate';

import { EntityType } from 'ducks/filters';
import { validateAlphaNumericWithSpecialChars, validateEmail, validateLength, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import { actions as customAttributesActions, selectors as customAttributesSelectors } from '../../../../ducks/customAttributes';
import { CertificateState as CertStatus, Resource } from '../../../../types/openapi';
import { collectFormAttributes } from '../../../../utils/attributes/attributes';
import AttributeEditor from '../../../Attributes/AttributeEditor';
import TabLayout from '../../../Layout/TabLayout';
import TextInput from 'components/TextInput';

type UserFormProps = Readonly<{
    userId?: string;
    onCancel?: () => void;
    onSuccess?: () => void;
}>;

interface FormValues {
    username: string;
    selectedGroups: { value: string; label: string }[];
    description: string;
    firstName: string;
    lastName: string;
    email: string;
    inputType: 'upload' | 'select';
    certFile: FileList | undefined;
    certificateUuid?: string;
    enabled: boolean;
}

function UserForm({ userId, onCancel, onSuccess }: UserFormProps) {
    const dispatch = useDispatch();

    const { id: routeId } = useParams();
    const id = userId || routeId;

    const editMode = useMemo(() => !!id, [id]);

    const userSelector = useSelector(userSelectors.user);
    const rolesSelector = useSelector(rolesSelectors.roles);
    const groups = useSelector(groupSelectors.certificateGroups);
    const certificates = useSelector(certSelectors.certificates);
    const certificateDetail = useSelector(certSelectors.certificateDetail);

    const resourceCustomAttributes = useSelector(customAttributesSelectors.resourceCustomAttributes);
    const isFetchingResourceCustomAttributes = useSelector(customAttributesSelectors.isFetchingResourceCustomAttributes);

    const isFetchingResourceSecondaryCustomAttributes = useSelector(customAttributesSelectors.isFetchingResourceSecondaryCustomAttributes);
    const isFetchingUserDetail = useSelector(userSelectors.isFetchingDetail);
    const isFetchingRoles = useSelector(rolesSelectors.isFetchingList);

    const isFetchingCertsList = useSelector(pagingSelectors.isFetchingList(EntityType.CERTIFICATE));
    const isFetchingCertDetail = useSelector(certSelectors.isFetchingDetail);

    const isCreatingUser = useSelector(userSelectors.isCreating);
    const isUpdatingUser = useSelector(userSelectors.isUpdating);

    const isUpdatingContent = useSelector(customAttributesSelectors.isUpdatingContent);
    const [loadedCerts, setLoadedCerts] = useState<CertificateListResponseModel[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [user, setUser] = useState<UserDetailModel>();

    const [userRoles, setUserRoles] = useState<string[]>([]);

    const isBusy = useMemo(
        () =>
            isFetchingUserDetail ||
            isFetchingCertsList ||
            isFetchingCertDetail ||
            isFetchingRoles ||
            isUpdatingUser ||
            isCreatingUser ||
            isFetchingResourceCustomAttributes ||
            isFetchingResourceSecondaryCustomAttributes ||
            isUpdatingContent,
        [
            isFetchingUserDetail,
            isFetchingCertsList,
            isFetchingCertDetail,
            isFetchingRoles,
            isUpdatingUser,
            isCreatingUser,
            isFetchingResourceCustomAttributes,
            isFetchingResourceSecondaryCustomAttributes,
            isUpdatingContent,
        ],
    );

    const optionsForInput = useMemo(
        () => [
            {
                label: 'Upload a new Certificate',
                value: 'upload',
            },
            {
                label: 'Choose Existing Certificate',
                value: 'select',
            },
        ],
        [],
    );

    const optionsForGroup = useMemo(
        () =>
            groups.map((g) => ({
                label: g.name,
                value: g.uuid,
            })),
        [groups],
    );

    const [selectedCertificate, setSelectedCertificate] = useState<{ label: string; value: string }>();

    const [certUploadDialog, setCertUploadDialog] = useState(false);
    const [certToUpload, setCertToUpload] = useState<CertificateDetailResponseModel>();
    const [certFileContent, setCertFileContent] = useState<string>();

    /* Load first page of certificates & all roles available */

    useEffect(() => {
        dispatch(certActions.resetState());
        dispatch(rolesActions.resetState());
        dispatch(customAttributesActions.listResourceCustomAttributes(Resource.Users));

        dispatch(
            certActions.listCertificates({
                itemsPerPage: 100,
                pageNumber: 1,
                filters: [],
            }),
        );

        dispatch(rolesActions.list());
        dispatch(groupActions.listGroups());
    }, [dispatch]);

    const previousIdRef = useRef<string | undefined>(undefined);

    /* Load user */

    useEffect(() => {
        if (editMode && id) {
            // Fetch if id changed or if we don't have the correct user loaded
            if (previousIdRef.current !== id || userSelector?.uuid !== id) {
                dispatch(userActions.getDetail({ uuid: id }));
                previousIdRef.current = id;
            }
        } else {
            previousIdRef.current = undefined;
        }
    }, [dispatch, editMode, id, userSelector]);

    /* Copy loaded user to the state && possibly load the certificate */

    useEffect(() => {
        if (editMode && id && userSelector?.uuid === id) {
            setUser(userSelector);
            setUserRoles(userSelector.roles.map((role) => role.uuid));

            if (userSelector.certificate) dispatch(certActions.getCertificateDetail({ uuid: userSelector.certificate.uuid }));
        } else if (!editMode) {
            if (!user)
                setUser({
                    uuid: '',
                    description: '',
                    username: '',
                    firstName: '',
                    lastName: '',
                    email: '',
                    enabled: false,
                    roles: [],
                    systemUser: false,
                    groups: [],
                });

            setUserRoles([]);
        }
    }, [dispatch, editMode, id, user, userSelector]);

    /* Process cert detail loaded for user */

    useEffect(() => {
        if (user?.certificate?.uuid && certificateDetail?.uuid === user.certificate.uuid) {
            const certs = [...loadedCerts];

            setSelectedCertificate({
                label:
                    certificateDetail.commonName && certificateDetail.fingerprint
                        ? `${certificateDetail.commonName} (${certificateDetail.fingerprint})`
                        : `( empty ) ( ${certificateDetail.commonName} )`,
                value: certificateDetail.uuid,
            });

            const idx = certs.findIndex((c) => c.uuid === certificateDetail.uuid);
            if (idx > 0) certs.splice(idx, 1);
            else return;

            setLoadedCerts([certificateDetail, ...certs]);
        }
    }, [certificateDetail, loadedCerts, user]);

    /* Process fetched certs and store them to loaded certs */

    useEffect(() => {
        const fpc = certificates
            .filter((pagedCert) => !['expired', 'revoked', 'invalid'].includes(pagedCert.state))
            .filter((pagedCert) => loadedCerts.find((loadedCert) => loadedCert.uuid === pagedCert.uuid) === undefined);

        if (fpc.length === 0) return;

        const certs = [...loadedCerts, ...fpc];

        setLoadedCerts(certs);
        setCurrentPage(currentPage + 1);
    }, [certificates, currentPage, loadedCerts]);

    /* Compute cert options from loaded certs */

    const optionsForCertificate = useMemo(
        () =>
            loadedCerts
                .filter((e) => e.state !== CertStatus.Requested)
                .map((loadedCert) => ({
                    label:
                        loadedCert.commonName && loadedCert.serialNumber
                            ? `${loadedCert.commonName} (${loadedCert.serialNumber})`
                            : `( ${loadedCert.commonName} ) ( empty )`,
                    value: loadedCert.uuid,
                })),
        [loadedCerts],
    );

    const onSubmit = useCallback(
        (values: FormValues) => {
            if (editMode) {
                dispatch(
                    userActions.update({
                        uuid: user!.uuid,
                        roles: userRoles,
                        updateUserRequest: {
                            description: values.description,
                            firstName: values.firstName || undefined,
                            lastName: values.lastName || undefined,
                            email: values.email,
                            groupUuids: values.selectedGroups.map((g) => g.value),
                            certificateUuid: values.inputType === 'select' ? values.certificateUuid : undefined,
                            certificateData: values.inputType === 'upload' ? certFileContent : undefined,
                            customAttributes: collectFormAttributes('customUser', resourceCustomAttributes, values),
                        },
                    }),
                );
            } else {
                dispatch(
                    userActions.create({
                        roles: userRoles,
                        userAddRequest: {
                            username: values.username,
                            description: values.description,
                            firstName: values.firstName || undefined,
                            lastName: values.lastName || undefined,
                            email: values.email || undefined,
                            groupUuids: values.selectedGroups.map((g) => g.value),
                            enabled: values.enabled,
                            certificateData: values.inputType === 'upload' ? certFileContent : undefined,
                            certificateUuid: values.inputType === 'select' ? values.certificateUuid : undefined,
                            customAttributes: collectFormAttributes('customUser', resourceCustomAttributes, values),
                        },
                    }),
                );
            }
        },
        [user, certFileContent, dispatch, editMode, userRoles, resourceCustomAttributes],
    );

    const submitTitle = useMemo(() => (editMode ? 'Save' : 'Create'), [editMode]);

    const inProgressTitle = useMemo(() => (editMode ? 'Saving...' : 'Creating...'), [editMode]);

    const defaultValues: FormValues = useMemo(
        () => ({
            username: editMode ? user?.username || '' : '',
            description: editMode ? user?.description || '' : '',
            selectedGroups: editMode ? (user?.groups?.map((group) => ({ label: group.name, value: group.uuid })) ?? []) : [],
            firstName: editMode ? user?.firstName || '' : '',
            lastName: editMode ? user?.lastName || '' : '',
            email: editMode ? user?.email || '' : '',
            enabled: editMode ? (user?.enabled ?? true) : true,
            inputType: 'select',
            certFile: undefined,
            certificateUuid: editMode && user?.certificate ? user.certificate.uuid : undefined,
        }),
        [user, editMode],
    );

    const methods = useForm<FormValues>({
        defaultValues,
        mode: 'onChange',
    });

    const {
        handleSubmit,
        control,
        formState: { isDirty, isSubmitting, isValid },
        reset,
    } = methods;

    const watchedInputType = useWatch({
        control,
        name: 'inputType',
    });

    // Reset form values when user is loaded in edit mode
    useEffect(() => {
        if (editMode && id && user?.uuid === id && !isFetchingUserDetail) {
            const newDefaultValues: FormValues = {
                username: user.username || '',
                description: user.description || '',
                selectedGroups: user.groups?.length ? user.groups.map((group) => ({ label: group.name, value: group.uuid })) : [],
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
                enabled: user.enabled ?? true,
                inputType: 'select',
                certFile: undefined,
                certificateUuid: user.certificate ? user.certificate.uuid : undefined,
            };
            reset(newDefaultValues, { keepDefaultValues: false });
        } else if (!editMode) {
            // Reset form when switching to create mode
            reset({
                username: '',
                description: '',
                selectedGroups: [],
                firstName: '',
                lastName: '',
                email: '',
                enabled: true,
                inputType: 'select',
                certFile: undefined,
                certificateUuid: undefined,
            });
        }
    }, [editMode, user, id, reset, isFetchingUserDetail]);

    const rolesTableHeader: TableHeader[] = useMemo(
        () => [
            {
                id: 'roleName',
                content: 'Name',
                sortable: true,
                sort: 'asc',
                width: 'auto',
            },
            {
                id: 'roleDescription',
                content: 'Role description',
                sortable: true,
                sort: 'asc',
                width: 'auto',
            },
            {
                id: 'systemRole',
                content: 'System role',
                sortable: true,
                sort: 'asc',
                width: 'auto',
            },
        ],
        [],
    );

    const rolesTableData: TableDataRow[] = useMemo(
        () =>
            rolesSelector.map((role) => ({
                id: role.uuid,

                columns: [
                    role.name,

                    role.description || '',

                    <Badge color={role.systemRole ? 'danger' : 'success'}>{role.systemRole ? 'Yes' : 'No'}</Badge>,
                ],
            })),

        [rolesSelector],
    );

    const hasRolesChanged: boolean = useMemo(() => {
        if (!user) return false;

        const usrRoleUuids = user.roles.map((role) => role.uuid);

        if (userRoles.length === usrRoleUuids.length && userRoles.length === 0) return true;

        return userRoles.length !== usrRoleUuids.length || userRoles.some((roleUuid) => !usrRoleUuids.includes(roleUuid));
    }, [user, userRoles]);

    const enableCheckButton = useMemo(
        () =>
            editMode ? null : (
                <div className="ml-auto">
                    <Controller
                        name="enabled"
                        control={control}
                        render={({ field }) => <Switch id="enabled" checked={field.value} onChange={field.onChange} label="Enabled" />}
                    />
                </div>
            ),
        [editMode, control],
    );

    const renderCustomAttributesEditor = useCallback(() => {
        if (isBusy) return <></>;
        return (
            <TabLayout
                noBorder
                tabs={[
                    {
                        title: 'Custom attributes',
                        content: (
                            <AttributeEditor
                                id="customUser"
                                attributeDescriptors={resourceCustomAttributes}
                                attributes={user?.customAttributes}
                            />
                        ),
                    },
                ]}
            />
        );
    }, [resourceCustomAttributes, user, isBusy]);

    return (
        <>
            <FormProvider {...methods}>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Widget noBorder busy={isBusy} widgetExtraTopNode={enableCheckButton}>
                        <div className="space-y-4">
                            <Controller
                                name="username"
                                control={control}
                                rules={buildValidationRules([validateRequired()])}
                                render={({ field, fieldState }) => (
                                    <TextInput
                                        {...field}
                                        id="username"
                                        type="text"
                                        label="Username"
                                        required
                                        placeholder="Username"
                                        disabled={editMode || user?.systemUser}
                                        invalid={fieldState.error && fieldState.isTouched}
                                        error={getFieldErrorMessage(fieldState)}
                                    />
                                )}
                            />

                            <div>
                                <Controller
                                    name="selectedGroups"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <>
                                            <Select
                                                id="selectedGroupsSelect"
                                                label="Groups"
                                                isMulti
                                                value={field.value || []}
                                                onChange={(value) => {
                                                    field.onChange(value);
                                                }}
                                                options={optionsForGroup}
                                                placeholder="Select Groups"
                                                isClearable
                                            />
                                            {fieldState.error && fieldState.isTouched && (
                                                <p className="mt-1 text-sm text-red-600">
                                                    {typeof fieldState.error === 'string'
                                                        ? fieldState.error
                                                        : fieldState.error?.message || 'Invalid value'}
                                                </p>
                                            )}
                                        </>
                                    )}
                                />
                            </div>

                            <Controller
                                name="description"
                                control={control}
                                rules={buildValidationRules([validateLength(0, 300)])}
                                render={({ field, fieldState }) => (
                                    <TextInput
                                        {...field}
                                        id="description"
                                        type="text"
                                        label="Description"
                                        placeholder="Description"
                                        disabled={user?.systemUser}
                                        invalid={fieldState.error && fieldState.isTouched}
                                        error={getFieldErrorMessage(fieldState)}
                                    />
                                )}
                            />

                            <Controller
                                name="firstName"
                                control={control}
                                rules={buildValidationRules([validateAlphaNumericWithSpecialChars()])}
                                render={({ field, fieldState }) => (
                                    <TextInput
                                        {...field}
                                        id="firstName"
                                        type="text"
                                        label="First Name"
                                        placeholder="First Name"
                                        disabled={user?.systemUser}
                                        invalid={fieldState.error && fieldState.isTouched}
                                        error={getFieldErrorMessage(fieldState)}
                                    />
                                )}
                            />

                            <Controller
                                name="lastName"
                                control={control}
                                rules={buildValidationRules([validateAlphaNumericWithSpecialChars()])}
                                render={({ field, fieldState }) => (
                                    <TextInput
                                        {...field}
                                        id="lastName"
                                        type="text"
                                        label="Last Name"
                                        placeholder="Last name"
                                        disabled={user?.systemUser}
                                        invalid={fieldState.error && fieldState.isTouched}
                                        error={getFieldErrorMessage(fieldState)}
                                    />
                                )}
                            />

                            <Controller
                                name="email"
                                control={control}
                                rules={buildValidationRules([validateEmail()])}
                                render={({ field, fieldState }) => (
                                    <TextInput
                                        {...field}
                                        id="email"
                                        type="email"
                                        label="Email"
                                        placeholder="Email address"
                                        disabled={user?.systemUser}
                                        invalid={fieldState.error && fieldState.isTouched}
                                        error={getFieldErrorMessage(fieldState)}
                                    />
                                )}
                            />

                            <div>
                                <Controller
                                    name="inputType"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <>
                                            <Select
                                                id="inputTypeSelect"
                                                label="Input Type"
                                                value={field.value || 'select'}
                                                onChange={(value) => {
                                                    field.onChange(value);
                                                }}
                                                options={optionsForInput}
                                                placeholder="Select Input Type"
                                                isDisabled={user?.systemUser}
                                            />
                                            {fieldState.error && fieldState.isTouched && (
                                                <p className="mt-1 text-sm text-red-600">
                                                    {typeof fieldState.error === 'string'
                                                        ? fieldState.error
                                                        : fieldState.error?.message || 'Invalid value'}
                                                </p>
                                            )}
                                        </>
                                    )}
                                />
                            </div>

                            {watchedInputType === 'upload' ? (
                                <div>
                                    <Label htmlFor="certFile">Client Certificate</Label>
                                    <div className="flex items-center gap-2 mb-2">
                                        {certToUpload ? (
                                            <CertificateAttributes certificate={certToUpload} />
                                        ) : (
                                            <span className="text-sm text-gray-600 dark:text-neutral-400">
                                                {certFileContent
                                                    ? 'Certificate to be uploaded selected.'
                                                    : 'Certificate to be uploaded not selected'}
                                            </span>
                                        )}

                                        <Button variant="outline" color="secondary" onClick={() => setCertUploadDialog(true)} type="button">
                                            Choose File
                                        </Button>
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-neutral-400">
                                        Upload certificate of client based on which will be authenticated to RA profile.
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <Controller
                                        name="certificateUuid"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <>
                                                <Select
                                                    id="certificateUuidSelect"
                                                    label="Certificate"
                                                    value={selectedCertificate?.value || field.value || ''}
                                                    onChange={(value) => {
                                                        if (!value) {
                                                            setSelectedCertificate(undefined);
                                                            field.onChange(undefined);
                                                            return;
                                                        }
                                                        const matchedOption = optionsForCertificate.find((opt) => opt.value === value);
                                                        if (matchedOption) {
                                                            setSelectedCertificate({
                                                                label: matchedOption.label,
                                                                value: matchedOption.value,
                                                            });
                                                            field.onChange(value);
                                                        }
                                                    }}
                                                    options={optionsForCertificate}
                                                    placeholder="Select Certificate"
                                                    isDisabled={user?.systemUser}
                                                    isClearable
                                                />
                                                {fieldState.error && fieldState.isTouched && (
                                                    <p className="mt-1 text-sm text-red-600">
                                                        {typeof fieldState.error === 'string'
                                                            ? fieldState.error
                                                            : fieldState.error?.message || 'Invalid value'}
                                                    </p>
                                                )}
                                            </>
                                        )}
                                    />
                                    {/* Note: onMenuScrollToBottom functionality would need to be handled differently with Preline Select */}
                                </div>
                            )}

                            {renderCustomAttributesEditor()}

                            <div className="mt-4">
                                <Label>Assigned User Roles</Label>
                                <CustomTable
                                    headers={rolesTableHeader}
                                    data={rolesTableData}
                                    checkedRows={userRoles}
                                    hasCheckboxes={true}
                                    hasAllCheckBox={false}
                                    onCheckedRowsChanged={(roles) => {
                                        setUserRoles(roles as string[]);
                                    }}
                                />
                            </div>

                            <Container className="flex-row justify-end modal-footer" gap={4}>
                                <Button
                                    variant="outline"
                                    onClick={onCancel}
                                    disabled={isSubmitting || isCreatingUser || isUpdatingUser}
                                    type="button"
                                >
                                    Cancel
                                </Button>
                                <ProgressButton
                                    title={submitTitle}
                                    inProgressTitle={inProgressTitle}
                                    inProgress={isSubmitting || isCreatingUser || isUpdatingUser}
                                    disabled={
                                        (!isDirty && !hasRolesChanged) ||
                                        isSubmitting ||
                                        isCreatingUser ||
                                        isUpdatingUser ||
                                        !isValid ||
                                        userSelector?.systemUser
                                    }
                                    type="submit"
                                />
                            </Container>
                        </div>
                    </Widget>
                </form>
            </FormProvider>

            <Dialog
                isOpen={certUploadDialog}
                caption={`Choose Certificate`}
                body={
                    <CertificateUploadDialog
                        okButtonTitle="Choose"
                        onCancel={() => setCertUploadDialog(false)}
                        onUpload={(data) => {
                            setCertToUpload(data.certificate);
                            setCertFileContent(data.fileContent);
                            setCertUploadDialog(false);
                        }}
                    />
                }
                toggle={() => setCertUploadDialog(false)}
                buttons={[]}
            />
        </>
    );
}

export default UserForm;
