import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// TODO(Swad): change `site` to your real deployed URL once you know it
// (e.g. https://htb-swad.vercel.app). Used for canonical links.
export default defineConfig({
  site: 'https://htb-swad.vercel.app',
  integrations: [mdx()],
});
