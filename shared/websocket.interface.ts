import { any, check, literal, nonEmpty, number, pipe, strictObject, string, variant } from "valibot";


export const WebSocketRequestSchema = strictObject({
	method: pipe(string(), nonEmpty()),
	payload: any()
});
export type WebSocketRequest<T> = {
	method: string,
	payload: T
};


export const WebSocketSuccessSchema = strictObject({
	type: literal("success"),
	status: pipe(number(), check(status => 200 <= status && status < 300)),
	payload: any()
});
export type WebSocketSuccess<T> = {
	type: "success",
	status: number,  // An HTTP status code from 200-299.
	payload: T
};


export const WebSocketErrorSchema = strictObject({
	type: literal("error"),
	status: pipe(number(), check(status => 400 <= status && status < 600)),
	message: string()
});
export type WebSocketError = {
	type: "error",
	status: number,  // An HTTP status code from 400-599.
	message: string
};


export const WebSocketResponse = variant("type", [WebSocketSuccessSchema, WebSocketErrorSchema]);
export type WebSocketResponse<T> = WebSocketSuccess<T> | WebSocketError;
