import { Stack } from "expo-router";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";

export default function NotesLayout() {
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
