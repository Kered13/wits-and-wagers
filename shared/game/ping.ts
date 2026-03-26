import { literal, number, pipe, strictObject, title, type InferOutput } from "valibot";


export const PingRequestSchema = pipe(
	strictObject({
		clientTimestamp: number(),
	}),
	title("PingRequest"));
export type PingRequest = InferOutput<typeof PingRequestSchema>;


export const PingResponseSchema = pipe(
	strictObject({
		type: literal("pong"),
		clientTimestamp: number(),
		serverTimestamp: number(),
	}),
	title("PingResponse"));
export type PingResponse = InferOutput<typeof PingResponseSchema>;
