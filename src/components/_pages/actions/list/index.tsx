import TabLayout from 'components/Layout/TabLayout';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router';
import { selectors as rulesSelectors } from 'ducks/rules';
import ActionsListComponent from './actions-list-component';
import ExecutionsListComponent from './executions-list-component';

const RulesList = () => {
    const { tabIndex } = useParams();
    const [activeTab, setActiveTab] = useState(0);
    const isFetchingActions = useSelector(rulesSelectors.isFetchingActions);
    const actionsList = useSelector(rulesSelectors.actionsList);

    useEffect(() => {
        if (tabIndex && Number.parseInt(tabIndex, 10) <= 1) {
            setActiveTab(Number.parseInt(tabIndex, 10));
        }
    }, [tabIndex]);

    return (
        <TabLayout
            selectedTab={activeTab}
            isLoading={isFetchingActions && actionsList.length === 0}
            tabs={[
                {
                    title: 'Actions',
                    content: <ActionsListComponent />,
                    onClick: () => setActiveTab(0),
                },
                {
                    title: 'Executions',
                    content: <ExecutionsListComponent />,
                    onClick: () => setActiveTab(1),
                },
            ]}
        />
    );
};

export default RulesList;
