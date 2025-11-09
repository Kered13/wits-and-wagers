import { brand, parse, pipe, string, type InferOutput } from "valibot";


export const ColorSchema = pipe(
	string(),
	brand("Color"),
);
export type Color = InferOutput<typeof ColorSchema>;


export const BLACK: Color = parse(ColorSchema, "#1d1a06");
export const GRAY: Color = parse(ColorSchema, "#b4b4b0");
export const BROWN: Color = parse(ColorSchema, "#77362B");
export const YELLOW: Color = parse(ColorSchema, "#f5e63d");
export const PURPLE: Color = parse(ColorSchema, "#6953ac");
export const PINK: Color = parse(ColorSchema, "#efa9b9");
export const ORANGE: Color = parse(ColorSchema, "#fd9935");
export const RED: Color = parse(ColorSchema, "#df0719");
export const BLUE: Color = parse(ColorSchema, "#1cb0ca");
export const GREEN: Color = parse(ColorSchema, "#37ae41");


export const COLORS = [
	BLACK,
	GRAY,
	BROWN,
	YELLOW,
	PURPLE,
	PINK,
	ORANGE,
	RED,
	BLUE,
	GREEN
];
