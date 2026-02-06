import { type ProducerPayload } from "../../common/webrtc/payloadRelated";

export const SDP_OFFER = "sdpOffer";

export type ProducerInfo = ProducerPayload & { isBeingConsumed: boolean };
