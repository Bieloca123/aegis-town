# Project subagents

Drop subagent definition files here as `<name>.md` with YAML frontmatter (`name`, `description`, `tools`, optional `model`). They become available to Claude Code sessions opened in this repo.

Likely first inhabitants (not yet built):
- `client-pt-br-comms` — drafts WhatsApp / email replies in PT-BR for clients.
- `n8n-workflow-builder` — designs and validates n8n workflows via the n8n MCP.
- `meta-ads-analyst` — pulls insights across Meta Ads accounts and summarizes performance.
- `ghl-ops` — read/write GHL operations against the agency or snapshot tenants.
- `fathom-summarizer` — pulls Fathom transcripts and produces structured meeting notes.

Build one only when there's a real recurring task that benefits from a separate context.
