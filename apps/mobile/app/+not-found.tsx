import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";

export default function NotFoundScreen() {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];

	return (
		<>
			<Stack.Screen options={{ title: "Not Found" }} />
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<Text style={[styles.title, { color: colors.text }]}>Page not found</Text>
				<Link href="/" style={[styles.link, { color: colors.tint }]}>
					Go to home
				</Link>
			</View>
		</>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: 20,
	},
	title: {
		fontSize: 20,
		fontWeight: "700",
	},
	link: {
		marginTop: 16,
		fontSize: 14,
		fontWeight: "500",
	},
});
