import fs from 'node:fs';

const input = 'coverage-playwright/lcov.info';

const raw = fs.readFileSync(input, 'utf8');
const records = raw.split('end_of_record\n');

const keep = [];
for (const r of records) {
    if (!r.trim()) continue;

    const sf = /^SF:(.*)$/m.exec(r)?.[1] ?? '';
    const lf = Number(/^LF:(\d+)$/m.exec(r)?.[1] ?? '0');

    const isCss = sf.endsWith('.css');
    const isAssets = sf.includes('/assets/') || sf.includes('assets/');
    const isLocalhostAsset = sf.startsWith('localhost-') && isAssets;

    if (lf === 0) continue;
    if (isCss) continue;
    if (isLocalhostAsset) continue;

    keep.push(r.trimEnd() + '\nend_of_record\n');
}

fs.writeFileSync(input, keep.join(''), 'utf8');
console.log(`Wrote ${input}: kept ${keep.length} records`);
