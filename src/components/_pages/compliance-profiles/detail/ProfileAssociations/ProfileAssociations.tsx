import CustomTable, { type TableHeader, type TableDataRow } from 'components/CustomTable';
import Widget from 'components/Widget';
import WidgetButtons, { type WidgetButtonProps } from 'components/WidgetButtons';
import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import { type ComplianceProfileDtoV2, PlatformEnum, type Resource } from 'types/openapi';
import type { Availability } from 'utils/availability';
import { LockWidgetNameEnum } from 'types/user-interface';

import { actions, selectors } from 'ducks/compliance-profiles';
import ProfileAssociationsDialog from 'components/_pages/compliance-profiles/detail/ProfileAssociations/ProfileAssociationsDialog';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { EnumColumnDescription } from 'components/EnumDescription';

type Props = Readonly<{
    profile: ComplianceProfileDtoV2 | undefined;
    requires?: Availability;
}>;

export default function ProfileAssociations({ profile, requires }: Props) {
    const dispatch = useDispatch();
    const isFetchingDetail = useSelector(selectors.isFetchingDetail);
    const associationsOfComplianceProfile = useSelector(selectors.associationsOfComplianceProfile);
    const [isAssociateProfileModalOpen, setIsAssociateProfileModalOpen] = useState(false);
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));

    const onDissociateRaProfile = useCallback(
        (resource: Resource, associatedProfileUuid: string) => {
            if (!profile) return;

            dispatch(
                actions.dissociateComplianceProfile({
                    uuid: profile.uuid,
                    resource: resource,
                    associationObjectUuid: associatedProfileUuid,
                }),
            );
        },
        [profile, dispatch],
    );

    const associationHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'raProfileName',
                content: 'Name',
            },
            {
                id: 'resource',
                content: (
                    <span className="inline-flex items-center gap-1">
                        Resource
                        <EnumColumnDescription platformEnum={PlatformEnum.Resource} title="Resource" />
                    </span>
                ),
            },
            { id: 'object', content: 'Object' },
            {
                id: 'action',
                content: 'Action',
            },
        ],
        [],
    );

    const associationData: TableDataRow[] = useMemo(
        () =>
            !associationsOfComplianceProfile || !profile
                ? []
                : associationsOfComplianceProfile.map((associatedProfile) => ({
                      id: associatedProfile.objectUuid,
                      columns: [
                          <Link
                              key={associatedProfile.objectUuid}
                              to={`../../${associatedProfile.resource.toLowerCase()}/detail/${profile.uuid}/${associatedProfile.objectUuid}`}
                          >
                              {associatedProfile.name}
                          </Link>,

                          getEnumLabel(resourceEnum, associatedProfile.resource),
                          associatedProfile.objectUuid,
                          <WidgetButtons
                              key={associatedProfile.objectUuid}
                              justify="start"
                              buttons={[
                                  {
                                      id: 'remove',
                                      icon: 'minus-square',
                                      disabled: false,
                                      requires,
                                      tooltip: 'Remove',
                                      onClick: () => {
                                          onDissociateRaProfile(associatedProfile.resource, associatedProfile.objectUuid);
                                      },
                                  },
                              ]}
                          />,
                      ],
                  })),
        [associationsOfComplianceProfile, profile, resourceEnum, onDissociateRaProfile, requires],
    );

    const associationButtons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'plus',
                disabled: false,
                requires,
                tooltip: 'Associate Profile',
                onClick: () => {
                    setIsAssociateProfileModalOpen(true);
                },
                dataTestId: 'add-association-button',
            },
        ],
        [requires],
    );

    return (
        <>
            <Widget
                id="compliance-profile-associations"
                title="Associations"
                busy={isFetchingDetail}
                widgetButtons={associationButtons}
                titleSize="large"
                widgetLockName={LockWidgetNameEnum.ComplianceProfileAssociations}
                lockSize="large"
                dataTestId="profile-associations-widget"
            >
                <CustomTable headers={associationHeaders} data={associationData} />
            </Widget>
            <ProfileAssociationsDialog
                isOpen={isAssociateProfileModalOpen}
                onClose={() => setIsAssociateProfileModalOpen(false)}
                profile={profile}
                associationsOfComplianceProfile={associationsOfComplianceProfile}
            />
        </>
    );
}
