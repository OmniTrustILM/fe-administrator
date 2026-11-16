import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { createObjectPermissionStore } from 'components/_pages/test-utils/objectPermissionStore';
import { testInitialState } from 'ducks/test-reducers';
import { Resource, type ResourceAction } from 'types/openapi';
import RuleDetail from './index';

type Props = Readonly<{
    /** The actions the user's profile grants on rules. */
    rulesActions: ResourceAction[];
}>;

const ruleDetails = {
    uuid: 'rule-1',
    name: 'Rule',
    description: '',
    resource: Resource.Certificates,
    conditions: [],
};

const conditions = [{ uuid: 'condition-1', name: 'Condition', resource: Resource.Certificates, items: [] }];

export default function RuleDetailWithStore({ rulesActions }: Props) {
    const [store] = useState(() =>
        createObjectPermissionStore({
            resource: Resource.Rules,
            uuid: ruleDetails.uuid,
            allowedActions: [],
            resourceGrants: [{ resource: Resource.Rules, actions: rulesActions }],
            preloadedState: { rules: { ...testInitialState.rules, ruleDetails, conditions } },
        }),
    );

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={[`/rules/detail/${ruleDetails.uuid}`]}>
                <Routes>
                    <Route path="/rules/detail/:id" element={<RuleDetail />} />
                </Routes>
            </MemoryRouter>
        </Provider>
    );
}
