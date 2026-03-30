import { Hono } from "hono";
import { applications } from "~/routes/applications.routes";

const app = new Hono();

app.get("/", (c) => {
	return c.text("Hello Hono!");
});

app.route("/landlord/applications", applications);

export default app;
