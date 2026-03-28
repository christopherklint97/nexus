import { useEffect, useState } from "react";
import { Dimensions, Platform } from "react-native";

export type LayoutMode = "mobile" | "tablet" | "desktop";

interface ResponsiveLayout {
	mode: LayoutMode;
	width: number;
	height: number;
	isMobile: boolean;
	isTablet: boolean;
	isDesktop: boolean;
	sidebarWidth: number;
	showPersistentSidebar: boolean;
	contentMaxWidth: number;
}

export function useResponsiveLayout(): ResponsiveLayout {
	const [dimensions, setDimensions] = useState(Dimensions.get("window"));

	useEffect(() => {
		const sub = Dimensions.addEventListener("change", ({ window }) => {
			setDimensions(window);
		});
		return () => sub.remove();
	}, []);

	const { width, height } = dimensions;

	let mode: LayoutMode;
	if (width >= 1024) {
		mode = "desktop";
	} else if (width >= 768) {
		mode = "tablet";
	} else {
		mode = "mobile";
	}

	return {
		mode,
		width,
		height,
		isMobile: mode === "mobile",
		isTablet: mode === "tablet",
		isDesktop: mode === "desktop",
		sidebarWidth: mode === "desktop" ? 280 : mode === "tablet" ? 260 : 300,
		showPersistentSidebar: mode === "desktop",
		contentMaxWidth: mode === "desktop" ? 900 : width,
	};
}
