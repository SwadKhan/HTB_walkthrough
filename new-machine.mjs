#!/usr/bin/env node
/**
 * Scaffold a new machine writeup file.
 *
 * Usage:
 *   npm run new "Cicada"
 *   npm run new "Cicada" -- --os Windows --difficulty Easy
 *   npm run new "Cicada" -- --retired      (create it already published)
 *
 * Creates src/content/machines/<slug>.md with a ready-to-fill template.
 * Defaults to status: active (locked) so nothing publishes by accident.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

const name = args.find((a) => !a.startsWith('--'));
if (!name) {
  console.error('Usage: npm run new "Machine Name" -- [--os Linux|Windows] [--difficulty Easy] [--retired]');
  process.exit(1);
}

const getFlag = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null;
};

const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const os = getFlag('--os') || 'Linux';
const difficulty = getFlag('--difficulty') || 'Easy';
const retired = args.includes('--retired');

const dir = path.join(__dirname, 'src', 'content', 'machines');
const file = path.join(dir, `${slug}.md`);

if (fs.existsSync(file)) {
  console.error(`Already exists: ${file}`);
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);

const template = `---
title: "${name}"
machine: "${name}"
status: ${retired ? 'retired' : 'active'}   # 'active' = locked. Flip to 'retired' ONLY after it officially retires on HTB.
os: ${os}
difficulty: ${difficulty}
points: 20
ownedUser: true
ownedRoot: true
date: ${today}
techniques: []          # e.g. ["SSRF", "AD", "sudo misconfig"] — high-level, spoiler-safe
cves: []                # e.g. ["CVE-2024-1234"]
summary: "Owned user and root.${retired ? '' : ' Full writeup will be published once the machine retires.'}"
proof: "/proof/${slug}.png"   # drop your screenshot here (redact the flag if you like)
draft: false
---

## Summary

_(Write the writeup below. It renders publicly only when status is 'retired'.)_

## Reconnaissance

\`\`\`bash
nmap -sC -sV -oA nmap/${slug} <target-ip>
\`\`\`

## Initial Access

## User Flag

## Privilege Escalation

## Root Flag

## Takeaways
`;

fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(file, template);
console.log(`Created src/content/machines/${slug}.md  (status: ${retired ? 'retired' : 'active'})`);
console.log(`Next: add your proof image at public/proof/${slug}.png, then fill in the sections.`);
