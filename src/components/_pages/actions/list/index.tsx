import TabLayout from 'components/Layout/TabLayout';
import ActionsListComponent from './actions-list-component';
import ExecutionsListComponent from './executions-list-component';

const ActionsList = () => {
    return (
        <TabLayout
            tabUrlParam="tab"
            tabs={[
                {
                    tabKey: 'actions',
                    title: 'Actions',
                    content: <ActionsListComponent />,
                },
                {
                    tabKey: 'executions',
                    title: 'Executions',
                    content: <ExecutionsListComponent />,
                },
            ]}
        />
    );
};

export default ActionsList;
