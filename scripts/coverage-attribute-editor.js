import fs from 'node:fs';

const input = 'coverage/lcov.info';
const folder = 'AttributeEditor';
const arg1 = process.argv[2];
const arg2 = process.argv[3];
/** Restrict to subfolder, e.g. "Attribute" => only AttributeEditor/Attribute/ */
const subfolder = arg1 === 'Attribute' ? 'AttributeEditor/Attribute' : null;
/** Path filter for any folder (e.g. "DatePicker") — show coverage for files under that path */
const pathFilter =
    arg1 && arg1 !== 'Attribute' && (arg1.includes('/') || arg1.includes('DatePicker') || !/\.(ts|tsx|js|jsx)$/.test(arg1)) ? arg1 : null;
let fileFilter;
if (subfolder) {
    fileFilter = arg2;
} else if (pathFilter) {
    fileFilter = null;
} else {
    fileFilter = arg1; // e.g. AttributeFieldInput.tsx
}

if (!fs.existsSync(input)) {
    console.error('No coverage/lcov.info. Run tests first, e.g.:');
    console.error('  npx playwright test -c playwright-ct.config.ts --project=chromium "src/components/DatePicker/..."');
    console.error('  node scripts/clean-lcov.js');
    process.exit(1);
}

const raw = fs.readFileSync(input, 'utf8');
const records = raw.split('end_of_record\n');

let totalLines = 0;
let hitLines = 0;
const files = [];

for (const r of records) {
    if (!r.trim()) continue;

    const sf = (/^SF:(.*)$/m.exec(r)?.[1] ?? '').replaceAll('\\', '/');
    if (pathFilter) {
        if (!sf.includes(pathFilter.replace(/^src\/?/, ''))) continue;
    } else {
        if (!sf.includes(folder)) continue;
        if (subfolder && !sf.includes(subfolder)) continue;
        if (fileFilter && !sf.endsWith(fileFilter) && !sf.includes('/' + fileFilter)) continue;
    }

    const lf = Number(/^LF:(\d+)$/m.exec(r)?.[1] ?? 0);
    const lh = Number(/^LH:(\d+)$/m.exec(r)?.[1] ?? 0);
    if (lf === 0) continue;

    totalLines += lf;
    hitLines += lh;
    files.push({ path: sf.replace(/^.*?src\//, 'src/'), lf, lh, pct: ((lh / lf) * 100).toFixed(1) });
}

if (files.length === 0) {
    const scope = pathFilter || subfolder || folder;
    console.log(fileFilter ? `No coverage records found for file: ${fileFilter}` : `No coverage records found for: ${scope}`);
    process.exit(0);
}

const pct = totalLines ? ((hitLines / totalLines) * 100).toFixed(1) : '0';
let title;
if (pathFilter) {
    title = `Coverage for ${pathFilter}`;
} else if (fileFilter) {
    title = `Coverage for ${fileFilter}`;
} else if (subfolder) {
    title = `Coverage for src/components/Attributes/${subfolder}/`;
} else {
    title = `Coverage for src/components/Attributes/${folder}/`;
}
console.log(`\n${title}\n`);
files.forEach((f) => console.log(`  ${f.pct}%  ${f.path}`));
console.log(`\n  Total: ${hitLines}/${totalLines} lines  →  ${pct}%\n`);
