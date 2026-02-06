import { css } from "../../../../../styled-system/css";
import VideoPlayer from "../media/VideoPlayer";

interface VideoGridProps {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
}

export function VideoGrid({ localStream, remoteStreams }: VideoGridProps) {
  return (
    <div
      className={css({
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: "4",
        marginTop: "4",
      })}
    >
      {localStream && (
        <div
          className={css({
            backgroundColor: "gray.800",
            borderRadius: "lg",
            padding: "3",
            boxShadow: "md",
          })}
        >
          <h3
            className={css({
              fontSize: "sm",
              fontWeight: "medium",
              color: "gray.300",
              marginBottom: "2",
            })}
          >
            My Video
          </h3>
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
            boxShadow: "md",
          })}
        >
          <h3
            className={css({
              fontSize: "sm",
              fontWeight: "medium",
              color: "gray.300",
              marginBottom: "2",
            })}
          >
            {peerId.substring(0, 6)}
          </h3>
          <VideoPlayer stream={stream} />
        </div>
      ))}
    </div>
  );
}
