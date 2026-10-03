# Implementation Plan

- [ ] 1. Write bug condition exploration tests
  - **Property 1: Bug Condition** - TypeScript Compile Errors on Buggy Inputs
  - **CRITICAL**: Write these tests BEFORE implementing any fix — failure confirms each bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: These tests encode the expected behavior — they validate the fix when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate each of the four bugs
  - **Scoped PBT Approach**: Each bug is deterministic, so scope each property to the concrete failing case(s)
  - Bug 1 — verify `shared/package.json` with no `exports` field causes TS2307 on `@ocenoid/shared/network.js` import
  - Bug 2 — verify `client/tsconfig.json` without `"vite/client"` in `types` causes TS2339 on `import.meta.env`
  - Bug 3 — verify `onDown: (e: MouseEvent)` with `"mousedown"` listener accessing `e.pointerId` causes TS2339
  - Bug 4 — verify `ClientInput` literal missing `sequence` field causes a TypeScript type error in movement tests
  - Run `tsc --noEmit` (or equivalent per package) on UNFIXED code
  - **EXPECTED OUTCOME**: Compiler reports errors for all four cases (this is correct — it proves the bugs exist)
  - Document exact error codes and messages found (e.g., "TS2307 Cannot find module '@ocenoid/shared/network.js'")
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3 (Bug 1); 1.1, 1.2 (Bug 2); 1.1, 1.2, 1.3 (Bug 3); isBugCondition_4_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Unchanged Behaviour for Non-Buggy Inputs
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: `applyInput` in `movement.ts` produces correct results for valid, finite inputs
  - Observe: `applyInput` returns the unchanged player state when given non-finite inputs (NaN, Infinity)
  - Observe: diagonal input is normalised so speed does not exceed the movement cap (existing test passes)
  - Observe: the client renders and the server compiles cleanly for all non-buggy source paths
  - Write property-based tests covering: for all finite `forward` / `right` values, `applyInput` returns a finite player state
  - Write property-based tests covering: for all non-finite `forward` / `right` values, `applyInput` returns the original player state unchanged
  - Verify both existing `movement.test.ts` unit tests pass on UNFIXED code (they already pass after Bug 4 fix)
  - **EXPECTED OUTCOME**: Preservation tests PASS on unfixed code (confirms baseline behaviour)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2 (Bug 1); 3.1, 3.2 (Bug 2); 3.1, 3.2, 3.3 (Bug 3); Preservation of movement.test.ts behaviour (Bug 4)_

- [ ] 3. Fix all four TypeScript compile-time bugs

  - [ ] 3.1 Add `exports` field to `shared/package.json`
    - Map `"./network.js"` → `{ "types": "./dist/network.d.ts", "default": "./src/network.ts" }`
    - Enables NodeNext subpath resolution for `@ocenoid/shared/network.js` in server packages
    - _Bug_Condition: isBugCondition_1(X) where X.package = "@ocenoid/shared" AND NOT has_exports_field(X.packageJson)_
    - _Expected_Behavior: result.resolved = true AND result.errors = [] (expectedBehavior_1)_
    - _Preservation: workspace name @ocenoid/shared and the four exported types remain unchanged_
    - _Requirements: 2.1, 2.2, 2.3 (Bug 1); 3.1, 3.2 (Bug 1)_

  - [ ] 3.2 Add `"vite/client"` to `client/tsconfig.json` types array
    - Add `"types": ["vite/client"]` under `compilerOptions`
    - Augments `ImportMeta` with Vite's `ImportMetaEnv`, making `import.meta.env` valid
    - _Bug_Condition: isBugCondition_2(X) where "vite/client" NOT IN X.tsconfig.compilerOptions.types_
    - _Expected_Behavior: result.importMetaEnv.VITE_SERVER_URL TYPE = "string | undefined" AND result.errors = [] (expectedBehavior_2)_
    - _Preservation: all other compiler options (target, lib, strict, jsx, etc.) remain unchanged_
    - _Requirements: 2.1, 2.2 (Bug 2); 3.1, 3.2 (Bug 2)_

  - [ ] 3.3 Retype `onDown` as `PointerEvent` and change event name in `client/src/App.tsx`
    - Change parameter type of `onDown` from `MouseEvent` to `PointerEvent`
    - Change `canvas.addEventListener("mousedown", onDown)` → `canvas.addEventListener("pointerdown", onDown)`
    - Change `canvas.removeEventListener("mousedown", onDown)` → `canvas.removeEventListener("pointerdown", onDown)`
    - _Bug_Condition: isBugCondition_3(X) where X.parameterType = "MouseEvent" AND X.eventName = "mousedown" AND X.accessesProperty = "pointerId"_
    - _Expected_Behavior: result.onDown.parameterType = "PointerEvent" AND result.eventName = "pointerdown" AND result.errors = [] (expectedBehavior_3)_
    - _Preservation: camera rotation, pointer capture, and onMove/onUp handlers are unchanged_
    - _Requirements: 2.1, 2.2, 2.3 (Bug 3); 3.1, 3.2, 3.3 (Bug 3)_

  - [ ] 3.4 Add `sequence: 0` to both `ClientInput` fixtures in `server/src/movement.test.ts`
    - Add `sequence: 0` to the diagonal-normalisation test fixture
    - Add `sequence: 0` to the non-finite input guard test fixture
    - _Bug_Condition: isBugCondition_4(X) where X.inputArg DOES NOT INCLUDE "sequence" AND ClientInput REQUIRES sequence_
    - _Expected_Behavior: result.fixtures ALL INCLUDE { sequence: number } AND result.errors = [] (expectedBehavior_4)_
    - _Preservation: both test cases continue to assert the same logical movement behaviour_
    - _Requirements: isBugCondition_4; expectedBehavior_4; Preservation of movement.test.ts_

  - [ ] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - TypeScript Compiler Reports No Errors
    - **IMPORTANT**: Re-run the SAME checks from task 1 — do NOT write new tests
    - Run `tsc --noEmit` across server, shared, and client packages
    - **EXPECTED OUTCOME**: All four previously-failing compile errors are gone (confirms all bugs fixed)
    - _Requirements: Expected Behavior 2.1–2.3 (Bug 1), 2.1–2.2 (Bug 2), 2.1–2.3 (Bug 3), expectedBehavior_4_

  - [ ] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - No Regressions in Movement Logic or Runtime Behaviour
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run `node --test` (or equivalent) for `server/src/movement.test.ts`
    - Confirm diagonal normalisation test passes
    - Confirm non-finite input guard test passes
    - **EXPECTED OUTCOME**: All preservation tests PASS (confirms no regressions)
    - _Requirements: 3.1, 3.2 (all bugs)_

- [ ] 4. Checkpoint — Ensure all tests pass
  - Run full typecheck across all workspace packages (`tsc --noEmit` in server, shared, and client)
  - Run `node --test` for `server/src/movement.test.ts` and confirm both tests pass
  - Confirm no new TypeScript errors have been introduced anywhere in the workspace
  - Ensure all tests pass; ask the user if questions arise
