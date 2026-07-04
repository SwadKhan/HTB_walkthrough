import { defineCollection, z } from 'astro:content';

/**
 * Each machine writeup is one Markdown file in src/content/machines/.
 *
 * POLICY GATE — the `status` field controls publishing:
 *   status: 'retired'  -> full writeup body + proof image are rendered publicly.
 *   status: 'active'   -> body is HIDDEN; the page shows a "locked until retirement"
 *                         notice. This keeps you compliant with Hack The Box's rule
 *                         that only RETIRED content may be published.
 *
 * Only flip a machine to 'retired' after you have confirmed on the HTB site that it
 * is officially retired (not just "expired"/seasonal-inactive).
 */
const machines = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    machine: z.string(),
    // publishing gate — defaults to locked so nothing leaks by accident
    status: z.enum(['retired', 'active']).default('active'),
    os: z.enum(['Linux', 'Windows', 'Other']).optional(),
    difficulty: z.enum(['Easy', 'Medium', 'Hard', 'Insane']).optional(),
    points: z.number().optional(),
    ownedUser: z.boolean().default(true),
    ownedRoot: z.boolean().default(true),
    // optional; used to sort published writeups (newest first)
    date: z.coerce.date().optional(),
    // high-level, spoiler-safe tags (e.g. "SSRF", "AD", "sudo misconfig")
    techniques: z.array(z.string()).default([]),
    cves: z.array(z.string()).default([]),
    // one or two safe sentences shown on the card and at the top of the page
    summary: z.string(),
    // proof screenshot path under /public/proof/ (e.g. "/proof/connected.png")
    // shown ONLY when status is 'retired' — redact flags before publishing.
    proof: z.string().optional(),
    // set true to hide a machine entirely while you draft it
    draft: z.boolean().default(false),
  }),
});

export const collections = { machines };
