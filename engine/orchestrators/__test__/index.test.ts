import * as orchestrators from '../index.ts';
import { assertExists } from '@std/assert';

Deno.test('orchestrators index exports expected functions', () => {
  // Ensure primary orchestrators are exported
  assertExists(orchestrators.startGameOrchestrator);
  assertExists(orchestrators.playTileOrchestrator);
  assertExists(orchestrators.buySharesOrchestrator);
  assertExists(orchestrators.proceedToBuySharesOrchestrator);
  assertExists(orchestrators.processMergerOrchestrator);
  assertExists(orchestrators.resolveMergerOrchestrator);
});
