import { assertEquals } from '@std/assert';
import { walk } from '@std/fs';

// The page defines only the Pico palette colors the app uses, so using another one would silently
// leave it unset
Deno.test('every Pico palette color the client uses is defined', async () => {
  const src = new URL('..', import.meta.url).pathname;
  const pageStyles = await Deno.readTextFile(`${src}pageStyles.ts`);
  const defined = new Set([...pageStyles.matchAll(/(--pico-color-[a-z0-9-]+):/g)].map((m) => m[1]));

  const missing = new Set<string>();
  for await (const entry of walk(src, { exts: ['.ts'], skip: [/__test__/] })) {
    const source = await Deno.readTextFile(entry.path);
    for (const [, name] of source.matchAll(/var\((--pico-color-[a-z0-9-]+)/g)) {
      if (!defined.has(name)) missing.add(name);
    }
  }
  assertEquals([...missing], []);
});
