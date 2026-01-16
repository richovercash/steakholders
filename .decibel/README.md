# Steakholders - Decibel Configuration

This directory contains the Decibel ecosystem configuration for the Steakholders project.

## Structure

```
.decibel/
├── manifest.yaml      # Project definition, domains, tech stack
├── invariants.yaml    # Hard rules that must never be violated
├── components.yaml    # System components with lifecycle status
├── protocols/         # Best practices and workflow documentation
│   ├── auth_flow_v1.md
│   ├── order_workflow_v1.md
│   ├── cutsheet_builder_v1.md
│   ├── scheduling_v1.md
│   ├── org_management_v1.md
│   └── messaging_v1.md
├── decisions/         # Architecture Decision Records (ADRs)
│   ├── 001-initial-tech-stack.md
│   └── 002-multi-tenant-architecture.md
├── designer/          # Design decisions (auto-generated)
├── architect/         # Architecture records (auto-generated)
└── sentinel/          # Issues and epics (auto-generated)
    ├── issues/
    └── epics/
```

## Using with Decibel Tools MCP

This configuration is designed to work with the [decibel-tools-mcp](../../decibel-tools-mcp) server.

### Available Tools

| Tool | Purpose |
|------|---------|
| `designer.record_design_decision` | Record UI/UX decisions |
| `architect.record_arch_decision` | Create new ADRs |
| `sentinel.log_epic` | Create feature epics |
| `sentinel.create_issue` | Track bugs and tasks |
| `oracle.next_actions` | Get prioritized recommendations |

### Environment Setup

```bash
export DECIBEL_MCP_ROOT=/path/to/steakholders/.decibel
```

### MCP Configuration

Add to your `mcp.json`:

```json
{
  "mcpServers": {
    "decibel-tools": {
      "command": "node",
      "args": ["/path/to/decibel-tools-mcp/dist/server.js"],
      "env": {
        "DECIBEL_MCP_ROOT": "/path/to/steakholders/.decibel"
      }
    }
  }
}
```

## Domains

| Domain | Status | Description |
|--------|--------|-------------|
| auth | protected | Authentication & authorization |
| organizations | protected | Multi-tenant org management |
| livestock | normal | Animal tracking |
| scheduling | protected | Calendar & booking |
| orders | protected | Processing order workflow |
| cutsheets | normal | Cut sheet builder |
| messaging | normal | Real-time communication |
| notifications | normal | Email & in-app alerts |
| discovery | normal | Processor search |

## Quick Reference

### Critical Invariants

1. **RLS Required**: All tables must have Row-Level Security enabled
2. **Org Isolation**: Users can only access their organization's data
3. **No Client Secrets**: Service role keys never exposed to frontend
4. **Dual Visibility**: Orders visible to both producer AND processor

### Component Status Legend

- `planned` - Defined but not implemented
- `wired` - Implemented but not integrated
- `live` - Fully deployed and operational
- `deprecated` - Scheduled for removal

## Contributing

When making architectural decisions:

1. Check relevant protocols in `protocols/`
2. Verify no invariants are violated (`invariants.yaml`)
3. Update component status in `components.yaml`
4. Create ADR in `decisions/` for significant changes
