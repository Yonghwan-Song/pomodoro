# Forced Room Exit Flow

This note documents the current forced room exit behavior for the Group Study room.

The goal is:

- leave the room cleanly
- avoid a full page refresh
- navigate to `/group-study`
- prevent `Room.tsx` from auto-joining the same room again during the transition

## Trigger Point

The flow starts in `client/src/zustand-stores/connectionStore.ts` inside `leaveRoomAfterRecoveryFailure()`.

This path is used when the transport has exhausted ICE restart attempts.

Current order:

1. set `forcedRoomExitReason = "transport-recovery-failed"`
2. call `leaveRoom()`
3. let React re-render subscribed components
4. `App.tsx` detects the forced exit and calls `navigate("/group-study", { replace: true })`

## Exact Store Update Order

Inside `leaveRoomAfterRecoveryFailure()`:

```ts
useConnectionStore.setState(
  { forcedRoomExitReason: "transport-recovery-failed" },
  false,
  "room/forcedExitAfterRecoveryFailure"
);

useConnectionStore.getState().leaveRoom();
```

So the forced-exit flag is intentionally set **before** room cleanup starts.

That ordering matters because `Room.tsx` must see the forced-exit signal before it gets a chance to auto-join again.

## What `leaveRoom()` Updates

`leaveRoom()` does the following synchronously:

1. closes the local producer if present
2. closes all consumers
3. closes send/recv transports
4. emits `LEAVE_ROOM` to the server
5. removes room-level socket listeners
6. resets room-related Zustand state

Important reset fields:

- `currentRoomId -> null`
- `isRoomJoined -> false`
- `sendTransport -> null`
- `recvTransport -> null`
- `producer -> null`
- room collections/maps -> emptied

Important non-reset field:

- `forcedRoomExitReason` is **not** cleared in `leaveRoom()`

So after `leaveRoom()` finishes, the store snapshot is expected to look like this:

- `forcedRoomExitReason = "transport-recovery-failed"`
- `isRoomJoined = false`
- `currentRoomId = null`
- transports/producers/consumers cleaned up

## React Timing

Zustand state updates are synchronous.

However, component updates happen on the React side afterward:

1. store state is updated synchronously
2. subscribed components are scheduled to re-render
3. React commits the new render
4. `useEffect(...)` callbacks run after commit

So `navigate()` is **not** called from the store itself.

It is called later, from `App.tsx`, after React has observed the new store state and committed a render.

## Why `Room.tsx` Must Block Auto-Rejoin

`Room.tsx` has an auto-join effect that normally does this:

```ts
if (socket && connected && roomId && !isRoomJoined) {
  joinRoom(roomId, ...);
}
```

That becomes dangerous during forced exit because:

1. `leaveRoom()` sets `isRoomJoined = false`
2. the URL may still briefly be `/group-study/room/:roomId`
3. `Room` may still be mounted during that short window
4. without a guard, `Room` would try to join the same room again

So the current guard is:

```ts
if (forcedRoomExitReason) {
  return;
}
```

This prevents the re-join race.

## Exact `App.tsx` Behavior

`App.tsx` subscribes to `forcedRoomExitReason` and reacts only when it becomes:

- `"transport-recovery-failed"`

Current effect order:

1. log forced exit detection
2. call `navigate("/group-study", { replace: true })`
3. schedule `setTimeout(..., 0)`
4. inside that timer:
   - show the alert
   - clear `forcedRoomExitReason`

So the current ordering is intentionally:

- navigate first
- alert later
- clear the flag after that

This avoids two earlier problems:

1. blocking the transition with `alert(...)` before navigation
2. clearing the forced-exit signal too early

## Exact Timing Of `navigate()` Invocation

`navigate()` is invoked:

- after the forced-exit store update
- after `leaveRoom()` completes
- after React re-renders subscribed components
- inside `App.tsx` `useEffect(...)`
- before the deferred alert and flag clear

So the order is:

1. force-exit flag set
2. room state cleaned up
3. React commit
4. `App` effect runs
5. `navigate("/group-study", { replace: true })`
6. router switches route
7. `Room` unmounts and `RoomList` mounts
8. timer callback runs
9. alert shows
10. `forcedRoomExitReason` is cleared

## Resulting Component Sequence

During forced exit:

1. `Room` may still be mounted very briefly
2. but it sees `forcedRoomExitReason` and skips auto-join
3. `App` calls `navigate("/group-study")`
4. React Router changes from `Room` to `RoomList`
5. `Room` unmounts
6. `RoomList` mounts

## Why The Earlier Version Felt Wrong

The earlier version cleared the forced-exit signal too early and showed `alert(...)` before navigation was safely completed.

That created a race where:

1. `leaveRoom()` set `isRoomJoined = false`
2. `Room` was still mounted on the room URL
3. auto-join tried to run again
4. navigation happened around the same time

That is what produced the "it exited and then re-entered" feeling.

## Debug Logs To Watch

Current useful logs:

- in `connectionStore.ts`
  - `setting forcedRoomExitReason before leaveRoom()`
  - `forcedRoomExitReason was set`
- in `Room.tsx`
  - `[Room] skipping auto-join due to forced exit`
- in `App.tsx`
  - `[App] forced room exit detected. Navigating to /group-study.`
  - `[App] calling navigate('/group-study', { replace: true })`
  - `[App] clearing forcedRoomExitReason after navigation`

These logs let you verify the intended order end-to-end.
