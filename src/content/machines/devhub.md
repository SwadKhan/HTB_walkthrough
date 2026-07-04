---
title: "DevHub"
machine: "DevHub"
status: active
os: Linux
difficulty: Medium
ownedUser: true
ownedRoot: true
date: 2026-06-01
techniques:
  - "DevOps / CI-CD"
  - "Self-hosted platform enum"
  - "Bot token abuse"
  - "Container awareness"
  - "Capability abuse"
cves: []
summary: "Medium Linux box built around a modern developer-tooling stack. The perimeter is well-defended; the internal supply chain — CI runners, artifact caches, bot tokens — is generous."
proof: "/proof/devhub.png"
draft: false
---

## Machine Summary

DevHub is a **Medium Linux box** that models the exact attack surface that every mid-sized engineering organisation is running in production: a self-hosted developer platform (source hosting, issue tracking, CI/CD runners, artifact storage) that has been hardened at the perimeter and forgotten on the inside. The perimeter is genuinely well-defended — you cannot brute-force your way in — but the internal supply chain is generous, and the box makes you earn the lesson that pipelines are production.

The foothold comes from **an unauthenticated endpoint on the developer platform** that was intended to be internal, and from careful reading of what a well-behaved CI system exposes to any authenticated user. From that position, the operator has to reason about *what a bot user or service account can reach* — a very different question from what a human developer can reach — and turn a modest read primitive into a working credential. Post-exploitation walks through the pipeline the way a real developer would walk through it, ending in a build environment whose runtime happens to inherit more from the host than the platform's operators intended. Privilege escalation is **a container-adjacent misconfiguration** in the runner, not a kernel exploit.

For anyone working through DevOps-focused offensive material — HackTheBox's own Advanced Cloud track, or the CNAPP-adjacent research from Wiz and Datadog — DevHub is a good exercise in the "supply chain as attack surface" mindset.

## Attack Path Overview

<ol class="attack-path">
  <li>Recon confirms a modern developer-tooling stack behind an nginx front-end; the platform's public surface is limited and well-versioned.</li>
  <li>An endpoint intended for internal use is reachable without authentication and leaks material sufficient to enumerate the platform's identities.</li>
  <li>Careful reading of what the platform exposes to authenticated users surfaces a token or artifact whose scope is broader than the platform's operators intended.</li>
  <li>The recovered material grants access to a build environment executing on behalf of a bot identity.</li>
  <li>Post-exploitation of the build environment reveals a runner whose runtime posture inherits more from the host than intended.</li>
  <li>A container-adjacent misconfiguration resolves that inheritance into interactive root on the host.</li>
</ol>

## What This Box Teaches

- **CI runners are production.** Any credential a runner can reach is a credential an attacker can reach — treat runner secrets with the same care as production secrets.
- **Bot tokens should be short-lived and narrowly scoped.** Personal Access Tokens with broad scopes are the default failure mode of every self-hosted developer platform.
- **Container isolation is a spectrum, not a boundary.** A runner with unnecessary Linux capabilities, a docker socket mount, or a privileged flag is one step from root on the host.

## References

- [OWASP CI/CD Top 10](https://owasp.org/www-project-top-10-ci-cd-security-risks/)
- [Wiz — CI/CD security research](https://www.wiz.io/blog)
- [Trail of Bits — self-hosted runner risks](https://blog.trailofbits.com/)
- [MITRE ATT&CK T1195 — Supply Chain Compromise](https://attack.mitre.org/techniques/T1195/)

> **Compliance note.** This summary is spoiler-safe and describes only the *class* of vulnerabilities and techniques exercised. The full walkthrough — with commands, payloads, and defensive detections — will publish here the moment HTB officially retires DevHub.
