import TabLayout from 'components/Layout/TabLayout';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router';
import { selectors as rulesSelectors } from 'ducks/rules';
import ConditionsListComponent from './conditions-list-component';
import RulesListComponent from './rules-list-component';

const RulesList = () => {
    const { tabIndex } = useParams();
    const [activeTab, setActiveTab] = useState(0);
    const isFetchingRulesList = useSelector(rulesSelectors.isFetchingRulesList);
    const rules = useSelector(rulesSelectors.rules);
    const isLoading = isFetchingRulesList && rules.length === 0;

    useEffect(() => {
        if (tabIndex && Number.parseInt(tabIndex, 10) <= 1) {
            setActiveTab(Number.parseInt(tabIndex, 10));
        }
    }, [tabIndex]);

    return (
        <TabLayout
            selectedTab={activeTab}
            onlyActiveTabContent
            isLoading={isLoading}
            tabs={[
                {
                    title: 'Rules',
                    content: <RulesListComponent />,
                    onClick: () => setActiveTab(0),
                },
                {
                    title: 'Conditions',
                    content: <ConditionsListComponent />,
                    onClick: () => setActiveTab(1),
                },
            ]}
        />
    );
};

export default RulesList;
