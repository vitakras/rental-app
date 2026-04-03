import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	define: {
		__API_URL__: JSON.stringify(
			process.env.VITE_API_BASE_URL || "http://localhost:8788",
		),
	},
	plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
});
