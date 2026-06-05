import { type ProducerPayload } from "../../common/webrtc/payloadRelated";

export type ProducerInfo = ProducerPayload & { isBeingConsumed: boolean };
