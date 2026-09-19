import { css } from '../../../../../styled-system/css';
import VideoPlayer from '../media/VideoPlayer';
import { getHHmm } from '../../../../utils/number-related-utils';
import { useConnectionStore } from '../../../../zustand-stores/connectionStore';
import { Participant } from '../../../../zustand-stores/connection-slices/types';

const DUMMY_VIDEO_COUNT = 3;

interface VideoGridProps {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  peerNicknames: Map<string, string>;
  myTodayTotalDuration: number;
  peerTodayTotalDurations: Map<string, number>;
  participants: Map<string, Participant>;
}

export function VideoGrid({
  localStream,
  remoteStreams,
  peerNicknames,
  myTodayTotalDuration,
  peerTodayTotalDurations,
  participants,
}: VideoGridProps) {
  const consumersByPeerId = useConnectionStore(
    (state) => state.consumersByPeerId,
  );
  const isSharing = useConnectionStore((state) => state.isBeingShared);
  const isProducerPaused = useConnectionStore(
    (state) => state.isProducerPaused,
  );
  const toggleOffCamera = useConnectionStore((state) => state.toggleOffCamera);
  const toggleOnCamera = useConnectionStore((state) => state.toggleOnCamera);

  const cardClassName = css({
    backgroundColor: 'bg.surface',
    border: '1px solid',
    borderColor: 'borders.subtle',
    borderRadius: 'xl',
    padding: '3',
    boxShadow: '0 12px 24px rgba(15, 23, 42, 0.12)',
    minWidth: 0,
  });

  const headingClassName = css({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '3',
    marginBottom: '2',
  });

  const titleClassName = css({
    fontSize: 'sm',
    fontWeight: 'medium',
    color: 'text.main',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  });

  return (
    <div
      className={css({
        display: 'grid',
        gridTemplateColumns: {
          base: '1fr',
          md: 'repeat(auto-fit, minmax(260px, 1fr))',
          xl: 'repeat(auto-fit, minmax(300px, 1fr))',
        },
        gap: '4',
        minWidth: 0,
      })}
    >
      {localStream && (
        <div className={cardClassName}>
          <div className={headingClassName}>
            <h3 className={titleClassName}>My Video</h3>
            <span
              className={css({
                fontSize: 'xs',
                fontWeight: 'bold',
                color: 'bg.canvas',
                backgroundColor: 'status.info',
                paddingX: '2',
                paddingY: '1',
                borderRadius: 'full',
              })}
            >
              🔥 {getHHmm(myTodayTotalDuration)}
            </span>
          </div>
          <div
            className={css({
              position: 'relative',
            })}
          >
            {isSharing && (
              <button
                onClick={isProducerPaused ? toggleOnCamera : toggleOffCamera}
                className={css({
                  position: 'absolute',
                  top: '2',
                  right: '2',
                  zIndex: 1,
                  minWidth: '72px',
                  paddingX: '3',
                  paddingY: '1.5',
                  fontSize: 'xs',
                  fontWeight: 'medium',
                  borderRadius: 'full',
                  cursor: 'pointer',
                  border: 'none',
                  color: 'white',
                  backgroundColor: isProducerPaused
                    ? 'status.running'
                    : 'status.error',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.24)',
                  _hover: { opacity: 0.9 },
                  transition: 'background-color 0.15s, opacity 0.15s',
                })}
              >
                {isProducerPaused ? 'Camera on' : 'Camera off'}
              </button>
            )}
            {/* Actually the picture below should be the picture url of this peer 그런데 어차피 stream이 null일 수가 없어서... 그리고 받아오는 API 만들기 귀찮아서 null로 넣겠음. */}
            <VideoPlayer stream={localStream} isLocal={true} picture={null} />
          </div>
        </div>
      )}

      {[...participants.entries()].map(([peerId, participant]) => {
        const { nickName, todayTotalDuration, stream, picture } = participant;
        const consumer = consumersByPeerId.get(peerId);

        // NOTE: peerId, peerNicknames, stream, consumer (이 peer에 대한, 그리고 이것은 audio도 나중에 추가할 수도 있으니까... 아무튼 consumers임), todayTotalDuration.
        // (이렇게 하면 peer만의 개성을 부여할 수도 있겠다. 어떤 개성들이 허용될지는 내가 정하는 것이기는 하지만!)
        return (
          <div key={peerId} className={cardClassName}>
            <div className={headingClassName}>
              <h3 className={titleClassName}>{nickName}</h3>
              <span
                className={css({
                  fontSize: 'xs',
                  fontWeight: 'bold',
                  color: 'bg.canvas',
                  backgroundColor: 'status.running',
                  paddingX: '2',
                  paddingY: '1',
                  borderRadius: 'full',
                })}
              >
                🔥 {getHHmm(todayTotalDuration || 0)}
              </span>
            </div>
            <VideoPlayer
              stream={stream}
              consumerId={consumer?.id}
              picture={picture}
            />
          </div>
        );
      })}

      {/* {[...remoteStreams.entries()].map(([peerId, stream]) => { */}
      {/*   const consumer = consumersByPeerId.get(peerId); */}
      {/**/}
      {/*   // NOTE: peerId, peerNicknames, stream, consumer (이 peer에 대한, 그리고 이것은 audio도 나중에 추가할 수도 있으니까... 아무튼 consumers임), todayTotalDuration. */}
      {/*   // (이렇게 하면 peer만의 개성을 부여할 수도 있겠다. 어떤 개성들이 허용될지는 내가 정하는 것이기는 하지만!) */}
      {/*   // TODO: 아무튼 지금은 위의 정보들을 이용해서 peer객체를 정의하고... 어떤 slice에 넣어야하지?... 그냥 participantsSlice라고 한다음에... */}
      {/*   // peersArray로 조져야하나? */}
      {/*   // IMPT: 지금이 중요함. 지금 결정이 추후의 유지보수의 용이함을 고려해야함. 아무튼 이러한 기준을 한번은 생각해보자.. 결정할 때. */}
      {/*   return ( */}
      {/*     <div key={peerId} className={cardClassName}> */}
      {/*       <div className={headingClassName}> */}
      {/*         <h3 className={titleClassName}> */}
      {/*           {peerNicknames.get(peerId) ?? peerId.substring(0, 6)} */}
      {/*         </h3> */}
      {/*         <span */}
      {/*           className={css({ */}
      {/*             fontSize: "xs", */}
      {/*             fontWeight: "bold", */}
      {/*             color: "bg.canvas", */}
      {/*             backgroundColor: "status.running", */}
      {/*             paddingX: "2", */}
      {/*             paddingY: "1", */}
      {/*             borderRadius: "full" */}
      {/*           })} */}
      {/*         > */}
      {/*           🔥 {getHHmm(peerTodayTotalDurations.get(peerId) || 0)} */}
      {/*         </span> */}
      {/*       </div> */}
      {/*       <VideoPlayer stream={stream} consumerId={consumer?.id} /> */}
      {/*     </div> */}
      {/*   ); */}
      {/* })} */}

      {DUMMY_VIDEO_COUNT > 0 &&
        Array.from({ length: DUMMY_VIDEO_COUNT }).map((_, idx) => (
          <div key={`dummy-video-${idx}`} className={cardClassName}>
            <div className={headingClassName}>
              <h3 className={titleClassName}>Dummy {idx + 1}</h3>
              <span
                className={css({
                  fontSize: 'xs',
                  fontWeight: 'bold',
                  color: 'bg.canvas',
                  backgroundColor: 'status.neutral',
                  paddingX: '2',
                  paddingY: '1',
                  borderRadius: 'full',
                })}
              >
                —
              </span>
            </div>
            <VideoPlayer stream={null} picture={null} />
          </div>
        ))}
    </div>
  );
}
