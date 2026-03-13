import { css } from "../../../../../styled-system/css";
import VideoPlayer from "../media/VideoPlayer";
import { getHHmm } from "../../../../utils/number-related-utils";

const DUMMY_VIDEO_COUNT = 3;

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
  const cardClassName = css({
    backgroundColor: "bg.surface",
    border: "1px solid",
    borderColor: "borders.subtle",
    borderRadius: "xl",
    padding: "3",
    boxShadow: "0 12px 24px rgba(15, 23, 42, 0.12)",
    minWidth: 0
  });

  const headingClassName = css({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "3",
    marginBottom: "2"
  });

  const titleClassName = css({
    fontSize: "sm",
    fontWeight: "medium",
    color: "text.main",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  });

  return (
    <div
      className={css({
        display: "grid",
        gridTemplateColumns: {
          base: "1fr",
          md: "repeat(auto-fit, minmax(260px, 1fr))",
          xl: "repeat(auto-fit, minmax(300px, 1fr))"
        },
        gap: "4",
        minWidth: 0
      })}
    >
      {localStream && (
        <div className={cardClassName}>
          <div className={headingClassName}>
            <h3 className={titleClassName}>My Video</h3>
            <span
              className={css({
                fontSize: "xs",
                fontWeight: "bold",
                color: "bg.canvas",
                backgroundColor: "status.info",
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
        <div key={peerId} className={cardClassName}>
          <div className={headingClassName}>
            <h3 className={titleClassName}>
              {peerNicknames.get(peerId) ?? peerId.substring(0, 6)}
            </h3>
            <span
              className={css({
                fontSize: "xs",
                fontWeight: "bold",
                color: "bg.canvas",
                backgroundColor: "status.running",
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

      {DUMMY_VIDEO_COUNT > 0 &&
        Array.from({ length: DUMMY_VIDEO_COUNT }).map((_, idx) => (
          <div key={`dummy-video-${idx}`} className={cardClassName}>
            <div className={headingClassName}>
              <h3 className={titleClassName}>Dummy {idx + 1}</h3>
              <span
                className={css({
                  fontSize: "xs",
                  fontWeight: "bold",
                  color: "bg.canvas",
                  backgroundColor: "status.neutral",
                  paddingX: "2",
                  paddingY: "1",
                  borderRadius: "full"
                })}
              >
                —
              </span>
            </div>
            <VideoPlayer stream={null} />
          </div>
        ))}
    </div>
  );
}
