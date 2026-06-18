import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import { SigningRecordStatisticsPeriod } from 'types/openapi';
import TimeSeriesChart from './TimeSeriesChart';

export type TimeSeriesChartWithStoreProps = Readonly<
    Omit<React.ComponentProps<typeof TimeSeriesChart>, 'period' | 'onPeriodChange'> & {
        initialPeriod?: SigningRecordStatisticsPeriod;
    }
>;

export default function TimeSeriesChartWithStore({
    initialPeriod = SigningRecordStatisticsPeriod._24h,
    ...props
}: TimeSeriesChartWithStoreProps) {
    const store = createMockStore();
    const [period, setPeriod] = useState<SigningRecordStatisticsPeriod>(initialPeriod);
    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/']}>
                <TimeSeriesChart {...props} period={period} onPeriodChange={setPeriod} />
            </MemoryRouter>
        </Provider>
    );
}
