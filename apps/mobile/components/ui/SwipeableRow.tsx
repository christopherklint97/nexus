import { useRef } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";

interface SwipeAction {
	label: string;
	icon?: string;
	color: string;
	onPress: () => void;
}

interface Props {
	children: React.ReactNode;
	leftActions?: SwipeAction[];
	rightActions?: SwipeAction[];
}

export function SwipeableRow({ children, leftActions, rightActions }: Props) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const translateX = useRef(new Animated.Value(0)).current;
	const isOpen = useRef(false);

	const ACTION_WIDTH = 72;
	const rightWidth = (rightActions?.length || 0) * ACTION_WIDTH;
	const leftWidth = (leftActions?.length || 0) * ACTION_WIDTH;

	const handleSwipeStart = () => {
		// Use gesture detection for full swipe support
	};

	const openRight = () => {
		if (Platform.OS === "ios") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		Animated.spring(translateX, {
			toValue: -rightWidth,
			useNativeDriver: true,
			damping: 20,
		}).start();
		isOpen.current = true;
	};

	const openLeft = () => {
		if (Platform.OS === "ios") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		Animated.spring(translateX, {
			toValue: leftWidth,
			useNativeDriver: true,
			damping: 20,
		}).start();
		isOpen.current = true;
	};

	const close = () => {
		Animated.spring(translateX, {
			toValue: 0,
			useNativeDriver: true,
			damping: 20,
		}).start();
		isOpen.current = false;
	};

	const handlePress = () => {
		if (isOpen.current) {
			close();
		}
	};

	const handleLongPress = () => {
		if (rightActions && rightActions.length > 0 && !isOpen.current) {
			openRight();
		}
	};

	return (
		<View style={styles.container}>
			{/* Left Actions */}
			{leftActions && (
				<View style={[styles.actionsLeft, { width: leftWidth }]}>
					{leftActions.map((action, i) => (
						<Pressable
							key={`left-${i}`}
							style={[styles.action, { backgroundColor: action.color, width: ACTION_WIDTH }]}
							onPress={() => {
								action.onPress();
								close();
							}}
						>
							{action.icon && <Text style={styles.actionIcon}>{action.icon}</Text>}
							<Text style={styles.actionLabel}>{action.label}</Text>
						</Pressable>
					))}
				</View>
			)}

			{/* Right Actions */}
			{rightActions && (
				<View style={[styles.actionsRight, { width: rightWidth }]}>
					{rightActions.map((action, i) => (
						<Pressable
							key={`right-${i}`}
							style={[styles.action, { backgroundColor: action.color, width: ACTION_WIDTH }]}
							onPress={() => {
								if (Platform.OS === "ios") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
								action.onPress();
								close();
							}}
						>
							{action.icon && <Text style={styles.actionIcon}>{action.icon}</Text>}
							<Text style={styles.actionLabel}>{action.label}</Text>
						</Pressable>
					))}
				</View>
			)}

			{/* Main Content */}
			<Animated.View
				style={[
					styles.content,
					{ backgroundColor: colors.background, transform: [{ translateX }] },
				]}
			>
				<Pressable onPress={handlePress} onLongPress={handleLongPress}>
					{children}
				</Pressable>
			</Animated.View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		position: "relative",
		overflow: "hidden",
	},
	content: {
		zIndex: 1,
	},
	actionsLeft: {
		position: "absolute",
		left: 0,
		top: 0,
		bottom: 0,
		flexDirection: "row",
	},
	actionsRight: {
		position: "absolute",
		right: 0,
		top: 0,
		bottom: 0,
		flexDirection: "row",
	},
	action: {
		alignItems: "center",
		justifyContent: "center",
	},
	actionIcon: {
		fontSize: 20,
		color: "#FFF",
		marginBottom: 2,
	},
	actionLabel: {
		color: "#FFF",
		fontSize: 11,
		fontWeight: "600",
	},
});
