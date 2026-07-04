---
title: "Example — How a writeup looks"
machine: "Example"
status: retired          # 'retired' = published. Change your real machines only after they retire.
os: Linux
difficulty: Easy
points: 20
ownedUser: true
ownedRoot: true
date: 2026-07-04
techniques: ["Web enum", "SSRF", "sudo misconfig"]
cves: ["CVE-0000-00000"]
summary: "A template writeup that shows the section structure. Copy this file to start a new machine, then delete it once your first real writeup is live."
proof: "/proof/example.svg"
draft: false
---

> This is a **template**, not a real machine. It exists so you can see the layout and copy the
> structure. Duplicate this file (or run `npm run new "MachineName"`), fill in the real content once
> the machine is **retired**, and delete this example when your first real writeup is published.

## Summary

One short paragraph: what the box was about and the path to root. Example — *"Foothold came from an
SSRF in the web app that exposed internal credentials; root was a straightforward `sudo` misconfig.
Overall an easy Linux box that rewards careful enumeration."* Keep it spoiler-light and readable.

## Reconnaissance

Start with an `nmap` scan and talk through what stands out.

```bash
nmap -sC -sV -oA nmap/example 10.10.11.x
```

Explain the interesting ports and what they tell you. Drop a screenshot right after the output:

![Nmap results](/proof/example.svg)

## Web Enumeration

Walk through how you explored the app — directories, vhosts, parameters. Show the commands and your
reasoning, not just the winning payload.

```bash
ffuf -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt \
     -u http://example.htb/FUZZ
```

## Initial Access (Foothold)

Describe the vulnerability that got you a shell and *why* it worked. Include the key payload and a
screenshot of the shell landing.

## User Flag

```bash
cat /home/user/user.txt
```

> Redact the actual flag value in screenshots if you prefer — the writeup is about the method.

## Privilege Escalation

Explain enumeration on the box (`sudo -l`, SUID, cron, kernel), the misconfig you found, and how you
abused it.

```bash
sudo -l
sudo /usr/bin/some-binary   # GTFOBins-style abuse
```

## Root Flag

```bash
cat /root/root.txt
```

## Takeaways

Two or three bullets on what the box taught you — the transferable lesson, not the flag:

- Always test every input for SSRF when internal services are reachable.
- `sudo -l` first, always.
- Enumerate like the answer is one command away — because it usually is.
