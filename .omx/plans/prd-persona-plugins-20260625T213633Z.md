# PRD: persona plugins

## Goal
Add a persona system that enriches the meeting copilot by letting the user switch the assistant operating lens without weakening factual grounding.

## User Experience
- In Settings, the user can choose one active persona.
- Personas are presented as plugin-like presets with name, icon, short description, and behavior summary.
- The chat header shows the active persona so the user knows which lens is being applied.
- Default behavior remains unchanged for existing users.

## Personas
- Padrao: neutral meeting copilot.
- PM: translates meeting evidence into scope, risks, decisions, owners, and next steps.
- Dev: reasons like an engineer, highlighting implementation impact, dependencies, blockers, and technical debt.
- CEO: summarizes executive impact, strategic tradeoffs, risks, cost, urgency, and decisions.
- Operacoes: focuses on logistics, process execution, responsibility, SLA, and operational impact.
- Comercial: focuses on customer impact, commitments, negotiation points, and follow-up opportunities.

## Functional Requirements
- Personas must be declared in one catalog so adding a new one is a plugin-style data change.
- Settings must persist the selected persona in localStorage and sanitize invalid values.
- Prompt composition must append persona directives after the base prompt while explicitly preserving grounding and citation rules.
- Suggested questions and other settings must continue working.

## Non-goals
- Do not create a dynamic plugin loader or marketplace.
- Do not change the backend database schema.
- Do not change the RAG tools or citation contract.

## Risks
- Client-side instructions might not override every backend model behavior depending on CopilotKit internals.
- Excessive persona text could bloat prompts; directives should stay concise.

## Acceptance Criteria
- TypeScript accepts the new settings model.
- Unit tests verify default persona behavior, selected persona prompt injection, and invalid persisted persona fallback.
- UI compiles with no lint errors from changed files.
