import { createRoute } from "honox/factory";
import { NotFound, NOT_FOUND_TITLE } from "#components/NotFound";

// Built to dist/404.html; Cloudflare serves it for unknown paths.
export default createRoute((c) =>
  c.render(<NotFound />, { title: NOT_FOUND_TITLE }),
);
