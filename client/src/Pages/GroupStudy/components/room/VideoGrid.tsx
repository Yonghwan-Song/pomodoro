import { css } from "../../../../../styled-system/css";
import VideoPlayer from "../media/VideoPlayer";
import { getHHmm } from "../../../../utils/number-related-utils";

interface VideoGridProps {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  peerNicknames: Map<string, string>;
  myTodayTotalDuration: number;
  peerTodayTotalDurations: Map<string, number>;
}

export function VideoGrid({
  localStream,
  remoteStreams,
  peerNicknames,
  myTodayTotalDuration,
  peerTodayTotalDurations
}: VideoGridProps) {
  return (
    <div
      className={css({
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: "4",
        marginTop: "4"
      })}
    >
      {localStream && (
        <div
          className={css({
            backgroundColor: "gray.800",
            borderRadius: "lg",
            padding: "3",
            boxShadow: "md",
            position: "relative" // For absolute positioning of the duration badge
          })}
        >
          <div
            className={css({
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "2"
            })}
          >
            <h3
              className={css({
                fontSize: "sm",
                fontWeight: "medium",
                color: "gray.300"
              })}
            >
              My Video
            </h3>
            <span
              className={css({
                fontSize: "xs",
                fontWeight: "bold",
                color: "white",
                backgroundColor: "blue.500",
                paddingX: "2",
                paddingY: "1",
                borderRadius: "full"
              })}
            >
              🔥 {getHHmm(myTodayTotalDuration)}
            </span>
          </div>
          <VideoPlayer stream={localStream} isLocal={true} />
        </div>
      )}

      {[...remoteStreams.entries()].map(([peerId, stream]) => (
        <div
          key={peerId}
          className={css({
            backgroundColor: "gray.800",
            borderRadius: "lg",
            padding: "3",
            boxShadow: "md"
          })}
        >
          <div
            className={css({
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "2"
            })}
          >
            <h3
              className={css({
                fontSize: "sm",
                fontWeight: "medium",
                color: "gray.300"
              })}
            >
              {peerNicknames.get(peerId) ?? peerId.substring(0, 6)}
            </h3>
            <span
              className={css({
                fontSize: "xs",
                fontWeight: "bold",
                color: "white",
                backgroundColor: "green.500",
                paddingX: "2",
                paddingY: "1",
                borderRadius: "full"
              })}
            >
              🔥 {getHHmm(peerTodayTotalDurations.get(peerId) || 0)}
            </span>
          </div>
          <VideoPlayer stream={stream} />
        </div>
      ))}
    </div>
  );
}
