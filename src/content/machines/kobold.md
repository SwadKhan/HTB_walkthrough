---
title: "Kobold"
machine: "Kobold"
status: active
os: Linux
difficulty: Easy
ownedUser: true
ownedRoot: true
date: 2026-03-28
techniques:
  - "Web enum"
  - "Configuration disclosure"
  - "Linux privesc"
  - "SUID abuse"
cves: []
summary: "Friendly Easy Linux box that rewards a methodical approach. Foothold via a web service configuration that overshares; root through a standard Linux misconfiguration."
proof: "/proof/kobold.png"
draft: false
---

## Machine Summary

Kobold is a **friendly Easy Linux box** built around a single lesson: read the whole application before deciding what is important. The intended solution is discoverable through patient enumeration — no scanner catches it, no CVE exists — and the operator's habits determine how quickly they solve the machine.

The foothold arrives once the operator notices that the web service is configured more openly than its author realised. Reading the exposed material carefully surfaces credentials or configuration sufficient to reach an authenticated position on the box. Privilege escalation is a **standard Linux misconfiguration** — the kind of finding that shows up in every `linpeas` output when the operator remembers to check the SUID section before dismissing it. There is nothing exotic here, and that is precisely the point.

Kobold is a good box for anyone still building the reflexes that OSCP demands — reading output slowly, writing findings down, and running `sudo -l` before every other privesc idea.

## Attack Path Overview

<ol class="attack-path">
  <li>Recon reveals a small attack surface with a web front and a supporting service.</li>
  <li>Enumeration of the web application uncovers configuration or content that the operator did not intend to expose to unauthenticated visitors.</li>
  <li>The exposed material is sufficient to reach an authenticated position on the box.</li>
  <li>An interactive shell is obtained through the ordinary post-authentication flow.</li>
  <li>Standard local enumeration surfaces a familiar Linux misconfiguration that resolves to root.</li>
</ol>

## What This Box Teaches

- **Enumerate slowly.** The intended path is visible from the front page, but only to the operator who does not skim.
- **`linpeas` is a checklist, not a magic wand.** Read its output; do not just skim for red text.
- **File permissions are the cheapest control you have.** Kobold has no exploit — it has a permissions bit that no one checked.

## References

- [HackTricks — Linux Privilege Escalation](https://book.hacktricks.xyz/linux-hardening/privilege-escalation)
- [GTFOBins — SUID misconfigurations](https://gtfobins.github.io/)
- [OWASP Top 10 A05 — Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/)

> **Compliance note.** This summary is spoiler-safe and describes only the *class* of vulnerabilities and techniques exercised. The full walkthrough — with commands, payloads, and defensive detections — will publish here the moment HTB officially retires Kobold.
