# React Cleanup Order: Components vs. Hooks

This document explains the execution order of React `useEffect` cleanup functions,
focusing on the relationship between Parent Components, Child Components, and Custom Hooks.
Understanding this is crucial for managing resource-heavy operations like WebRTC.

## 1. The Hierarchy: Hooks are "Part of" the Component

A common misconception is that Hooks exist "below" the component using them.
In reality, **Hooks are intrinsically part of the component instance** that calls them.

### Structure of `WebRTCPeerPage`

```text
WebRTCPeerPage (Parent Component)
│
├── useUserMedia (Custom Hook)
│   └── ⚠️ This is NOT a child. It is "Internal Logic" of the Parent.
│
└── <WebRTCPeer /> (Child Component)
    └── ✅ This IS a child. It is a separate instance in the React Tree.
```

## 2. The Golden Rule: "Child Cleanups Run First"

React follows a strict order when unmounting components or cleaning up effects due to dependency changes:

1. **Child Components** cleanup **FIRST**.
2. **Parent Components** (and their Hooks) cleanup **SECOND**.

*==**This order ensures that a Child Component always has access to its props (provided by the Parent) until the very last moment of its existence.**==*

## 3. Sequence in Context (WebRTC Termination)

When the user clicks "Stop Sharing", triggering `setStream(null)`, the cleanup sequence is **Deterministic** (Guaranteed) and **Sequential**.

### The Sequence

1. **Trigger**: User clicks Stop -> `stream` state becomes `null`.
2. **React Re-renders**: React sees `WebRTCPeer` needs to unmount or update.
3. **Step 1: Child Cleanup (`WebRTCPeer`)**
    * React runs the cleanup function inside `WebRTCPeer`.
    * **Action**: `producer.close()` is called.
    * **Result**: The Protocol connection to the server is closed.
    * *Note: This is synchronous.*
4. **Step 2: Parent Cleanup (`WebRTCPeerPage` via `useUserMedia`)**
    * React runs the cleanup function inside the `useUserMedia` hook (which belongs to the Parent).
    * **Action**: `track.stop()` is called.
    * **Result**: The Hardware (Camera/Mic) is turned off.
    * *Note: This is synchronous.*

## 4. Why This Matters

==This architecture accidentally but perfectly enforces the safest termination strategy:==

> **Protocol First → Hardware Second**

1. **Protocol First (`producer.close()`)**: We tell the server/peers "I am stopping" while the camera is effectively still "on" (conceptually). This ensures the stream ends cleanly on the network layer without sending broken frames.
2. **Hardware Second (`track.stop()`)**: Immediately after the network layer is cut, we kill the power to the camera LED.

### Myth: "Race Condition"

Because both `producer.close()` and `track.stop()` are **Synchronous** functions, and React's execution order is strict, there is **no race condition**. The Protocol will *always* close before the Hardware stops.
