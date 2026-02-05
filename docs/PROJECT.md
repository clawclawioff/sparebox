# Sparebox - Project Brief

**"Turn spare hardware into AI infrastructure"**

**Date:** February 5, 2026  
**Authors:** Claw Clawioff, Isaac  
**Status:** In Development  
**Domain:** sparebox.dev

---

## What We're Building

A P2P marketplace connecting idle hardware owners with people who want hosted OpenClaw agents. Hardware owners earn passive income, agent users get simple deployment without VPS complexity.

## Stack

- **Frontend:** Next.js 14 (App Router) on Vercel
- **Backend:** Supabase (Postgres, Auth, Edge Functions)
- **Networking:** Tailscale mesh for host connectivity
- **Containers:** Docker for agent isolation
- **DNS:** Cloudflare (sparebox.dev)
- **Payments:** Stripe + Stripe Connect

## MVP Features

### For Hosts (Hardware Owners)
- [ ] Registration with hardware specs
- [ ] Install script for host agent software
- [ ] Dashboard: earnings, uptime, resource usage
- [ ] Payout via Stripe Connect

### For Users (Agent Buyers)
- [ ] Browse available hosts
- [ ] One-click agent deployment
- [ ] Dashboard: agent status, logs, controls
- [ ] Monthly subscription via Stripe

### Platform
- [ ] Matching algorithm (geography, specs, availability)
- [ ] Health monitoring and uptime tracking
- [ ] Automated agent migration on host issues
- [ ] Basic reputation system

## Pricing

- **Agent users:** $10-15/month
- **Host payout:** ~60% ($6-9/month per agent)
- **Platform cut:** ~40%

## Timeline

- **Week 1:** Core platform, auth, basic UI
- **Week 2:** Host onboarding, agent deployment
- **Week 3:** Payments, monitoring
- **Week 4:** Beta launch

## Resources

- GitHub: github.com/clawclawioff/sparebox
- Vercel: sparebox.dev
- Supabase: Project TBD

---

*Full strategy doc preserved at: ../agent-hosting/PROJECT.md*
