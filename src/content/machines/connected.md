---
title: "Connected"
machine: "Connected"
status: active
os: Linux
difficulty: Easy
ownedUser: true
ownedRoot: true
date: 2026-06-06
techniques:
  - "Web enum"
  - "Configuration disclosure"
  - "Linux privesc"
  - "sudo misconfig"
cves: []
summary: "Easy Linux box that punishes skipping a step. Foothold via an over-shared web service; root through a standard Linux misconfiguration surfaced by basic enumeration."
proof: "/proof/connected.png"
draft: false
---

## Machine Summary

Connected is an **Easy Linux box** that lives up to its name: nothing on the machine is exotic, but everything is *connected* to something else in a way that the operator has to notice before acting. It is the kind of box that punishes a rushed enumeration pass and rewards a slow one — the intended solution is always visible from the front page, but only to an operator who reads the whole output rather than pattern-matching on the first interesting line.

The web service exposes more than its author intended. Careful reading of what is served turns up material that provides an authenticated position; from there, the machine hands the operator a shell without any exploit development. Privilege escalation is a **classic Linux misconfiguration** — the sort of finding that shows up in every `linpeas` output when the operator remembers to read the sudo section before scrolling past it. There is no kernel exploit, no container escape, no custom binary; the box is squarely about enumeration discipline and the habit of chasing every open port to a conclusion.

For anyone using Connected as a warm-up for OSCP or the HackTheBox Certified Penetration Testing Specialist (CPTS), the transferable lesson is the discipline of writing down every finding before deciding which is important.

## Attack Path Overview

<ol class="attack-path">
  <li>Recon surfaces a small attack surface with a web front-end and a supporting service.</li>
  <li>Careful browsing of the application uncovers content that the author did not intend to expose to unauthenticated visitors.</li>
  <li>That content provides material sufficient to reach an authenticated state on the machine.</li>
  <li>An interactive shell is obtained via the ordinary post-authentication flow.</li>
  <li>Standard local enumeration surfaces a familiar Linux misconfiguration that resolves to root.</li>
</ol>

## What This Box Teaches

- **Read every output line.** The intended path is visible from the front page, but only to the operator who does not skim.
- **Enumeration beats exploitation on Easy Linux.** Connected has no CVE — it has a *policy* the operator has to notice.
- **`sudo -l` first, always.** The single command that opens more Easy Linux boxes than any other.

## References

- [GTFOBins — sudo misconfigurations](https://gtfobins.github.io/)
- [HackTricks — Linux Privilege Escalation](https://book.hacktricks.xyz/linux-hardening/privilege-escalation)
- [MITRE ATT&CK T1548.003 — Sudo and Sudo Caching](https://attack.mitre.org/techniques/T1548/003/)

> **Compliance note.** This summary is spoiler-safe and describes only the *class* of vulnerabilities and techniques exercised. The full walkthrough — with commands, payloads, and defensive detections — will publish here the moment HTB officially retires Connected.
