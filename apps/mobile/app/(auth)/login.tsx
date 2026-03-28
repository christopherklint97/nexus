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
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { useWorkspaceStore } from "@/stores/workspace";

export default function LoginScreen() {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const setAuth = useAuthStore((s) => s.setAuth);
	const setWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);

	const handleLogin = async () => {
		setError("");
		if (!email.trim() || !password) {
			setError("Please enter your email and password.");
			return;
		}

		setLoading(true);
		try {
			const res = await fetch(
				`${process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000"}/api/auth/login`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
				},
			);
			const json = await res.json();

			if (!res.ok) {
				setError(json.error?.message || "Invalid credentials.");
				return;
			}

			const { user, accessToken, refreshToken } = json.data;
			setAuth(user, accessToken, refreshToken);

			// Fetch workspaces and set active one
			const wsRes = await api.get("/api/auth/me");
			if (wsRes.ok) {
				const wsJson = await wsRes.json();
				if (wsJson.data?.workspaceId) {
					setWorkspace(wsJson.data.workspaceId);
				}
			}

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
				<Text style={[styles.brand, { color: colors.tint }]}>N</Text>
				<Text style={[styles.title, { color: colors.text }]}>Welcome to Nexus</Text>
				<Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your Life, Unified.</Text>

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
					onSubmitEditing={handleLogin}
				/>

				<Pressable
					style={[styles.button, { backgroundColor: colors.tint, opacity: loading ? 0.7 : 1 }]}
					onPress={handleLogin}
					disabled={loading}
				>
					{loading ? (
						<ActivityIndicator color="#FFFFFF" />
					) : (
						<Text style={styles.buttonText}>Sign In</Text>
					)}
				</Pressable>

				<Pressable style={styles.linkButton} onPress={() => router.push("/(auth)/register")}>
					<Text style={[styles.linkText, { color: colors.tint }]}>
						Don't have an account? Sign up
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
	brand: {
		fontSize: 48,
		fontWeight: "900",
		textAlign: "center",
	},
	title: {
		fontSize: 24,
		fontWeight: "700",
		textAlign: "center",
		marginTop: 8,
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
