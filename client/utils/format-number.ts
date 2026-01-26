export function formatNumber(number: number): string {
	if (number < 10000) {
		return number.toString();
	}
	return Intl.NumberFormat().format(number);
}
