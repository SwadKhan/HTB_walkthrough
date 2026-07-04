---
title: "Pirate"
machine: "Pirate"
status: active
os: Windows
difficulty: Hard
ownedUser: true
ownedRoot: true
date: 2026-03-05
techniques:
  - "Advanced Active Directory"
  - "Kerberos abuse"
  - "AD Certificate Services"
  - "Delegation abuse"
  - "Custom .NET tooling"
  - "Operational discipline"
cves: []
summary: "Hard Windows box built around a layered Active Directory environment. Long attack chain that rewards patience, careful graph analysis, and the maturity to recognise which findings deserve immediate action."
proof: "/proof/pirate.png"
draft: false
---

## Machine Summary

Pirate is a **Hard Windows box** built around a layered Active Directory environment, and it is one of the more honest tests HTB has produced of what a real enterprise engagement actually looks like. Nothing here is trivial. The point of the box is to teach patience across a long chain, and the maturity to distinguish "this finding is the next step" from "this finding is a distraction I need to write down and come back to." The best operators on Pirate spend the first two hours drawing an identity graph and the next hour executing three carefully chosen steps against it.

The foothold comes from **standard AD misconfiguration primitives** rather than an exotic vulnerability. Lateral movement follows the identity graph — service accounts, ticket lifetimes, delegation configuration — and rewards the operator who reads BloodHound as a map rather than a slot machine. The middle of the chain exploits an **AD Certificate Services misconfiguration** of the sort catalogued in SpecterOps' ESC1–ESC8 research, which has quietly become the most attackable subsystem in every mature domain. The final escalation abuses a **Kerberos delegation issue** that only becomes visible once the identity map is complete. There is a real reason the intended solution takes six or seven hours: the graph is genuinely dense, and the operational discipline required to move through it without triggering the obvious detections is genuinely nontrivial.

For anyone preparing for CRTO II, OSEP, or CRTM, Pirate is the closest HTB comes to a real engagement — including the humbling reminder that AD attack surface is measured in relationships, not vulnerabilities.

## Attack Path Overview

<ol class="attack-path">
  <li>Recon confirms a multi-host Active Directory environment with the standard AD ports and a hint of AD Certificate Services in play.</li>
  <li>Standard AD enumeration surfaces a foothold identity through common misconfiguration primitives — no exotic exploit required.</li>
  <li>Post-enumeration surfaces service accounts whose tickets can be redeemed with material weaker than the environment intended.</li>
  <li>Graph analysis in BloodHound reveals a path that crosses the environment's tiering boundary through a legitimate delegation relationship.</li>
  <li>AD Certificate Services turns out to be misconfigured along one of the well-known ESC lines, and enrolling for a certificate under an existing identity produces credentials for a higher-tier account.</li>
  <li>Final escalation exploits a Kerberos delegation issue that only becomes visible after the identity map is complete, and yields Domain Administrator on the forest root.</li>
</ol>

## What This Box Teaches

- **Tiering fails to details.** A single misconfigured service account or delegation attribute can compress an entire environment into one tier.
- **AD Certificate Services is often the single most attackable system on a mature domain.** Audit it monthly, not annually.
- **Operational discipline is a skill.** On Pirate, the operator who moves without cleaning up loses; the one who plans wins.

## References

- [SpecterOps — Certified Pre-Owned (AD CS)](https://posts.specterops.io/certified-pre-owned-d95910965cd2)
- [SpecterOps — ADCS ESC9 and ESC10](https://research.ifcr.dk/certipy-4-0-esc9-esc10-bloodhound-gui-new-authentication-and-request-methods-and-more-7237d88061f7)
- [The Hacker Recipes — Delegation abuse](https://www.thehacker.recipes/ad/movement/kerberos/delegations)
- [Rubeus documentation](https://github.com/GhostPack/Rubeus)
- [Certipy documentation](https://github.com/ly4k/Certipy)

> **Compliance note.** This summary is spoiler-safe and describes only the *class* of vulnerabilities and techniques exercised. The full walkthrough — with commands, payloads, and defensive detections — will publish here the moment HTB officially retires Pirate.
