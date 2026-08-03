import { test, expect } from '../../../playwright/ct-test';
import CronBuilderWithProviders from './CronBuilderWithProviders';

const cron = (value: string, onChange: (v: string) => void = () => {}) => <CronBuilderWithProviders value={value} onChange={onChange} />;

const POLL = { timeout: 2000 } as const;

function createEmitCapture() {
    let emitted = '';
    return {
        onChange: (v: string) => {
            emitted = v;
        },
        getEmitted: () => emitted,
        clearEmitted: () => {
            emitted = '';
        },
    };
}

const activeTabCases: { title: string; expr: string; tab: string }[] = [
    { title: 'should select Minutes tab when given minutes expression', expr: '0 */10 * * * ?', tab: 'Minutes' },
    { title: 'should select Hourly tab when given hourly everyN expression', expr: '0 00 */2 * * ?', tab: 'Hourly' },
    { title: 'should select Daily tab when given daily expression', expr: '0 00 12 * * ?', tab: 'Daily' },
    { title: 'should select Daily tab for weekdays expression', expr: '0 00 08 ? * MON-FRI', tab: 'Daily' },
    { title: 'should select Weekly tab when given weekly expression', expr: '0 00 09 ? * MON,WED', tab: 'Weekly' },
    { title: 'should select Monthly tab for specific day expression', expr: '0 00 12 15 * ?', tab: 'Monthly' },
    { title: 'should select Monthly tab for last day expression', expr: '0 00 12 L * ?', tab: 'Monthly' },
    { title: 'should select Monthly tab for last weekday expression', expr: '0 00 12 LW * ?', tab: 'Monthly' },
    { title: 'should select Monthly tab for days-before-end expression', expr: '0 00 12 L-3 * ?', tab: 'Monthly' },
    { title: 'should select Monthly tab for every-N-days expression', expr: '0 00 12 1/5 * ?', tab: 'Monthly' },
    { title: 'should select Custom tab for unrecognized expression', expr: '0 0 12 1,15 * ?', tab: 'Custom' },
    { title: 'should select Custom tab for expression with fewer than 6 parts', expr: '0 0 12', tab: 'Custom' },
    { title: 'should parse old react-cron-generator hourly atTime format (1/1 DOM)', expr: '0 06 15 1/1 * ? *', tab: 'Hourly' },
];

