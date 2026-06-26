# Test Spec: persona plugins

## Unit Tests
- `buildEffectiveInstructions` keeps default persona silent.
- `buildEffectiveInstructions` injects selected persona title, role, and directives.
- `sanitizeSettings` falls back to the default persona when persisted localStorage data has an unknown persona id.

## Type/Lint
- Run `pnpm exec tsc --noEmit`.
- Run `pnpm exec eslint` or a focused lint command when full lint is too noisy.

## Manual Review
- Check changed UI code for stable layout and accessibility:
  - persona choices are buttons with `aria-pressed`;
  - active persona is visible;
  - no nested card-heavy layout beyond existing Settings sections.

## Stop Condition
- Implementation compiles, focused tests pass, and review finds no blocking issue.
