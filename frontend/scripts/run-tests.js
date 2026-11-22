import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { run } from 'node:test';
import { spec } from 'node:test/reporters';

const testDirectory = resolve('tests');
let testFiles = [];

try {
  testFiles = readdirSync(testDirectory)
    .filter((file) => file.endsWith('.test.js'))
    .map((file) => resolve(testDirectory, file));
} catch {
  // The explicit failure below gives a clear message when the suite is absent.
}

if (testFiles.length === 0) {
  console.error('No frontend test files found in frontend/tests/*.test.js');
  process.exit(1);
}

let passedTests = 0;
let hasFailedTest = false;
const tests = run({ files: testFiles });

tests.on('test:complete', (event) => {
  if (!event.details.passed) {
    hasFailedTest = true;
    return;
  }
  if (testFiles.includes(event.name) || event.details.type === 'suite' || event.skip || event.todo) return;
  if (event.details.passed) passedTests += 1;
});

tests.on('end', () => {
  if (hasFailedTest) process.exitCode = 1;
  else if (passedTests === 0) {
    console.error('Frontend test suite passed zero tests');
    process.exitCode = 1;
  }
});

tests.compose(new spec()).pipe(process.stdout);
