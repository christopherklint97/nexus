import { router } from "expo-router";
import { useState } from "react";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useAuthStore } from "@/stores/auth";

export default function RegisterScreen() {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const setAuth = useAuthStore((s) => s.setAuth);

	const handleRegister = async () => {
		setError("");
		if (!name.trim()) {
			setError("Please enter your name.");
			return;
		}
		if (!email.trim()) {
			setError("Please enter your email.");
			return;
		}
		if (password.length < 8) {
			setError("Password must be at least 8 characters.");
			return;
		}

		setLoading(true);
		try {
			const res = await fetch(
				`${process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000"}/api/auth/register`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						name: name.trim(),
						email: email.trim().toLowerCase(),
						password,
					}),
				},
			);
			const json = await res.json();

			if (!res.ok) {
				setError(json.error?.message || "Registration failed.");
				return;
			}

			const { user, accessToken, refreshToken } = json.data;
			setAuth(user, accessToken, refreshToken);
			router.replace("/(tabs)");
		} catch {
			setError("Unable to connect. Check your network.");
		} finally {
			setLoading(false);
		}
	};

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

				{error ? (
					<View style={[styles.errorBox, { backgroundColor: colors.danger + "15" }]}>
						<Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
					</View>
				) : null}

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
					editable={!loading}
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
					editable={!loading}
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
					editable={!loading}
					onSubmitEditing={handleRegister}
				/>

				<Pressable
					style={[styles.button, { backgroundColor: colors.tint, opacity: loading ? 0.7 : 1 }]}
					onPress={handleRegister}
					disabled={loading}
				>
					{loading ? (
						<ActivityIndicator color="#FFFFFF" />
					) : (
						<Text style={styles.buttonText}>Create Account</Text>
					)}
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
	errorBox: {
		padding: 12,
		borderRadius: 8,
		marginBottom: 12,
	},
	errorText: {
		fontSize: 13,
		fontWeight: "500",
		textAlign: "center",
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
