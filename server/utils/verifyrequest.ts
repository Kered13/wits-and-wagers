import { is, type GenericSchema } from "valibot";

import { HttpError } from "./httperror.js";


export function verifyRequest<T>(request: unknown, schema: GenericSchema<T>, errorMsg: string): T {
	if (!is(schema, request)) {
		throw new HttpError(400, errorMsg);
	}
	return request;
}
