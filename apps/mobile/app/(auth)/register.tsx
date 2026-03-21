import { useState } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { router } from "expo-router";

import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";

export default function RegisterScreen() {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			style={[styles.container, { backgroundColor: colors.background }]}
		>
			<View style={styles.content}>
				<Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
				<Text style={[styles.subtitle, { color: colors.textSecondary }]}>
					Get started with Nexus
				</Text>

				<TextInput
					style={[
						styles.input,
						{
							backgroundColor: colors.surface,
							borderColor: colors.border,
							color: colors.text,
						},
					]}
					placeholder="Full Name"
					placeholderTextColor={colors.textSecondary}
					value={name}
					onChangeText={setName}
				/>

				<TextInput
					style={[
						styles.input,
						{
							backgroundColor: colors.surface,
							borderColor: colors.border,
							color: colors.text,
						},
					]}
					placeholder="Email"
					placeholderTextColor={colors.textSecondary}
					value={email}
					onChangeText={setEmail}
					autoCapitalize="none"
					keyboardType="email-address"
				/>

				<TextInput
					style={[
						styles.input,
						{
							backgroundColor: colors.surface,
							borderColor: colors.border,
							color: colors.text,
						},
					]}
					placeholder="Password"
					placeholderTextColor={colors.textSecondary}
					value={password}
					onChangeText={setPassword}
					secureTextEntry
				/>

				<Pressable
					style={[styles.button, { backgroundColor: colors.tint }]}
					onPress={() => {
						// TODO: Implement registration
						router.replace("/(tabs)");
					}}
				>
					<Text style={styles.buttonText}>Create Account</Text>
				</Pressable>

				<Pressable style={styles.linkButton} onPress={() => router.back()}>
					<Text style={[styles.linkText, { color: colors.tint }]}>
						Already have an account? Sign in
					</Text>
				</Pressable>
			</View>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		flex: 1,
		justifyContent: "center",
		paddingHorizontal: 32,
	},
	title: {
		fontSize: 24,
		fontWeight: "700",
		textAlign: "center",
	},
	subtitle: {
		fontSize: 14,
		textAlign: "center",
		marginTop: 4,
		marginBottom: 40,
	},
	input: {
		height: 48,
		borderRadius: 10,
		borderWidth: 1,
		paddingHorizontal: 16,
		fontSize: 16,
		marginBottom: 12,
	},
	button: {
		height: 48,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
		marginTop: 8,
	},
	buttonText: {
		color: "#FFFFFF",
		fontSize: 16,
		fontWeight: "600",
	},
	linkButton: {
		alignItems: "center",
		marginTop: 20,
	},
	linkText: {
		fontSize: 14,
		fontWeight: "500",
	},
});
