import { useEffect, useRef } from "react";
import {
	Animated as RNAnimated,
	Dimensions,
	Pressable,
	StyleSheet,
} from "react-native";
import { GestureHandlerRootView, PanGestureHandler, State } from "react-native-gesture-handler";

import { Sidebar } from "./Sidebar";

const DRAWER_WIDTH = 300;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Props {
	visible: boolean;
	onClose: () => void;
	onOpenQuickSwitcher: () => void;
}

export function DrawerOverlay({ visible, onClose, onOpenQuickSwitcher }: Props) {
	const translateX = useRef(new RNAnimated.Value(-DRAWER_WIDTH)).current;
	const backdropOpacity = useRef(new RNAnimated.Value(0)).current;

	useEffect(() => {
		if (visible) {
			RNAnimated.parallel([
				RNAnimated.spring(translateX, {
					toValue: 0,
					useNativeDriver: true,
					damping: 20,
					stiffness: 200,
				}),
				RNAnimated.timing(backdropOpacity, {
					toValue: 1,
					duration: 200,
					useNativeDriver: true,
				}),
			]).start();
		} else {
			RNAnimated.parallel([
				RNAnimated.spring(translateX, {
					toValue: -DRAWER_WIDTH,
					useNativeDriver: true,
					damping: 20,
					stiffness: 200,
				}),
				RNAnimated.timing(backdropOpacity, {
					toValue: 0,
					duration: 150,
					useNativeDriver: true,
				}),
			]).start();
		}
	}, [visible, translateX, backdropOpacity]);

	if (!visible) return null;

	return (
		<>
			{/* Backdrop */}
			<RNAnimated.View
				style={[
					styles.backdrop,
					{ opacity: backdropOpacity },
				]}
			>
				<Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
			</RNAnimated.View>

			{/* Drawer */}
			<RNAnimated.View
				style={[
					styles.drawer,
					{ width: DRAWER_WIDTH, transform: [{ translateX }] },
				]}
			>
				<Sidebar onClose={onClose} onOpenQuickSwitcher={onOpenQuickSwitcher} />
			</RNAnimated.View>
		</>
	);
}

const styles = StyleSheet.create({
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0,0,0,0.4)",
		zIndex: 100,
	},
	drawer: {
		position: "absolute",
		top: 0,
		left: 0,
		bottom: 0,
		zIndex: 101,
		elevation: 10,
		shadowColor: "#000",
		shadowOffset: { width: 2, height: 0 },
		shadowOpacity: 0.15,
		shadowRadius: 10,
	},
});
