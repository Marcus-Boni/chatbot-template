# Context: persona plugins

Task statement:
- Implement agent personas such as PM, Dev, and CEO in the Marca Chatbot project.

Desired outcome:
- Users can choose a persona from settings.
- The selected persona behaves like a lightweight plugin: declarative metadata plus prompt directives.
- The chat visibly reflects the active persona and uses it when composing CopilotKit instructions.

Known facts/evidence:
- Runtime preferences already live under `src/components/settings`.
- `buildEffectiveInstructions` is the existing prompt composition boundary.
- `ChatPanel` currently passes `appConfig.systemPrompt` directly to CopilotKit.
- The project is Next.js/React with TypeScript and Vitest.

Constraints:
- Do not add dependencies.
- Preserve grounding, search, citation, and Azure DevOps proposal rules.
- Keep changes small and reversible.
- Work with existing uncommitted settings/chat changes without reverting them.

Unknowns/open questions:
- Whether the backend CopilotKit `BuiltInAgent.prompt` can receive per-user client settings. Current available boundary is client-side `instructions`.

Likely touchpoints:
- `src/components/settings/personas.ts`
- `src/components/settings/types.ts`
- `src/components/settings/SettingsContext.tsx`
- `src/components/settings/instructions.ts`
- `src/components/settings/SettingsView.tsx`
- `src/components/chat/ChatPanel.tsx`
