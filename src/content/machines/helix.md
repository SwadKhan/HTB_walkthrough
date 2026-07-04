---
title: "Helix"
machine: "Helix"
status: active
os: Linux
difficulty: Medium
ownedUser: true
ownedRoot: true
date: 2026-05-12
techniques:
  - "Web application"
  - "Multi-step logic"
  - "Access control"
  - "Session handling"
  - "Localhost service abuse"
cves: []
summary: "Medium Linux box built around a moderately complex web application. Difficulty comes from application shape, not from a single CVE — the box rewards reasoning about state transitions and per-feature access decisions."
proof: "/proof/helix.png"
draft: false
---

## Machine Summary

Helix is a **Medium Linux box** whose difficulty is entirely a function of the shape of its web application. There is no single CVE at the front door — the operator has to build a mental map of the application within an hour of first contact and then reason about *state* rather than *endpoints*. Every feature is an access-control decision, and the box has quietly forgotten to make several of them consistent.

The foothold comes from **a multi-step logic bug** that no scanner will find on its own. Chaining two features that were designed to be independent surfaces material that the application intended to keep in another user's session, and the resulting state is enough to reach an authenticated position. Post-exploitation on the box is not scripted: the intended privilege escalation involves a **localhost-only service** running at higher privilege than a normal user, and the operator has to reason about *what the service was designed to do* before deciding how to abuse it. There is no `linpeas` finding that unlocks root — the box rewards reading source and thinking, not scanning.

Helix is one of the better introductions HTB has produced to the class of vulnerabilities that dominate modern SaaS application testing, and its lessons transfer directly to the kinds of engagements taught in Bug Bounty methodology guides from Jason Haddix and NahamSec.

## Attack Path Overview

<ol class="attack-path">
  <li>Recon surfaces a moderately complex web application backed by a supporting service on a non-standard port.</li>
  <li>Enumeration of features (not endpoints) uncovers two flows that were designed independently but interact in a way their authors did not intend.</li>
  <li>Chaining those flows surfaces material that belongs to another user's session.</li>
  <li>Recovered material is sufficient to reach an authenticated position on the application.</li>
  <li>Post-authentication enumeration surfaces a localhost-only service whose intended interface accepts input in a way that turns into an interactive shell.</li>
  <li>Reasoning about what that service does — not scripted enumeration — surfaces the privilege-escalation path that resolves to root.</li>
</ol>

## What This Box Teaches

- **Every feature is an access-control decision.** Write it down before shipping; test it as a matrix.
- **Session invalidation and state transitions are the parts of an application that most attacks find first.** They are also the parts that most developers get wrong.
- **Localhost services deserve the same threat model as internet-facing services** — once an operator has any shell, `127.0.0.1` is reachable.

## References

- [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [PortSwigger — access control vulnerabilities](https://portswigger.net/web-security/access-control)
- [OWASP Top 10 A04 — Insecure Design](https://owasp.org/Top10/A04_2021-Insecure_Design/)
- [Jason Haddix — Bug Hunter's Methodology](https://github.com/jhaddix/tbhm)

> **Compliance note.** This summary is spoiler-safe and describes only the *class* of vulnerabilities and techniques exercised. The full walkthrough — with commands, payloads, and defensive detections — will publish here the moment HTB officially retires Helix.
