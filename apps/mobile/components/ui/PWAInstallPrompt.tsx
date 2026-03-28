import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";

// This component only shows on web when the browser supports PWA install

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
	const [dismissed, setDismissed] = useState(false);

	useEffect(() => {
		if (Platform.OS !== "web") return;

		// Check if already dismissed
		try {
			if (localStorage.getItem("nexus_pwa_dismissed") === "1") {
				setDismissed(true);
				return;
			}
		} catch {}

		const handler = (e: Event) => {
			e.preventDefault();
			setInstallPrompt(e as BeforeInstallPromptEvent);
		};

		window.addEventListener("beforeinstallprompt", handler);
		return () => window.removeEventListener("beforeinstallprompt", handler);
	}, []);

	if (Platform.OS !== "web" || !installPrompt || dismissed) return null;

	const handleInstall = async () => {
		await installPrompt.prompt();
		const { outcome } = await installPrompt.userChoice;
		if (outcome === "accepted") {
			setInstallPrompt(null);
		}
	};

	const handleDismiss = () => {
		setDismissed(true);
		try {
			localStorage.setItem("nexus_pwa_dismissed", "1");
		} catch {}
	};

	return (
		<Animated.View
			entering={FadeInDown.duration(300)}
			exiting={FadeOutDown.duration(200)}
			style={[styles.banner, { backgroundColor: colors.tint }]}
		>
			<View style={styles.bannerContent}>
				<Text style={styles.bannerIcon}>N</Text>
				<View style={styles.bannerText}>
					<Text style={styles.bannerTitle}>Install Nexus</Text>
					<Text style={styles.bannerDesc}>Add to home screen for the best experience</Text>
				</View>
			</View>
			<View style={styles.bannerActions}>
				<Pressable style={styles.installBtn} onPress={handleInstall}>
					<Text style={styles.installText}>Install</Text>
				</Pressable>
				<Pressable onPress={handleDismiss}>
					<Text style={styles.dismissText}>Later</Text>
				</Pressable>
			</View>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	banner: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingVertical: 12,
		zIndex: 50,
	},
	bannerContent: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		flex: 1,
	},
	bannerIcon: {
		color: "#FFF",
		fontSize: 24,
		fontWeight: "900",
	},
	bannerText: { flex: 1 },
	bannerTitle: {
		color: "#FFF",
		fontSize: 15,
		fontWeight: "700",
	},
	bannerDesc: {
		color: "rgba(255,255,255,0.8)",
		fontSize: 12,
		marginTop: 1,
	},
	bannerActions: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	installBtn: {
		backgroundColor: "#FFF",
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 6,
	},
	installText: {
		fontSize: 14,
		fontWeight: "700",
		color: "#4361EE",
	},
	dismissText: {
		color: "rgba(255,255,255,0.7)",
		fontSize: 13,
		fontWeight: "500",
	},
});
