import { parse } from "valibot";

import { PrivateIdSchema, PublicIdSchema, type PrivateId, type PublicId } from "../../shared/player.js";


export function publicId(id: string): PublicId {
	return parse(PublicIdSchema, id);
}


export function privateId(id: string): PrivateId {
	return parse(PrivateIdSchema, id);
}
