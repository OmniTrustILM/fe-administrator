import type React from 'react';
import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import { SigningRecordStatisticsPeriod } from 'types/openapi';
import TimeSeriesChart from './TimeSeriesChart';

export type TimeSeriesChartNavHarnessProps = Readonly<
    Omit<React.ComponentProps<typeof TimeSeriesChart>, 'period' | 'onPeriodChange' | 'redirect'>
>;

export default function TimeSeriesChartNavHarness(props: TimeSeriesChartNavHarnessProps) {
    const store = createMockStore();
    const [period, setPeriod] = useState<SigningRecordStatisticsPeriod>(SigningRecordStatisticsPeriod._24h);
    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route
                        path="/"
                        element={<TimeSeriesChart {...props} redirect="/signingrecords" period={period} onPeriodChange={setPeriod} />}
                    />
                    <Route path="/signingrecords" element={<div data-testid="landed-on-redirect">landed</div>} />
                </Routes>
            </MemoryRouter>
        </Provider>
    );
}
