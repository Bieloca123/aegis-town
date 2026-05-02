# Aegis City

Project-level instructions for Claude Code sessions in this repo.

## What this is

`Aegis City` is the codebase for **Aegis Athena** — the in-house tool that **Athena Growth Marketing** (Brazilian marketing agency) is building to **replace Gather**. Today the repo holds a working spatial collaboration app (multiplayer rooms, tile-based movement, optional proximity video). The roadmap layers an agent system ("Aegis") and the agency's operational integrations on top.

- **Owner:** Gabriel — speaks EN with Claude.
- **Team & clients:** speak PT-BR.
- **Agency:** Athena Growth Marketing.

## Architecture

```
aegis-city/
├── frontend/   # Next.js (App Router), Tailwind, Pixi.js scene, Agora client, Socket.io client
├── backend/    # Express + Socket.io server, Supabase realtime subscriptions
├── package.json    # root convenience scripts using `concurrently`
└── Procfile        # Heroku-style deploy
```

- **Runtime:** Node.js 20+ (tested on 22.x), npm 10+.
- **Auth & data:** Supabase (`realms` table is referenced by the backend realtime subscription).
- **Video:** Agora — optional, leave keys blank to disable.
- **Env files:** `frontend/.env.local` (copy from `.example`), `backend/.env` (copy from `.example`). See README.md for the full key list.

## Common commands

| Command | What it does |
|---|---|
| `npm run install:all` | Installs deps in both `frontend/` and `backend/` |
| `npm run dev` | Starts frontend (`:3000`) and backend (`:3001`) concurrently |
| `npm run build` | Builds frontend (`next build`) and backend (`tsc → backend/dist`) |
| `npm run start` | Starts both in production mode |
| `npm --prefix frontend run <script>` | Run a specific frontend script |
| `npm --prefix backend run <script>` | Run a specific backend script |

## Language conventions

- **EN** — code, identifiers, comments, commit messages, internal docs (this file, READMEs, plan files).
- **PT-BR** — anything user-facing for the agency: WhatsApp drafts (Z-API), client emails, n8n workflow names/descriptions intended for the team, ClickUp task titles, GHL blog posts, sales/support copy.
- When in doubt about audience, ask Gabriel.

## Agency operational context

- **Clients live as GoHighLevel sub-accounts.** Examples: `grand-vista`, `athena`. When a workflow references a client, expect a GHL location id / sub-account name.
- **Two GHL MCP namespaces are wired up:**
  - `mcp__athena__*` — agency's own GHL workspace
  - `mcp__snapshot-call-center__*` — call-center / snapshot workspace (same surface area, different tenant)

## Integrations available via MCP

| Concern | Tool | MCP server (prefix) |
|---|---|---|
| Automation | n8n | `mcp__claude_ai_n8n__*` |
| CRM | GoHighLevel | `mcp__athena__*`, `mcp__snapshot-call-center__*` |
| Meetings | Fathom | `mcp__claude_ai_Fathom__*` |
| Email | Gmail | `mcp__claude_ai_Gmail__*` |
| Calendar | Google Calendar | `mcp__claude_ai_Google_Calendar__*` |
| Files | Google Drive | `mcp__claude_ai_Google_Drive__*` |
| Billing | Stripe | `mcp__claude_ai_Stripe__*` |
| Ads (Meta) | Meta Ads | `mcp__meta-ads__*`, `mcp__claude_ai_Meta_Athena__*` |
| Browser automation | Playwright | `mcp__playwright__*` |

**Not on MCP yet (manual or off-Claude):**
- ClickUp (project management)
- Z-API (WhatsApp messaging)
- Reportei (reporting)

When designing a workflow, prefer routing through n8n if the destination tool doesn't have a direct MCP — n8n is the agency's automation/OAuth hub.

## Aegis harness conventions

- `.claude/settings.json` — shared, committed harness config (permissions, env, hooks).
- `.claude/settings.local.json` — personal/env-specific overrides (gitignored).
- `.claude/agents/` — project subagent definitions (`<name>.md` with frontmatter).
- `.claude/skills/` — project skills.
- Long-term memory lives outside the repo at `~/.claude/projects/-Users-athenagrowthmarketing-Desktop-Aegis-City/memory/`.

## Working defaults

- **Permissions are conservative.** Read-only MCP tools are allowlisted; writes (send Gmail, create GHL contact, run n8n workflow, etc.) prompt every time. Promote individual write tools only after Gabriel signs off on the workflow that uses them.
- **No commits without explicit ask.** Even in auto mode.
- **Don't touch `frontend/` or `backend/` for harness/agent work.** Those are the spatial app; harness changes belong in `.claude/` or repo-root config.
