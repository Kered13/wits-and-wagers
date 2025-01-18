import { pipe, regex, string, type InferOutput } from "valibot";


export const RgbSchema = pipe(
	string(),
	regex(/^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/iu));
export type Rgb = InferOutput<typeof RgbSchema>;
