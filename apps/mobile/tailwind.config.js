/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
	presets: [require("nativewind/preset")],
	theme: {
		extend: {
			colors: {
				ink: "#1A1A2E",
				accent: "#4361EE",
				surface: "#FAFAFA",
				"surface-dark": "#1E1E2E",
				success: "#10B981",
				warning: "#F59E0B",
				danger: "#EF4444",
				muted: "#94A3B8",
				border: "#E2E8F0",
				"border-dark": "#2D2D3F",
			},
			fontFamily: {
				sans: ["Inter"],
				mono: ["JetBrainsMono"],
			},
			borderRadius: {
				card: "12px",
			},
		},
	},
	plugins: [],
};
