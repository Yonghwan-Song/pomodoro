# WebRTC Debugging Cheatsheet

This is the short version.

## Find The Real UDP Path

All UDP for a peer:

```bash
sudo tcpdump -ni any udp and host <peer-ip>
```

Specific interface:

```bash
sudo tcpdump -ni <nic> udp and host <peer-ip>
```

Specific ports:

```bash
sudo tcpdump -ni <nic> 'udp and host <peer-ip> and (port <a> or port <b> or port <c>)'
```

## Read The Important Tuple

Server log example:

```text
tuple=udp local=0.0.0.0:15217 remote=10.20.141.225:48732
```

Read it as:

- server port: `15217`
- peer IP: `10.20.141.225`
- peer port: `48732`
- real server IP: must be confirmed from `tcpdump`

## Drop All UDP For One Peer

Apply:

```bash
./udp-drop-from-tuples.sh apply --interface <nic> --peer-ip <peer-ip>
```

Delete:

```bash
./udp-drop-from-tuples.sh delete --interface <nic> --peer-ip <peer-ip>
```

## Drop UDP By Tuple Lines

Print commands:

```bash
rg 'tuple=udp .*<peer-ip>' logs/<file>.log | \
./udp-drop-from-tuples.sh print --interface <nic> --server-ip <server-ip>
```

Apply:

```bash
rg 'tuple=udp .*<peer-ip>' logs/<file>.log | \
./udp-drop-from-tuples.sh apply --interface <nic> --server-ip <server-ip>
```

Delete:

```bash
rg 'tuple=udp .*<peer-ip>' logs/<file>.log | \
./udp-drop-from-tuples.sh delete --interface <nic> --server-ip <server-ip>
```

## Verify `iptables` Match

```bash
sudo iptables -L INPUT -v -n --line-numbers
sudo iptables -L OUTPUT -v -n --line-numbers
```

If counters do not increase, the rule is wrong.

## Check Routing Guess

```bash
ip route get <peer-ip>
```

Useful, but packet capture is still the ground truth.

## Fast Interpretation

Video still plays:

- wrong NIC
- wrong IP
- wrong ports
- TCP fallback
- switched ICE candidate

Client fails first, server lags:

- normal
- server consent timeout is later

`adb reverse --remove` does not disconnect the existing socket:

- also normal

## Mental Model

Do not ask:

- "which interface is `0.0.0.0`?"

Ask:

- "which NIC is carrying packets for this peer right now?"