test.describe('CronBuilder', () => {
    test('should display cron expression at the bottom', async ({ mount }) => {
        const component = await mount(cron('0 */5 * * * ?'));
        await expect(component.locator('code').last()).toContainText('0 */5 * * * ?');
    });

    test('names UTC in the schedule description and previews the next run locally', async ({ mount }) => {
        const component = await mount(cron('0 36 11 * * ?'));

        // Core runs the cron in UTC — the description must say so rather than leave the time bare.
        await expect(component.getByTestId('cron-builder-schedule-hint-description')).toContainText('11:36');
        await expect(component.getByTestId('cron-builder-schedule-hint-description')).toContainText('UTC');
        // ...and the same firing is spelled out in the viewer's own zone, where it may land on another hour.
        await expect(component.getByTestId('cron-builder-schedule-hint-next-run')).toContainText('your local time');
    });

    test('marks the start time inputs as UTC', async ({ mount }) => {
        const component = await mount(cron('0 00 12 * * ?'));
        await expect(component.getByText('Start time')).toBeVisible();
        await expect(component.getByText('UTC', { exact: true })).toBeVisible();
    });

    test('previews the Quartz month-end schedules the Monthly tab emits', async ({ mount }) => {
        // cron-parser rejects `LW`; our own fallback resolves it, so no Monthly mode is left without
        // a preview. The sibling `L-N` form is covered in the cronSchedule unit tests.
        const component = await mount(cron('0 00 12 LW * ?'));

        await expect(component.getByTestId('cron-builder-schedule-hint-description')).toContainText('UTC');
        await expect(component.getByTestId('cron-builder-schedule-hint-next-run')).toContainText('your local time');
    });

    for (const { title, expr, tab } of activeTabCases) {
        test(title, async ({ mount }) => {
            const component = await mount(cron(expr));
            await expect(component.getByRole('tab', { name: tab })).toHaveClass(/\bactive\b/);
        });
    }

    test('should display zero-padded minutes and hours in cron expression', async ({ mount }) => {
        const component = await mount(cron('0 06 09 * * ?'));
        await expect(component.locator('code').last()).toContainText('0 06 09 * * ?');
    });

    const tabSwitchCases: [string, RegExp][] = [
        ['Minutes', /^0 \*\/\d+ \* \* \* \?$/],
        ['Hourly', /^0 \d+ \*\/\d+ \* \* \?$/],
        ['Weekly', /^0 \d+ \d+ \? \* \w+$/],
        ['Monthly', /^0 \d+ \d+ \d+ \* \?$/],
    ];

    for (const [tab, pattern] of tabSwitchCases) {
        test(`should switch to ${tab} tab and emit cron`, async ({ mount }) => {
            const { onChange, getEmitted } = createEmitCapture();
            const component = await mount(cron('0 00 12 * * ?', onChange));
            await component.getByRole('tab', { name: tab }).click();
            await expect.poll(() => getEmitted(), POLL).toMatch(pattern);
        });
    }

    test('should switch to Custom tab and populate expression from current state', async ({ mount }) => {
        const { onChange, getEmitted } = createEmitCapture();
        const component = await mount(cron('0 00 12 * * ?', onChange));
        await component.getByRole('tab', { name: 'Custom' }).click();
        await expect.poll(() => getEmitted(), POLL).toBe('0 00 12 * * ?');
    });

    test('should emit correct cron after incrementing minutes interval', async ({ mount }) => {
        const { onChange, getEmitted } = createEmitCapture();
        const component = await mount(cron('0 */5 * * * ?', onChange));
        await component.getByLabel('Increase').first().click();
        await expect.poll(() => getEmitted(), POLL).toBe('0 */6 * * * ?');
    });

    test('should display everyN hourly cron correctly', async ({ mount }) => {
        const component = await mount(cron('0 00 */3 * * ?'));
        await expect(component.getByRole('tab', { name: 'Hourly' })).toHaveClass(/\bactive\b/);
        await expect(component.locator('code').last()).toContainText('0 00 */3 * * ?');
    });

    test('should emit atTime cron when At row is selected', async ({ mount }) => {
        const { onChange, getEmitted } = createEmitCapture();
        const component = await mount(cron('0 00 */3 * * ?', onChange));
        await component.getByRole('radio').nth(1).click();
        await expect.poll(() => getEmitted(), POLL).toMatch(/^0 \d+ \d+ \* \* \?$/);
    });

    test('should stay on Hourly tab after switching to atTime mode', async ({ mount }) => {
        const component = await mount(cron('0 00 */2 * * ?'));
        await component.getByRole('radio').nth(1).click();
        await expect(component.getByRole('tab', { name: 'Hourly' })).toHaveClass(/\bactive\b/);
    });

    test('should switch back to everyN mode in Hourly and emit correct cron', async ({ mount }) => {
        const { onChange, getEmitted } = createEmitCapture();
        const component = await mount(cron('0 06 09 * * ?', onChange));
        await component.getByRole('tab', { name: 'Hourly' }).click();
        await component.getByRole('radio').nth(0).click();
        await expect.poll(() => getEmitted(), POLL).toMatch(/^0 \d+ \*\/\d+ \* \* \?$/);
    });

    test('should emit correct cron after changing everyHours in Hourly everyN mode', async ({ mount }) => {
        const { onChange, getEmitted } = createEmitCapture();
        const component = await mount(cron('0 00 */2 * * ?', onChange));
        await component.getByLabel('Increase').first().click();
        await expect.poll(() => getEmitted(), POLL).toBe('0 00 */3 * * ?');
    });

    test('should emit correct cron after changing atHour in Hourly atTime mode', async ({ mount }) => {
        const { onChange, getEmitted, clearEmitted } = createEmitCapture();
        const component = await mount(cron('0 06 09 * * ?', onChange));
        await component.getByRole('tab', { name: 'Hourly' }).click();
        await component.getByRole('radio').nth(1).click();
        clearEmitted();
        // Hourly tab Increase buttons: nth(0)=everyHours, nth(1)=atMinute(everyN), nth(2)=atHour, nth(3)=atMinute(atTime)
        await component.getByLabel('Increase').nth(2).click();
        await expect.poll(() => getEmitted(), POLL).toMatch(/^0 06 \d+ \* \* \?$/);
    });

    test('should emit weekdays cron when Every week day is selected', async ({ mount }) => {
        const { onChange, getEmitted } = createEmitCapture();
        const component = await mount(cron('0 00 08 * * ?', onChange));
        await component.getByRole('tab', { name: 'Daily' }).click();
        await component.getByRole('radio').nth(1).click();
        await expect.poll(() => getEmitted(), POLL).toMatch(/^0 \d+ \d+ \? \* MON-FRI$/);
    });

    test('should stay on Daily tab after selecting Every week day', async ({ mount }) => {
        const component = await mount(cron('0 00 08 * * ?'));
        await component.getByRole('tab', { name: 'Daily' }).click();
        await component.getByRole('radio').nth(1).click();
        await expect(component.getByRole('tab', { name: 'Daily' })).toHaveClass(/\bactive\b/);
    });

    test('should emit correct cron after switching Daily to everyN mode', async ({ mount }) => {
        const { onChange, getEmitted } = createEmitCapture();
        const component = await mount(cron('0 00 08 ? * MON-FRI', onChange));
        await component.getByRole('radio').nth(0).click();
        await expect.poll(() => getEmitted(), POLL).toMatch(/^0 \d+ \d+ \* \* \?$/);
    });

    test('should emit correct cron after incrementing daily everyN days', async ({ mount }) => {
        const { onChange, getEmitted } = createEmitCapture();
        const component = await mount(cron('0 00 08 * * ?', onChange));
        await component.getByLabel('Increase').first().click();
        await expect.poll(() => getEmitted(), POLL).toMatch(/^0 \d+ \d+ \*\/2 \* \?$/);
    });

    test('should emit correct cron after changing start time hour in Daily tab', async ({ mount }) => {
        const { onChange, getEmitted } = createEmitCapture();
        const component = await mount(cron('0 00 12 * * ?', onChange));
        await component.getByLabel('Increase').nth(1).click();
        await expect.poll(() => getEmitted(), POLL).toMatch(/^0 00 13 \* \* \?$/);
    });

    test('should show weekday checkboxes on Weekly tab', async ({ mount }) => {
        const component = await mount(cron('0 00 09 ? * MON,WED'));
        await expect(component.getByText('Monday', { exact: true })).toBeVisible();
        await expect(component.getByText('Friday', { exact: true })).toBeVisible();
    });

    test('should emit correct cron when weekday is toggled', async ({ mount }) => {
        const { onChange, getEmitted } = createEmitCapture();
        const component = await mount(cron('0 00 09 ? * MON', onChange));
        await component.getByLabel('Wednesday').click();
        await expect.poll(() => getEmitted(), POLL).toContain('MON,WED');
    });

    test('should keep last weekday when unchecking it', async ({ mount }) => {
        const { onChange, getEmitted } = createEmitCapture();
        const component = await mount(cron('0 00 09 ? * MON', onChange));
        await component.getByLabel('Monday').click();
        await expect.poll(() => getEmitted(), POLL).toContain('MON');
    });

    test('should emit correct cron after changing start time hour in Weekly tab', async ({ mount }) => {
        const { onChange, getEmitted } = createEmitCapture();
        const component = await mount(cron('0 00 09 ? * MON', onChange));
        await component.getByLabel('Increase').first().click();
        await expect.poll(() => getEmitted(), POLL).toMatch(/^0 00 10 \? \* MON$/);
    });

    test('should emit lastDay cron when Last day option is selected', async ({ mount }) => {
        const { onChange, getEmitted } = createEmitCapture();
        const component = await mount(cron('0 00 12 1 * ?', onChange));
        await component.getByRole('tab', { name: 'Monthly' }).click();
        await component.getByRole('radio').nth(1).click();
        await expect.poll(() => getEmitted(), POLL).toMatch(/^0 \d+ \d+ L \* \?$/);
    });

    test('should emit lastWeekday cron when Last weekday option is selected', async ({ mount }) => {
        const { onChange, getEmitted } = createEmitCapture();
        const component = await mount(cron('0 00 12 1 * ?', onChange));
        await component.getByRole('tab', { name: 'Monthly' }).click();
        await component.getByRole('radio').nth(2).click();
        await expect.poll(() => getEmitted(), POLL).toMatch(/^0 \d+ \d+ LW \* \?$/);
    });

    test('should stay on Monthly tab after selecting lastDay mode', async ({ mount }) => {
        const component = await mount(cron('0 00 12 1 * ?'));
        await component.getByRole('tab', { name: 'Monthly' }).click();
        await component.getByRole('radio').nth(1).click();
        await expect(component.getByRole('tab', { name: 'Monthly' })).toHaveClass(/\bactive\b/);
    });

    test('should emit daysBeforeEnd cron when that option is selected', async ({ mount }) => {
        const { onChange, getEmitted } = createEmitCapture();
        const component = await mount(cron('0 00 12 1 * ?', onChange));
        await component.getByRole('tab', { name: 'Monthly' }).click();
        await component.getByRole('radio').nth(3).click();
        await expect.poll(() => getEmitted(), POLL).toMatch(/^0 \d+ \d+ L-\d+ \* \?$/);
    });

    test('should emit everyN monthly cron when everyN option is selected', async ({ mount }) => {
        const { onChange, getEmitted } = createEmitCapture();
        const component = await mount(cron('0 00 12 1 * ?', onChange));
        await component.getByRole('tab', { name: 'Monthly' }).click();
        await component.getByRole('radio').nth(4).click();
        await expect.poll(() => getEmitted(), POLL).toMatch(/^0 \d+ \d+ 1\/\d+ \* \?$/);
    });

    test('should emit correct cron after incrementing monthDay in Monthly tab', async ({ mount }) => {
        const { onChange, getEmitted } = createEmitCapture();
        const component = await mount(cron('0 00 12 1 * ?', onChange));
        await component.getByLabel('Increase').first().click();
        await expect.poll(() => getEmitted(), POLL).toBe('0 00 12 2 * ?');
    });

    test('should emit correct cron after incrementing daysBeforeEnd value', async ({ mount }) => {
        const { onChange, getEmitted } = createEmitCapture();
        const component = await mount(cron('0 00 12 L-3 * ?', onChange));
        // Monthly tab Increase order: nth(0)=monthDay, nth(1)=daysBeforeEnd, nth(2)=monthlyEveryN, nth(3)=atHour, nth(4)=atMinute
        await component.getByLabel('Increase').nth(1).click();
        await expect.poll(() => getEmitted(), POLL).toBe('0 00 12 L-4 * ?');
    });

    test('should emit correct cron after incrementing monthlyEveryN value', async ({ mount }) => {
        const { onChange, getEmitted } = createEmitCapture();
        const component = await mount(cron('0 00 12 1/5 * ?', onChange));
        // Monthly tab Increase order: nth(0)=monthDay, nth(1)=daysBeforeEnd, nth(2)=monthlyEveryN, nth(3)=atHour, nth(4)=atMinute
        await component.getByLabel('Increase').nth(2).click();
        await expect.poll(() => getEmitted(), POLL).toBe('0 00 12 1/6 * ?');
    });

    test('should allow editing expression manually in Custom tab', async ({ mount }) => {
        const { onChange, getEmitted } = createEmitCapture();
        const component = await mount(cron('0 0 12 1,15 * ?', onChange));
        await expect(component.getByRole('tab', { name: 'Custom' })).toHaveClass(/\bactive\b/);
        const input = component.getByPlaceholder('0 0 12 * * ?');
        await input.focus();
        await input.fill('0 0 6 * * ?');
        await expect.poll(() => getEmitted(), POLL).toBe('0 0 6 * * ?');
    });

    test('should show human-readable description for valid expression', async ({ mount }) => {
        const component = await mount(cron('0 00 12 * * ?'));
        await expect(component.locator('code').first()).not.toBeEmpty();
    });

    test('should update displayed expression when value prop changes externally', async ({ mount }) => {
        const component = await mount(cron('0 00 12 * * ?'));
        await component.update(cron('0 */15 * * * ?'));
        await expect(component.locator('code').last()).toContainText('0 */15 * * * ?');
    });

    test('should not re-parse when value matches last emitted cron', async ({ mount }) => {
        const component = await mount(cron('0 00 */2 * * ?'));
        await expect(component.getByRole('tab', { name: 'Hourly' })).toHaveClass(/\bactive\b/);
        await component.update(cron('0 00 */2 * * ?'));
        await expect(component.getByRole('tab', { name: 'Hourly' })).toHaveClass(/\bactive\b/);
    });
});
