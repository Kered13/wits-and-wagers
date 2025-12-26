import { PublicId } from "../../../shared/player";
import { Color } from "../../../shared/color";


export type PlayerScoreData = {
	name: string,
	publicId: PublicId,
	chips: number,
	color?: Color,
}
