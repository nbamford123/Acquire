// Registers happy-dom as the global DOM so Lit components render under deno test. Import it before
// any component module.
import { GlobalRegistrator } from '@happy-dom/global-registrator';

if (!GlobalRegistrator.isRegistered) {
  // happy-dom replaces the global event methods with ones that reject Deno's own Event objects,
  // which breaks the test runner's load/unload events. Components only dispatch events on
  // elements, so keep Deno's.
  const { dispatchEvent, addEventListener, removeEventListener } = globalThis;
  GlobalRegistrator.register();
  Object.assign(globalThis, { dispatchEvent, addEventListener, removeEventListener });
}
