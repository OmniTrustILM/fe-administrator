import TabLayout from 'components/Layout/TabLayout';
import ConditionsListComponent from './conditions-list-component';
import RulesListComponent from './rules-list-component';

const RulesList = () => {
    return (
        <TabLayout
            onlyActiveTabContent
            tabUrlParam="tab"
            tabs={[
                {
                    tabKey: 'rules',
                    title: 'Rules',
                    content: <RulesListComponent />,
                },
                {
                    tabKey: 'conditions',
                    title: 'Conditions',
                    content: <ConditionsListComponent />,
                },
            ]}
        />
    );
};

export default RulesList;
