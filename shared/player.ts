import { brand, nonEmpty, pipe, strictObject, string, type InferOutput } from "valibot";


export const PublicIdSchema = pipe(string(), nonEmpty(), brand("PublicId"));
export type PublicId = InferOutput<typeof PublicIdSchema>;


export const PrivateIdSchema = pipe(string(), nonEmpty(), brand("PrivateId"));
export type PrivateId = InferOutput<typeof PrivateIdSchema>;


// Player information including private information that should only be sent to
// that player.
export const PrivatePlayerSchema = strictObject({
	name: pipe(string(), nonEmpty()),
	publicId: PublicIdSchema,
	privateId: PrivateIdSchema
});
export type PrivatePlayer = InferOutput<typeof PrivatePlayerSchema>;
