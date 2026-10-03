# Bugfix Requirements Document

## Introduction

Three TypeScript compile-time bugs in the Ocenoid multiplayer ocean survival game prevent the server and client from building cleanly. Bug 1 breaks server startup entirely by making the shared networking types unresolvable. Bugs 2 and 3 are client-side type errors that block the Vite/TypeScript build. All three have no runtime workarounds — they must be corrected at the source.

---

## Bug 1: Server/Shared Module Resolution Failure

### Bug Analysis

#### Current Behavior (Defect)

1.1 WHEN the TypeScript compiler (NodeNext module resolution) processes `server/src/index.ts` THEN the system reports TS2307 "Cannot find module '@ocenoid/shared/network.js'" because `shared/package.json` has no `exports` field.

1.2 WHEN the TypeScript compiler processes `server/src/movement.ts` THEN the system reports TS2307 "Cannot find module '@ocenoid/shared/network.js'" for the same reason.

1.3 WHEN any consumer uses NodeNext subpath imports against `@ocenoid/shared` THEN the system fails to resolve any subpath because the package declares no entry points via `exports`.

#### Expected Behavior (Correct)

2.1 WHEN the TypeScript compiler processes `server/src/index.ts` THEN the system SHALL successfully resolve `@ocenoid/shared/network.js` and make `ClientMessage`, `PlayerState`, and `ServerMessage` types available.

2.2 WHEN the TypeScript compiler processes `server/src/movement.ts` THEN the system SHALL successfully resolve `@ocenoid/shared/network.js` and make `PlayerState` and `ClientInput` types available.

2.3 WHEN `shared/package.json` contains an `exports` field mapping `./network.js` to the compiled output and its type declarations THEN the system SHALL satisfy NodeNext subpath resolution for all current and future consumers.

#### Unchanged Behavior (Regression Prevention)

3.1 WHEN the shared package is referenced by `@ocenoid/client` or any other future workspace package THEN the system SHALL CONTINUE TO resolve the shared package by its workspace name `@ocenoid/shared`.

3.2 WHEN `shared/src/network.ts` is edited THEN the system SHALL CONTINUE TO export the same `ClientMessage`, `PlayerState`, `ClientInput`, and `ServerMessage` types without requiring changes in consuming packages.

---

## Bug 2: Client `import.meta.env` Type Error (TS2339)

### Bug Analysis

#### Current Behavior (Defect)

1.1 WHEN the TypeScript compiler processes `client/src/App.tsx` and encounters `import.meta.env` on line 11 THEN the system reports TS2339 "Property 'env' does not exist on type 'ImportMeta'" because `client/tsconfig.json` does not reference Vite's type definitions.

1.2 WHEN `client/tsconfig.json` has no `types` array entry for `"vite/client"` THEN the system treats `import.meta` as the bare TypeScript `ImportMeta` interface, which has no `env` property.

#### Expected Behavior (Correct)

2.1 WHEN `client/tsconfig.json` includes `"vite/client"` in its compiler options `types` array THEN the system SHALL augment `ImportMeta` with Vite's `ImportMetaEnv` interface, resolving the TS2339 error.

2.2 WHEN `import.meta.env.VITE_SERVER_URL` is accessed in any client source file THEN the system SHALL recognise it as `string | undefined` without a type error.

#### Unchanged Behavior (Regression Prevention)

3.1 WHEN other compiler options in `client/tsconfig.json` (target, lib, strict, jsx, moduleResolution, etc.) are unchanged THEN the system SHALL CONTINUE TO typecheck the rest of the client source with the same strictness settings.

3.2 WHEN the `VITE_SERVER_URL` environment variable is not set at build time THEN the system SHALL CONTINUE TO fall back to the `ws://${window.location.hostname}:8787` default at runtime via the nullish coalescing operator.

---

## Bug 3: Client `MouseEvent.pointerId` Type Error (TS2339)

### Bug Analysis

#### Current Behavior (Defect)

1.1 WHEN the TypeScript compiler processes the `onDown` handler in `ThirdPersonCamera` (typed as `(e: MouseEvent)`) THEN the system reports TS2339 "Property 'pointerId' does not exist on type 'MouseEvent'" because `pointerId` is defined on `PointerEvent`, not `MouseEvent`.

1.2 WHEN `canvas.setPointerCapture(e.pointerId)` is called inside `onDown` THEN the system fails to compile because `e.pointerId` is inaccessible on the `MouseEvent` type.

1.3 WHEN the event listener is registered as `canvas.addEventListener("mousedown", onDown)` THEN the system dispatches `MouseEvent` objects to `onDown`, which is incompatible with the `PointerEvent` API used inside the handler.

#### Expected Behavior (Correct)

2.1 WHEN the `onDown` handler is re-typed as `(e: PointerEvent)` THEN the system SHALL compile without a TS2339 error and `e.pointerId` SHALL be a valid `number` property.

2.2 WHEN the event listener registration is changed from `"mousedown"` to `"pointerdown"` THEN the system SHALL dispatch `PointerEvent` objects to `onDown`, ensuring the handler type and the DOM event type are consistent.

2.3 WHEN the cleanup `removeEventListener` call is correspondingly updated from `"mousedown"` to `"pointerdown"` THEN the system SHALL correctly remove the handler on component unmount without leaking listeners.

#### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user right-clicks and drags on the canvas THEN the system SHALL CONTINUE TO rotate the third-person camera by updating `yaw` and `pitch` refs.

3.2 WHEN right-click drag initiates pointer capture via `canvas.setPointerCapture` THEN the system SHALL CONTINUE TO track pointer movement outside the canvas boundary until the pointer is released.

3.3 WHEN the `onMove` and `onUp` handlers remain typed as `(e: PointerEvent)` THEN the system SHALL CONTINUE TO process `pointermove` and `pointerup` events for camera drag and pointer release logic.

---

## Bug Condition Summary

**Bug Condition Functions:**

```pascal
FUNCTION isBugCondition_1(X)
  INPUT: X is a TypeScript compilation invocation
  OUTPUT: boolean
  RETURN X.package = "@ocenoid/shared" AND NOT has_exports_field(X.packageJson)
END FUNCTION

FUNCTION isBugCondition_2(X)
  INPUT: X is a TypeScript compilation invocation for the client
  OUTPUT: boolean
  RETURN "vite/client" NOT IN X.tsconfig.compilerOptions.types
END FUNCTION

FUNCTION isBugCondition_3(X)
  INPUT: X is the onDown event handler declaration
  OUTPUT: boolean
  RETURN X.parameterType = "MouseEvent" AND X.accessesProperty = "pointerId"
END FUNCTION
```

**Preservation Goal (for all three bugs):**

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition_N(X) DO
  ASSERT F(X) = F'(X)
END FOR
```

The fixes must not alter server game logic, movement calculations, client rendering, WebSocket communication, or any runtime behavior — only the type-level declarations and tsconfig entries are changed.
