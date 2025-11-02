import * as orchestrators from '../index.ts';
import { assertExists } from 'https://deno.land/std@0.203.0/assert/mod.ts';

Deno.test('orchestrators index exports expected functions', () => {
  // Ensure primary orchestrators are exported
  assertExists(orchestrators.startGameOrchestrator);
  assertExists(orchestrators.playTileOrchestrator);
  assertExists(orchestrators.buySharesOrchestrator);
  assertExists(orchestrators.proceedToBuySharesOrchestrator);
  assertExists(orchestrators.processMergerOrchestrator);
  assertExists(orchestrators.resolveMergerOrchestrator);
});
