// Unit tests for costUtils.ts
// Run with: node --experimental-strip-types tests/costUtils.unit.test.ts

import { estimateCost, formatCost } from '../src/utils/costUtils.ts';

// ---------------------------------------------------------------------------
// Minimal assertion helpers
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    failed++;
  } else {
    console.log(`  pass: ${message}`);
    passed++;
  }
}

function assertEquals<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    console.error(`  FAIL: ${message} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    failed++;
  } else {
    console.log(`  pass: ${message}`);
    passed++;
  }
}


function describe(name: string, fn: () => void): void {
  console.log(`\n=== ${name} ===`);
  fn();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BUG-004: estimateCost substring boundary matching', () => {
  // Unrelated model name containing "o3" as an internal substring should NOT match
  assertEquals(
    estimateCost('my-recommender-o3-agent', 1000, 1000),
    undefined,
    '"my-recommender-o3-agent" does not false-positive on "o3" key',
  );

  // Unrelated model name containing "o1" as an internal substring should NOT match
  assertEquals(
    estimateCost('custom-o1-fine-tuned', 1000, 1000),
    undefined,
    '"custom-o1-fine-tuned" does not false-positive on "o1" key',
  );

  // Unrelated model name containing "command" as an internal substring should NOT match
  assertEquals(
    estimateCost('my-recommender-command-agent', 1000, 1000),
    undefined,
    '"my-recommender-command-agent" does not false-positive on "command" key',
  );

  // Exact key "o3" at start of string should still match
  assert(
    estimateCost('o3', 1_000_000, 0) !== undefined,
    '"o3" exact match resolves to a cost',
  );

  // "o3-mini" should match "o3-mini" key, not "o3"
  const o3miniCost = estimateCost('o3-mini', 1_000_000, 0);
  assert(o3miniCost !== undefined, '"o3-mini" resolves to a cost');
  // o3-mini input price is $1.1/M tokens; o3 input price is $2/M — they must differ
  const o3Cost = estimateCost('o3', 1_000_000, 0);
  assert(
    o3miniCost !== o3Cost,
    '"o3-mini" uses o3-mini pricing, not o3 pricing',
  );

  // "gpt-4o-mini" should match "gpt-4o-mini" (longer key wins over "gpt-4o")
  const gpt4oMiniCost = estimateCost('gpt-4o-mini', 1_000_000, 0);
  const gpt4oCost = estimateCost('gpt-4o', 1_000_000, 0);
  assert(gpt4oMiniCost !== undefined, '"gpt-4o-mini" resolves to a cost');
  assert(
    gpt4oMiniCost !== gpt4oCost,
    '"gpt-4o-mini" uses gpt-4o-mini pricing, not gpt-4o pricing',
  );

  // Model with "o3" at word boundary via separator should match
  assert(
    estimateCost('openai/o3', 1_000_000, 0) !== undefined,
    '"openai/o3" with separator before "o3" resolves to a cost',
  );
});

describe('BUG-009: estimateCost undefined/null guards', () => {
  // Both undefined → undefined
  assertEquals(
    estimateCost('gpt-4o', undefined, undefined),
    undefined,
    'both tokens undefined returns undefined',
  );

  // null treated as undefined — both null → undefined
  assertEquals(
    estimateCost('gpt-4o', null as unknown as number, null as unknown as number),
    undefined,
    'both tokens null returns undefined',
  );

  // null input with defined output → estimate using output only (safeInput treated as 0)
  assert(
    estimateCost('gpt-4o', null as unknown as number, 1000) !== undefined,
    'null input with defined output returns a cost estimate',
  );

  // Legitimate zero cost: (0, 0) → defined value of 0
  assertEquals(
    estimateCost('gpt-4o', 0, 0),
    0,
    '(0, 0) tokens returns 0 (legitimate zero cost)',
  );

  // Only input defined → cost is based on input only
  const inputOnlyCost = estimateCost('gpt-4o', 1_000_000, undefined);
  assert(inputOnlyCost !== undefined, 'defined input + undefined output returns a cost');
  assertEquals(
    inputOnlyCost,
    2.5, // gpt-4o: $2.5/M input tokens
    'gpt-4o with 1M input tokens and undefined output costs $2.50',
  );

  // Only output defined → cost is based on output only
  const outputOnlyCost = estimateCost('gpt-4o', undefined, 1_000_000);
  assert(outputOnlyCost !== undefined, 'undefined input + defined output returns a cost');
  assertEquals(
    outputOnlyCost,
    10, // gpt-4o: $10/M output tokens
    'gpt-4o with undefined input and 1M output tokens costs $10.00',
  );
});

describe('BUG-010: formatCost negative values', () => {
  // Negative value should produce "-$..." not "$-..."
  assertEquals(
    formatCost(-0.05),
    '-$0.050',
    'formatCost(-0.05) returns "-$0.050"',
  );

  assertEquals(
    formatCost(-5),
    '-$5.00',
    'formatCost(-5) returns "-$5.00"',
  );

  assertEquals(
    formatCost(-0.001),
    '-$0.0010',
    'formatCost(-0.001) returns "-$0.0010"',
  );

  assertEquals(
    formatCost(-0.00001),
    '-<$0.0001',
    'formatCost(-0.00001) returns "-<$0.0001"',
  );

  // Positive values remain unaffected
  assertEquals(formatCost(0), '$0', 'formatCost(0) still returns "$0"');
  assertEquals(formatCost(5), '$5.00', 'formatCost(5) still returns "$5.00"');
  assertEquals(formatCost(0.05), '$0.050', 'formatCost(0.05) still returns "$0.050"');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) { process.exit(1); }
