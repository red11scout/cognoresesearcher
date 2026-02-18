# CognoResearcher — Enhanced AI Strategic Assessment Platform

## Overview
Enhanced version of ResearchApp with 4 major improvements:
1. **Deterministic Calculation Engine** — HyperFormula + what-if scenarios
2. **12 Agentic Design Patterns** — expanded from 8, with E.P.O.C.H. framework
3. **Workflow Comparisons** — Miro-style current vs AI-powered visualization
4. **User-Added Data** — Custom themes, friction points, and use cases

## Stack
- React 19, Vite 7, TypeScript 5.6, Express 4, Drizzle ORM, PostgreSQL (Neon)
- Tailwind CSS v4, Recharts (charts), D3 (quadrant bubble chart), Framer Motion (animations)
- Anthropic Claude SDK, HyperFormula v3.1.1 (calculations)
- Export: exceljs, jspdf, docx, @react-pdf/renderer

## Commands
- `npm run dev` — Start dev server (Express + Vite)
- `npm run build` — Production build
- `npm run check` — TypeScript type check
- `npm run db:push` — Push schema to Neon via drizzle-kit
- `npx vitest run` — Run tests

## Path Aliases
- `@/` → `client/src/`
- `@shared/` → `shared/`
- `@db` → `server/db.ts`

## Architecture
- 8-step AI analysis pipeline (steps 0-7 in analysisData.steps)
- Data flow: Report → postProcessAnalysis() → mapReportToDashboardData() → Dashboard component
- Two rendering paths: DashboardPage (live data), SharedDashboard (shared links)
- Schema: `shared/schema.ts` (reports, sharedDashboards, whatIfScenarios, customData, etc.)

## Key Files
- `server/calculation-postprocessor.ts` — Central post-processing: friction costs, benefits, readiness, priority, pattern normalization
- `server/ai-service.ts` — AI prompts and Claude API calls (Step 4 includes pattern recommendations + E.P.O.C.H.)
- `server/scenario-store.ts` — CRUD for what-if scenarios
- `server/custom-data-store.ts` — CRUD for user-added custom data
- `server/workflow-generator.ts` — Agentic pattern scoring and workflow generation (12 patterns)
- `server/workflow-templates.ts` — Workflow templates for all 12 patterns
- `shared/agenticPatterns.ts` — Full 12-pattern catalog (AgenticPatternDefinition interface)
- `shared/schema.ts` — DB schema, types, AGENTIC_PATTERNS, LEGACY_PATTERN_MAP, resolvePatternName()
- `shared/taxonomy.ts` — Column ordering, function normalization, formula annotation
- `shared/standardizedRoles.ts` — 25 standardized roles with loaded hourly rates ($45-$175/hr)
- `src/calc/formulas.ts` — Deterministic formula registry
- `client/src/lib/calculationEngine.ts` — HyperFormula wrapper with multi-sheet, scenario, audit trail
- `client/src/components/Dashboard.tsx` — Main dashboard
- `client/src/components/WorkflowComparison.tsx` — Side-by-side Miro-style workflow comparison
- `client/src/components/CustomDataEditor.tsx` — Tabbed editor for custom themes/friction/use cases
- `client/src/pages/WorkflowComparisons.tsx` — Workflow gallery page with filters
- `client/src/lib/dashboardMapper.ts` — Transforms raw report data into DashboardData

## 12 Agentic Design Patterns
Single-agent: Reflection, Tool Use, Planning, ReAct Loop, Prompt Chaining, Semantic Router, Constitutional Guardrail
Multi-agent: Orchestrator-Workers, Agent Handoff, Parallelization, Generator-Critic, Group Chat/Swarm

Legacy mapping: Drafter-Critic → Generator-Critic, RAG Detective → Tool Use, Memetic Agent → Reflection
Human-in-the-Loop → cross-cutting flag on any pattern (not standalone)

## E.P.O.C.H. Framework
Flags use cases requiring human oversight:
- **E**thical — hiring, legal, bias risks
- **P**olitical — corporate strategy, crisis communications
- **O**perational — edge cases, safety risks
- **C**reative — marketing, product design
- **H**uman-centric — coaching, medical, high-touch sales

## Scoring System (1-10 Scale)
### Readiness Score (Step 6)
- Organizational Capacity (30%), Data Quality (30%), Tech Infrastructure (20%), AI Governance (20%)

### Priority Score (Step 7)
- Formula: `(Readiness × 0.5) + (Normalized Value × 0.5)`
- Tiers: Champions (≥7.5), Quick Wins, Strategic, Foundation (<5.0)

## Benefit Formulas (Step 5)
- **Cost**: Hours Saved × Loaded Rate × Benefits Loading × Adoption × DataMaturity
- **Revenue**: Uplift % × Revenue at Risk × Realization × DataMaturity
- **Cash Flow**: Annual Revenue × (Days/365) × Cost of Capital × Realization
- **Risk**: Risk Reduction % × Exposure × Realization × DataMaturity

## Pattern Token Multipliers
Semantic Router: 1.1x, Prompt Chaining: 1.2x, Tool Use: 1.3x, Planning: 1.4x, Reflection: 1.5x,
Constitutional Guardrail: 1.6x, ReAct Loop: 2.0x, Generator-Critic: 2.0x, Agent Handoff: 2.5x,
Orchestrator-Workers: 3.0x, Parallelization: 3.5x, Group Chat: 4.0x

## Brand Colors
```
Navy: #001278   Blue: #02a2fd   Green: #36bf78
primary: '#0339AF'  accent: '#4C73E9'  success: '#059669'
```

## Patterns
- `apiRequest(method, url, data?)` — method is FIRST parameter
- Optional fields with defaults for backward compat
- Role normalization runs BEFORE friction cost calculation
- Pattern normalization runs AFTER Step 4 normalization in postProcessAnalysis()
- `.returning()` on Drizzle inserts for verification

## Database
- Neon PostgreSQL via `@neondatabase/serverless`
- Env: `DATABASE_URL`
- Tables: reports, sharedDashboards, whatIfScenarios, customData, userSessions, userEdits, assumptionSets, assumptionFields, formulaConfigs, bulkUpdateJobs, bulkExports, batchResearchJobs

## GitHub
- Repo: `red11scout/cognoresesearcher`
