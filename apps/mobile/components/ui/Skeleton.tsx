import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type ViewStyle } from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";

interface SkeletonProps {
	width?: number | string;
	height?: number;
	borderRadius?: number;
	style?: ViewStyle;
}

export function Skeleton({ width = "100%", height = 16, borderRadius = 6, style }: SkeletonProps) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const opacity = useRef(new Animated.Value(0.3)).current;

	useEffect(() => {
		const animation = Animated.loop(
			Animated.sequence([
				Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
				Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
			]),
		);
		animation.start();
		return () => animation.stop();
	}, [opacity]);

	return (
		<Animated.View
			style={[
				{
					width: width as any,
					height,
					borderRadius,
					backgroundColor: colors.border,
					opacity,
				},
				style,
			]}
		/>
	);
}

// Pre-built skeleton patterns for common layouts

export function SkeletonCard() {
	return (
		<View style={skStyles.card}>
			<Skeleton height={18} width="60%" />
			<Skeleton height={13} width="90%" style={{ marginTop: 8 }} />
			<Skeleton height={13} width="40%" style={{ marginTop: 6 }} />
		</View>
	);
}

export function SkeletonListItem() {
	return (
		<View style={skStyles.listItem}>
			<Skeleton width={36} height={36} borderRadius={8} />
			<View style={{ flex: 1, gap: 6 }}>
				<Skeleton height={14} width="70%" />
				<Skeleton height={11} width="45%" />
			</View>
		</View>
	);
}

export function SkeletonTableRow() {
	return (
		<View style={skStyles.tableRow}>
			<Skeleton width={30} height={14} />
			<Skeleton height={14} style={{ flex: 1 }} />
			<Skeleton height={14} style={{ flex: 1 }} />
			<Skeleton height={14} width={80} />
		</View>
	);
}

export function SkeletonScreen({ rows = 6 }: { rows?: number }) {
	return (
		<View style={skStyles.screen}>
			{Array.from({ length: rows }).map((_, i) => (
				<SkeletonCard key={i} />
			))}
		</View>
	);
}

const skStyles = StyleSheet.create({
	card: {
		padding: 16,
		marginBottom: 10,
	},
	listItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingHorizontal: 16,
		paddingVertical: 10,
	},
	tableRow: {
		flexDirection: "row",
		gap: 12,
		paddingHorizontal: 16,
		paddingVertical: 8,
	},
	screen: {
		padding: 16,
		gap: 6,
	},
});
