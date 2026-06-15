# Hatiwal — FlowApp Kanban Board

Project management for Hatiwal lives on MultiMagics FlowApp.

## Board

| Field | Value |
|---|---|
| **Project ID** | 5 |
| **Project name** | Hatiwal |
| **Platform** | www.multimagics.com |
| **Board URL** | www.multimagics.com (open FlowApp → Hatiwal) |

## Sprints

| ID | Sprint | Status | Goal |
|---|---|---|---|
| 2 | MVP Core | **active** | All core marketplace features shipped and working |
| 3 | Polish | planning | Animation system, design refinements, micro-interactions |
| 4 | Pre-Deployment | planning | Mobile compatibility audit, real device testing |
| 5 | Infrastructure | planning | Agent coordination, work isolation, concurrency |
| 6 | Testing | planning | CI pipeline, Jest, Maestro E2E, Storybook |

## Columns

| ID | Column | Meaning |
|---|---|---|
| 26 | Backlog | Not started |
| 27 | To Do | Ready to pick up |
| 28 | In Progress | Being worked on |
| 29 | Stuck | Blocked |
| 30 | Review | In review / polish |
| 31 | Done | Shipped |

## Cards on the board

| Card | Sprint | Column |
|---|---|---|
| A1 — Login | MVP Core | Done |
| A2 — Register | MVP Core | Done |
| A3 — App bootstrap / splash redirect | MVP Core | Done |
| A4 — Guest browsing | MVP Core | Done |
| S0 — Shared Components | MVP Core | Done |
| B1 — Browse feed | MVP Core | Done |
| B2 — Listing detail | MVP Core | Done |
| B3 — Search & category filter | MVP Core | Done |
| B4 — Saved searches / filter history | MVP Core | Done |
| B5 — Map location & distance search | MVP Core | Done |
| B6 — Seen / already viewed indicator | MVP Core | Done |
| B7 — Item condition | MVP Core | Done |
| C1 — Create / Edit listing | MVP Core | Done |
| C2 — My Listings + lifecycle | MVP Core | Done |
| C3 — Expiry visibility | MVP Core | Done |
| D1 — Conversations list | MVP Core | Done |
| D2 — Conversation thread | MVP Core | Done |
| D3 — Chat deal actions (offers + meetup) | MVP Core | Done |
| E1 — Saved / Favorites | MVP Core | Done |
| F1 — Profile (mine) | MVP Core | Done |
| F2 — Edit profile | MVP Core | Done |
| F3 — Public seller profile | MVP Core | Done |
| G1 — Report listing / user | MVP Core | Done |
| P1 — Animation System | Polish | Backlog |
| P2 — Design System Refinements | Polish | Backlog |
| P3 — Screen-by-Screen Polish | Polish | Backlog |
| P4 — Micro-interactions | Polish | Backlog |
| P5 — Performance & Accessibility | Polish | Backlog |
| Q0 — Pre-Deployment Mobile Audit | Pre-Deployment | Backlog |
| Q1 — Web APIs & Browser Compatibility | Pre-Deployment | Backlog |
| Q2 — Web-Only Dependencies | Pre-Deployment | Backlog |
| Q3 — Platform-Specific Code | Pre-Deployment | Backlog |
| Q4 — Build & Configuration | Pre-Deployment | Backlog |
| Q5 — Testing on Real Devices | Pre-Deployment | Backlog |
| R0 — Agent Coordination | Infrastructure | Backlog |
| R1 — Work Isolation & Locking System | Infrastructure | Backlog |
| R2 — Task Dependency Tracking | Infrastructure | Backlog |
| R3 — Merge Conflict Prevention | Infrastructure | Backlog |
| R4 — Real-Time Status Tracking | Infrastructure | Backlog |
| R5 — Session Isolation (Worktree Strategy) | Infrastructure | Backlog |
| R6 — Communication & Handoff Protocol | Infrastructure | Backlog |
| CI — Jest unit tests (GitHub Actions) | Testing | Done |
| CI — Android E2E Maestro (GitHub Actions) | Testing | Backlog |
| Jest unit tests — API layer (142 tests) | Testing | Done |
| Jest unit tests — Components (10 suites) | Testing | Done |
| Maestro E2E flows (151 flows) | Testing | Done |
| Storybook visual stories (18 stories) | Testing | Done |

## Rules for agents

- When you start a card → move it to **In Progress** via the FlowApp API
- When you finish a card → move it to **Done**
- When you're blocked → move it to **Stuck** and add a comment explaining why
- **Never** move a card to Done without tests (see `docs/TESTING.md`)

## API (for agents)

```bash
# Move a card to In Progress (col 28)
curl -X PUT "https://www.multimagics.com/api/v1/flow_app/projects/5/cards/<card_id>/move" \
  -H "X-API-Key: $FLOWAPP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"card": {"flow_app_column_id": 28}}'

# Move a card to Done (col 31)
curl -X PUT "https://www.multimagics.com/api/v1/flow_app/projects/5/cards/<card_id>/move" \
  -H "X-API-Key: $FLOWAPP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"card": {"flow_app_column_id": 31}}'

# Add a comment
curl -X POST "https://www.multimagics.com/api/v1/flow_app/projects/5/cards/<card_id>/comments" \
  -H "X-API-Key: $FLOWAPP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"comment": {"content": "your note here"}}'
```

Store your API key as `FLOWAPP_API_KEY` in your environment.
