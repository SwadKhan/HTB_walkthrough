---
title: "Checkpoint"
machine: "Checkpoint"
status: active
os: Windows
difficulty: Medium
ownedUser: true
ownedRoot: true
date: 2026-06-14
techniques:
  - "Active Directory enum"
  - "Kerberos abuse"
  - "SPN reasoning"
  - "Delegated authentication"
  - "Windows privesc"
cves: []
summary: "Medium Windows AD box centred on identity primitives — service accounts, service tickets, delegated authentication. Rewards careful graph work over exploit hunting."
proof: "/proof/checkpoint.png"
draft: false
---

## Machine Summary

Checkpoint is a **Medium Windows box** that trains the reflexes an operator needs on a real internal engagement: the mental model of *who trusts whom* in an Active Directory environment, and the discipline to translate that graph into a working attack. There is no glamorous CVE here — every step comes from an intentional misconfiguration that is common in mature domains but invisible to naive enumeration. The box rewards patience, structured note-taking, and the habit of asking "what does this account's right mean in practice?" before firing anything.

The foothold hinges on **Kerberos primitives** rather than web vulnerabilities. Enumerating service principal names surfaces a service whose ticket-granting posture is weaker than the environment intended, and standard offline processing recovers usable credentials. Lateral movement follows the identity graph rather than the network graph — a hallmark of good AD boxes — while privilege escalation exploits the environment's imperfect tiering model: a delegated authentication path that lets an operator inherit rights they should never have held.

Checkpoint is an excellent primer for the **BloodHound + Rubeus + certipy** loop that dominates modern AD engagements, and its lessons transfer directly to the kinds of environments taught in Zero-Point Security's CRTO and SpecterOps' "Certified Pre-Owned" line of research.

## Attack Path Overview

<ol class="attack-path">
  <li>Recon confirms a Domain Controller; standard AD ports and default protocols are present.</li>
  <li>Enumeration of service principal names surfaces a service whose ticket posture is weaker than the environment intended.</li>
  <li>Offline processing of the resulting material recovers usable credentials.</li>
  <li>The recovered account has a small but useful set of rights that unlock further enumeration inside the domain.</li>
  <li>Graph analysis reveals a delegated authentication path that crosses the environment's intended tiering boundary.</li>
  <li>Redeeming that path yields a ticket with elevated rights and, ultimately, Domain Administrator.</li>
</ol>

## What This Box Teaches

- **Enumerate SPNs first, always.** Every meaningful AD compromise starts by understanding what services live in the domain and what identities own them.
- **Kerberos is a graph, not a checklist.** BloodHound Cypher queries beat memorised technique names — this box rewards the operator who can build a custom query on the fly.
- **Tiering is one delegation setting away from collapsing.** A single `TrustedToAuthForDelegation` or `msDS-AllowedToDelegateTo` value can turn a low-tier account into an implicit Tier-0 asset.

## References

- [The Hacker Recipes — Active Directory chapter](https://www.thehacker.recipes/ad/movement/kerberos)
- [SpecterOps — Certified Pre-Owned (AD CS)](https://posts.specterops.io/certified-pre-owned-d95910965cd2)
- [BloodHound documentation](https://bloodhound.readthedocs.io/en/latest/)
- [MITRE ATT&CK T1558 — Steal or Forge Kerberos Tickets](https://attack.mitre.org/techniques/T1558/)

> **Compliance note.** This summary is spoiler-safe and describes only the *class* of vulnerabilities and techniques exercised. The full walkthrough — with commands, payloads, and defensive detections — will publish here the moment HTB officially retires Checkpoint.
