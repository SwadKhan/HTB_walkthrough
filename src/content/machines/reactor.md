---
title: "Reactor"
machine: "Reactor"
status: active
os: Linux
difficulty: Easy
ownedUser: true
ownedRoot: true
date: 2026-05-23
techniques:
  - "Web enum"
  - "Authentication analysis"
  - "Session handling"
  - "Linux privesc"
cves: []
summary: "Easy Linux box that tests authentication-flow analysis. Foothold via a login flow that leaks more than it should; root through a standard Linux misconfiguration."
proof: "/proof/reactor.png"
draft: false
---

## Machine Summary

Reactor is an **Easy Linux box** built entirely around a single idea: read a login page like a developer, not like an attacker. There is no exotic vulnerability here — the intended path exists because the application's author made assumptions about who would ever look at their code. The box rewards the operator who spends ten minutes with the developer console open before reaching for a scanner.

The foothold comes from **poor authentication hygiene**: a login flow that behaves differently in ways it should not, leaks state it should not, and rewards an operator willing to think about how the login was probably implemented rather than what its documentation claims. Once authenticated, the machine hands over a shell without any exploit development. Privilege escalation is a **classic Linux misconfiguration** in the sudo policy — visible immediately with `sudo -l` — and reinforces that the harder half of the box is really the front door.

For anyone working through PortSwigger Web Academy or the OSCP web module, Reactor is a good exercise in the *right cadence* for enumeration: candidate lists rather than firehoses, and one careful pass rather than three careless ones.

## Attack Path Overview

<ol class="attack-path">
  <li>Recon surfaces a small attack surface with a login-gated web application.</li>
  <li>Analysis of the login flow reveals behavioural differences that leak state to an unauthenticated observer.</li>
  <li>A targeted, rate-controlled candidate list produces valid credentials for an application user.</li>
  <li>Authenticated exploration of the application surfaces a supported feature that resolves to an interactive shell.</li>
  <li>Standard local enumeration surfaces a familiar Linux misconfiguration that resolves to root.</li>
</ol>

## What This Box Teaches

- **Rate-limit by user, not by IP.** The single most common authentication-hygiene failure in modern web apps.
- **Return identical response times on valid and invalid usernames.** Timing differences are an enumeration primitive.
- **Never let a login page confirm the existence of an account.** Every distinguishable "user not found" is an attacker's first lookup.

## References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [PortSwigger Web Academy — authentication](https://portswigger.net/web-security/authentication)
- [OWASP Top 10 A07 — Identification and Authentication Failures](https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/)

> **Compliance note.** This summary is spoiler-safe and describes only the *class* of vulnerabilities and techniques exercised. The full walkthrough — with commands, payloads, and defensive detections — will publish here the moment HTB officially retires Reactor.
