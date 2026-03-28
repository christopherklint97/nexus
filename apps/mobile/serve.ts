// Simple static file server for Expo web export
const port = Number(process.env.PORT) || 4001;

Bun.serve({
	port,
	async fetch(req) {
		const url = new URL(req.url);
		let pathname = url.pathname;

		// Try exact file first
		let file = Bun.file(`./dist${pathname}`);
		if (await file.exists()) {
			return new Response(file);
		}

		// Try with .html extension
		file = Bun.file(`./dist${pathname}.html`);
		if (await file.exists()) {
			return new Response(file);
		}

		// Try index.html in directory
		file = Bun.file(`./dist${pathname}/index.html`);
		if (await file.exists()) {
			return new Response(file);
		}

		// SPA fallback — serve index.html for all routes
		file = Bun.file("./dist/index.html");
		if (await file.exists()) {
			return new Response(file);
		}

		return new Response("Not Found", { status: 404 });
	},
});

console.log(`Nexus Web serving on http://localhost:${port}`);
