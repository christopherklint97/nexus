import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";

interface Props {
	error: Error;
	retry: () => void;
}

export function ErrorBoundaryScreen({ error, retry }: Props) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Text style={styles.icon}>{"\u26A0\uFE0F"}</Text>
			<Text style={[styles.title, { color: colors.text }]}>Something went wrong</Text>
			<Text style={[styles.message, { color: colors.textSecondary }]}>
				{error.message || "An unexpected error occurred."}
			</Text>
			<Pressable style={[styles.button, { backgroundColor: colors.tint }]} onPress={retry}>
				<Text style={styles.buttonText}>Try Again</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: 40,
	},
	icon: {
		fontSize: 48,
		marginBottom: 16,
	},
	title: {
		fontSize: 20,
		fontWeight: "700",
		textAlign: "center",
		marginBottom: 8,
	},
	message: {
		fontSize: 14,
		textAlign: "center",
		lineHeight: 20,
		marginBottom: 24,
	},
	button: {
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 10,
	},
	buttonText: {
		color: "#FFF",
		fontSize: 15,
		fontWeight: "600",
	},
});
