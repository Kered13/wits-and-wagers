import { safeParse, type GenericSchema } from "valibot";

import { HttpError } from "./httperror.js";


export function verifyRequest<I, O>(request: unknown, schema: GenericSchema<I, O>, errorMsg: string): O {
	const parsed = safeParse(schema, request);
	if (!parsed.success) {
		throw new HttpError(400, errorMsg);
	}
	return parsed.output;
}
