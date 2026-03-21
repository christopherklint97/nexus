import { Stack } from "expo-router";

import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";

export default function ShoppingLayout() {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];

	return (
		<Stack
			screenOptions={{
				headerStyle: { backgroundColor: colors.surface },
				headerTitleStyle: { fontWeight: "700", fontSize: 18, color: colors.text },
				headerShadowVisible: false,
			}}
		/>
	);
}
