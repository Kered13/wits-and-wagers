import { literal, number, strictObject, string, type InferOutput } from "valibot";


// Indicates an error communicated to the client over websockets.
export const WsErrorSchema = strictObject({
	type: literal("error"),
	status: number(),
	message: string()
});
export type WsError = InferOutput<typeof WsErrorSchema>;
