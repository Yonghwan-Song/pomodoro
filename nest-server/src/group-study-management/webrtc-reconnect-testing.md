# WebRTC Reconnect Testing

This document is the practical playbook for testing mediasoup/WebRTC disconnection and reconnection in local development.

It is intentionally operational rather than theoretical:

- what to break
- how to break it
- what logs to expect
- how to interpret failure

## Goal

Verify that the app behaves correctly when media or signaling connectivity is disrupted and later restored.

Typical questions:

- Does Socket.IO signaling stay alive while media UDP dies?
- Does the client attempt ICE restart at the expected state transition?
- Does the server transport eventually move to `ice=disconnected`?
- Does the app recover without manual reload?
- Does it silently fall back to another candidate or TCP?

## Scope

There are several different failure classes. Do not mix them mentally.

1. Signaling TCP/WebSocket break
2. Media UDP break
3. One-direction media break
4. Full peer removal / transport close
5. Temporary break followed by recovery

This project most often cares about `media UDP break while signaling survives`.

## Recommended Workflow

Use two levels of testing:

1. Fast inner-loop testing
   Use debug hooks or direct server-side forced events when possible.
2. Final realism testing
   Use `tcpdump` + `iptables` to break the real selected UDP path.

If the goal is "natural reconnect", the second category is the real test.

## Standard Local Procedure

### 1. Join from the mobile client

Make sure the mobile peer actually enters the room and produces/consumes media.

Useful logs:

- client `Room joined successfully`
- client `My peerId is ...`
- server `created peer=...`
- server `tuple=udp ...`

### 2. Confirm the actual UDP tuple

From server logs, find transport tuple lines like:

```text
tuple=udp local=0.0.0.0:15217 remote=10.20.141.225:48732 ...
tuple=udp local=0.0.0.0:46483 remote=10.20.141.225:48014 ...
```

Important:

- `local=0.0.0.0` is only the bind address
- the real server IP must be confirmed from packet capture

### 3. Confirm the real NIC and server IP

Use `tcpdump`:

```bash
sudo tcpdump -ni any udp and host <peer-ip>
```

If needed, narrow to candidate interfaces:

```bash
sudo tcpdump -ni wlan0 udp and host <peer-ip>
sudo tcpdump -ni enp102s0f3u1 udp and host <peer-ip>
```

What you want to learn:

- which NIC is actually carrying the packets
- which real server IP is used on that NIC
- which exact local/remote port pairs are active

### 4. Decide how surgical the failure should be

Two valid approaches:

1. Peer-wide UDP drop
   Simpler and usually better for reconnect testing.
2. Tuple-specific UDP drop
   Better when you want to isolate one exact transport/port pair.

### 5. Apply the drop

Peer-wide:

```bash
./udp-drop-from-tuples.sh apply --interface <nic> --peer-ip <peer-ip>
```

Tuple-specific:

```bash
rg 'tuple=udp .*<peer-ip>' logs/<file>.log | \
./udp-drop-from-tuples.sh apply --interface <nic> --server-ip <server-ip>
```

### 6. Observe the timeline

Watch client and server logs separately.

Client-side expected order usually looks like:

1. `disconnected`
2. maybe `failed`
3. ICE restart request
4. either recovery to `connected`, or prolonged failure

Server-side expected order usually looks like:

1. tuple already selected and healthy
2. no immediate server close
3. later `ice=disconnected` after consent timeout if recovery fails
4. eventually `closed` if cleanup/leave happens

See also:

- [expected-event-ordering-for-iptables-udp-drop.md](/home/yhs/Repos/pomodoro-from-arch/nest-server/src/group-study-management/expected-event-ordering-for-iptables-udp-drop.md)
- [what-the-30seconds-mean-in-icestatechange-event-state.md](/home/yhs/Repos/pomodoro-from-arch/nest-server/src/group-study-management/what-the-30seconds-mean-in-icestatechange-event-state.md)

### 7. Remove the drop

Peer-wide:

```bash
./udp-drop-from-tuples.sh delete --interface <nic> --peer-ip <peer-ip>
```

Tuple-specific:

```bash
rg 'tuple=udp .*<peer-ip>' logs/<file>.log | \
./udp-drop-from-tuples.sh delete --interface <nic> --server-ip <server-ip>
```

## Test Matrix

These are the scenarios worth repeating consistently.

| Scenario | Signaling | Media UDP | Expected |
| --- | --- | --- | --- |
| baseline healthy join | alive | alive | media works |
| peer-wide UDP drop | alive | broken | ICE degradation, possible restart |
| tuple-specific UDP drop | alive | partially broken | transport-specific failure path |
| signaling drop only | broken | maybe alive briefly | socket disconnect / cleanup |
| UDP restore after short break | alive | restored | reconnect may recover |
| UDP restore after long break | alive | restored late | may require new ICE cycle or rejoin |

## Failure Interpretation

### Symptom: video keeps playing after UDP drop

Possible causes:

- wrong NIC
- wrong peer IP
- wrong server IP
- wrong tuple ports
- `iptables` rules did not match packets
- ICE switched to another candidate
- TCP fallback happened

Check:

```bash
sudo iptables -L INPUT -v -n --line-numbers
sudo iptables -L OUTPUT -v -n --line-numbers
```

If packet counters stay at zero, the rule is wrong.

### Symptom: server never reports `ice=disconnected`

Possible causes:

- connectivity recovered before consent timeout
- the browser switched candidate
- signaling-triggered ICE restart restored the path

### Symptom: app does not recover even after drop is removed

Possible causes:

- client recovery logic only triggers on `failed`, not earlier states
- cleanup closed transports before reconnect completed
- signaling was also broken
- the selected path after restore changed, but app state assumed the old one

## Known Pitfalls

1. `os.networkInterfaces()` order is not a reliable "newest interface" indicator.
2. `ip a` listing order is not a reliable selected-candidate indicator.
3. `local=0.0.0.0` in mediasoup logs does not tell you the real interface.
4. USB tethering can create a new interface after server startup, making startup-time IP snapshots stale.
5. ADB reverse removal does not kill already established sockets.
6. UDP drop testing can still appear healthy if the connection moves to another candidate or TCP.

## Minimum Runbook

When debugging under stress, do only this:

1. Get the peer IP.
2. Run `tcpdump`.
3. Confirm the real NIC and server IP.
4. Apply peer-wide UDP drop.
5. Check `iptables` counters.
6. Watch client `disconnected` / `failed`.
7. Watch server `ice=disconnected`.
8. Remove rules.

## Suggested Future Improvement

For day-to-day development, do not rely only on real network breakage.

Add internal debug hooks for:

- forced client transport failure
- forced server transport close
- forced producer close
- forced ICE restart failure
- forced signaling disconnect

Then reserve real `iptables` testing for final validation.
