# Design Document — Ocenoid TypeScript Bugfixes

## Overview

Three TypeScript compile-time bugs in the Ocenoid multiplayer ocean survival game blocked clean builds. This design formalises the bug conditions, expected behaviours, and preservation requirements used to verify the fixes.

---

## Bug 1: Server/Shared Module Resolution Failure

### Bug Condition

```pascal
FUNCTION isBugCondition_1(X)
  INPUT: X is a TypeScript compilation invocation
  OUTPUT: boolean
  RETURN X.package = "@ocenoid/shared"
    AND NOT has_exports_field(X.packageJson)
END FUNCTION
```

Trigger: `shared/package.json` had no `exports` field, causing every NodeNext subpath import of `@ocenoid/shared/network.js` to fail with TS2307.

Affected files: `server/src/index.ts`, `server/src/movement.ts`.

### Expected Behavior

```pascal
FUNCTION expectedBehavior_1(result)
  RETURN result.resolved = true
    AND result.types INCLUDES { "ClientMessage", "PlayerState", "ClientInput", "ServerMessage" }
    AND result.errors = []
END FUNCTION
```

Adding an `exports` field to `shared/package.json` mapping `./network.js` → `{ "types": "./dist/network.d.ts", "default": "./src/network.ts" }` satisfies NodeNext subpath resolution for all consumers.

### Preservation Requirements

- The shared package remains referenceable by its workspace name `@ocenoid/shared`.
- `shared/src/network.ts` continues to export the same four types without changes to consuming packages.
- No server game logic, movement calculations, or WebSocket communication behaviour is altered.

---

## Bug 2: Client `import.meta.env` Type Error (TS2339)

### Bug Condition

```pascal
FUNCTION isBugCondition_2(X)
  INPUT: X is a TypeScript compilation invocation for the client
  OUTPUT: boolean
  RETURN "vite/client" NOT IN X.tsconfig.compilerOptions.types
END FUNCTION
```

Trigger: `client/tsconfig.json` had no `types` array, so TypeScript used the bare `ImportMeta` interface, which has no `env` property.

Affected file: `client/src/App.tsx` line 11 (`import.meta.env.VITE_SERVER_URL`).

### Expected Behavior

```pascal
FUNCTION expectedBehavior_2(result)
  RETURN result.importMetaEnv.VITE_SERVER_URL TYPE = "string | undefined"
    AND result.errors = []
END FUNCTION
```

Adding `"types": ["vite/client"]` to `client/tsconfig.json` compilerOptions augments `ImportMeta` with Vite's `ImportMetaEnv`, resolving TS2339.

### Preservation Requirements

- All other compiler options (target, lib, strict, jsx, moduleResolution, etc.) remain unchanged.
- The `VITE_SERVER_URL` fallback via nullish coalescing continues to work at runtime when the variable is unset.
- No client rendering, game state management, or WebSocket logic is altered.

---

## Bug 3: Client `MouseEvent.pointerId` Type Error (TS2339)

### Bug Condition

```pascal
FUNCTION isBugCondition_3(X)
  INPUT: X is the onDown event handler declaration in ThirdPersonCamera
  OUTPUT: boolean
  RETURN X.parameterType = "MouseEvent"
    AND X.eventName = "mousedown"
    AND X.accessesProperty = "pointerId"
END FUNCTION
```

Trigger: `onDown` was typed as `(e: MouseEvent)` and registered via `"mousedown"`, but `pointerId` only exists on `PointerEvent`.

Affected file: `client/src/App.tsx` — `ThirdPersonCamera` component.

### Expected Behavior

```pascal
FUNCTION expectedBehavior_3(result)
  RETURN result.onDown.parameterType = "PointerEvent"
    AND result.eventName = "pointerdown"
    AND result.cleanupEventName = "pointerdown"
    AND result.errors = []
END FUNCTION
```

Retyping `onDown` as `(e: PointerEvent)` and changing the event name from `"mousedown"` to `"pointerdown"` (add and remove listener) aligns the handler type with the DOM event type and makes `e.pointerId` valid.

### Preservation Requirements

- Right-click drag continues to rotate the third-person camera via `yaw` and `pitch` refs.
- `canvas.setPointerCapture` still tracks pointer movement outside the canvas boundary.
- `onMove` and `onUp` handlers (already typed as `PointerEvent`) continue to process `pointermove` and `pointerup` events unchanged.
- No visual behaviour, camera physics, or input handling logic is altered.

---

## Bug 4: Missing `sequence` Field in Test Fixtures (TS compile error)

### Bug Condition

```pascal
FUNCTION isBugCondition_4(X)
  INPUT: X is a call to applyInput in movement.test.ts
  OUTPUT: boolean
  RETURN X.inputArg DOES NOT INCLUDE "sequence" field
    AND ClientInput REQUIRES "sequence: number"
END FUNCTION
```

Trigger: `ClientInput` type requires a `sequence: number` field, but both test fixture objects in `movement.test.ts` omitted it, causing a TypeScript type error.

Affected file: `server/src/movement.test.ts`.

### Expected Behavior

```pascal
FUNCTION expectedBehavior_4(result)
  RETURN result.fixtures ALL INCLUDE { sequence: number }
    AND result.errors = []
END FUNCTION
```

Adding `sequence: 0` to both `ClientInput` literals in the test file satisfies the type constraint and restores clean compilation.

### Preservation Requirements

- Both test cases (diagonal normalisation and non-finite input guard) continue to test the same logical behaviour.
- `applyInput` runtime logic in `movement.ts` is not changed.
- No other server logic, integration tests, or WebSocket handlers are affected.

---

## Summary of Fixes Applied

| # | File | Change |
|---|------|--------|
| 1 | `shared/package.json` | Added `exports` field mapping `./network.js` |
| 2 | `client/tsconfig.json` | Added `"types": ["vite/client"]` |
| 3 | `client/src/App.tsx` | Retyped `onDown` as `PointerEvent`; `mousedown` → `pointerdown` |
| 4 | `server/src/movement.test.ts` | Added `sequence: 0` to both test fixtures |
