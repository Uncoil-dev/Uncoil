# Internal Plane workspace

This runbook is for the private Plane instance used by the Uncoil team. Plane is an internal project-management tool, not an Uncoil customer feature or native integration.

## Target deployment

- Dedicated VPS running a current LTS Linux release
- Plane's pinned Docker Compose release from <https://developers.plane.so/>
- Hostname: `plane.uncoil.dev`
- Cloudflare Tunnel plus Access with MFA, restricted to approved identities
- Persistent Plane, PostgreSQL, Redis, and file/object-storage services
- Encrypted off-host backups with tested restoration

Do not place Plane on Vercel or reuse Uncoil production credentials, databases, Convex, Tinybird, or Redis. Use an outbound Cloudflare Tunnel so the VPS does not need public HTTP or HTTPS ingress.

## Provisioning checklist

1. Create a dedicated VPS and non-root deployment user.
2. Install Docker Engine and the Compose plugin from vendor-supported packages.
3. Enable SSH keys, disable password authentication, and restrict SSH to a trusted IP range or private tailnet.
4. Enable the host firewall with SSH access only; Cloudflare Tunnel uses outbound connectivity.
5. Apply unattended security updates and intrusion protection.
6. Follow Plane's current Docker Compose guide at <https://developers.plane.so/self-hosting/methods/docker-compose>.
7. For the current commercial/free-plan installer, run `curl -fsSL https://prime.plane.so/install/ | sh -` as a controlled administrative action; choose Advanced configuration and pin the selected release.
8. If using Community Edition instead, download the pinned release setup script from Plane's official GitHub release and run it from a private deployment directory.
9. Generate unique secrets and configure persistent volumes, external database/storage where available, and SMTP before inviting users.
10. Create a named Cloudflare Tunnel and publish `plane.uncoil.dev` to Plane's local HTTP service, normally `http://localhost:80` or the configured local port.
11. Add a Cloudflare Access self-hosted application for `plane.uncoil.dev`; allow only your identity and require MFA.
12. Confirm database and upload backups before migrating planning data.

Never commit Compose environment files, generated secrets, SMTP credentials, Cloudflare tokens, or backup credentials to this repository.

## Cloudflare setup

In Cloudflare Zero Trust:

1. Create a named tunnel under **Networks → Tunnels**.
2. Install `cloudflared` on the Plane VPS, or run it as a separate container on the same private Docker network.
3. Add a published application route with hostname `plane.uncoil.dev` and service URL `http://plane-web:80` when using the Plane Compose network. If the service name differs, use the local Plane HTTP port instead.
4. Create a **Self-hosted** Access application for `plane.uncoil.dev`.
5. Add an **Allow** policy containing only your email address. Require MFA through the configured identity provider; if using OTP, restrict it to an explicit email address or domain.
6. Confirm the tunnel is connected, then test access in a private browser session.

The VPS should permit outbound tunnel connectivity and SSH administration only. Cloudflare documents that Tunnel publishes a local service through an outbound connection without requiring public inbound HTTP/HTTPS ports: <https://developers.cloudflare.com/tunnel/setup/>.

## Internal workspace

Create a private Uncoil workspace with projects for Product roadmap, Engineering, Customer and commercial operations, Content and marketing, and Infrastructure and reliability.

Use labels `P0`, `P1`, `bug`, `feature`, `content`, `infrastructure`, `security`, `customer`, and `blocked`. Start cycles for Plane deployment and hardening, Uncoil roadmap migration, release foundation, and customer workflow follow-ups.

Migrate only active and durable work. Keep historical notes in repository history and internal operating records instead of bulk-importing completed task-file history.

## Backup and go-live checks

- Nightly PostgreSQL and upload/object-storage backups complete to an off-host encrypted destination.
- Multiple restore points are retained and an isolated restore succeeds.
- Monitoring covers disk capacity, container health, backup success, TLS expiry, and VPS availability.
- `https://plane.uncoil.dev` resolves through the Cloudflare Tunnel; no VPS HTTP/HTTPS port is publicly reachable.
- Unauthenticated requests are denied by Cloudflare Access; MFA-protected access reaches Plane.
- PostgreSQL, Redis, workers, uploads, and Plane services survive a restart.
- Invitations, login, projects, work items, cycles, attachments, SMTP delivery, and password recovery are tested.
