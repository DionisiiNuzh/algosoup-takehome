import type { ModelEnv } from "./categorisation.ts";
export { ReviewAnalysis } from "./analysis-object.ts";

interface AnalysisNamespace {
  idFromName(name: string): unknown;
  get(id: unknown): { fetch(request: Request): Promise<Response> };
}
interface Env extends ModelEnv {
  ANALYSES?: AnalysisNamespace;
  ASSETS: { fetch(request: Request): Promise<Response> };
}

import { fetchLatestReviews, ReviewInputError } from "./reviews.ts";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/health") {
      return Response.json({ status: "ok" });
    }

    if (pathname === "/api/analyses" || pathname.startsWith("/api/analyses/")) {
      const match = pathname.match(
        /^\/api\/analyses(?:\/([a-f0-9-]{36})(\/resume|\/tasks\/[a-f0-9-]{36})?)?$/,
      );
      if (!match) return Response.json({ error: "Not found" }, { status: 404 });
      const [, id, action = ""] = match;
      const method =
        !id || action === "/resume" ? "POST" : action ? "PATCH" : "GET";
      if (request.method !== method)
        return Response.json(
          { error: `Use ${method}` },
          { status: 405, headers: { Allow: method } },
        );
      if (!env.ANALYSES)
        return Response.json(
          { error: "Analysis storage is not configured." },
          { status: 503 },
        );
      if ((!id || action === "/resume") && !env.ANTHROPIC_API_KEY)
        return Response.json(
          {
            error:
              "Set the ANTHROPIC_API_KEY Worker secret to start categorisation.",
          },
          { status: 503 },
        );
      try {
        if (!id) {
          const body = (await request.json()) as Record<string, unknown> | null;
          if (!body || typeof body !== "object" || Array.isArray(body))
            return Response.json(
              { error: "Expected a JSON object" },
              { status: 400 },
            );
          const imported = await fetchLatestReviews({
            app: body.app,
            count: body.count,
          });
          const analysisId = crypto.randomUUID();
          const stub = env.ANALYSES.get(env.ANALYSES.idFromName(analysisId));
          return await stub.fetch(
            new Request("https://analysis/init", {
              method: "POST",
              body: JSON.stringify({ id: analysisId, imported }),
            }),
          );
        }
        const stub = env.ANALYSES.get(env.ANALYSES.idFromName(id));
        return await stub.fetch(
          new Request(`https://analysis${action || "/"}`, {
            method: request.method,
            body: request.method === "PATCH" ? await request.text() : undefined,
          }),
        );
      } catch (error) {
        if (error instanceof SyntaxError || error instanceof ReviewInputError)
          return Response.json(
            {
              error:
                error instanceof ReviewInputError
                  ? error.message
                  : "Expected a JSON body",
            },
            { status: 400 },
          );
        console.error(
          "Analysis request failed:",
          error instanceof Error ? error.message : String(error),
        );
        return Response.json(
          { error: "Could not load or start analysis. Please try again." },
          { status: 502 },
        );
      }
    }

    if (pathname === "/api/reviews") {
      if (request.method !== "POST") {
        return Response.json(
          { error: "Use POST" },
          { status: 405, headers: { Allow: "POST" } },
        );
      }
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return Response.json(
          { error: "Expected a JSON body" },
          { status: 400 },
        );
      }
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return Response.json(
          { error: "Expected a JSON object" },
          { status: 400 },
        );
      }
      try {
        return Response.json(
          await fetchLatestReviews({
            app: "app" in body ? body.app : undefined,
            count: "count" in body ? body.count : undefined,
          }),
          { headers: { "Cache-Control": "no-store" } },
        );
      } catch (error) {
        if (error instanceof ReviewInputError) {
          return Response.json({ error: error.message }, { status: 400 });
        }
        console.error(
          "Review fetch failed:",
          error instanceof Error ? error.message : String(error),
        );
        return Response.json(
          { error: "Could not fetch Google Play reviews. Please try again." },
          { status: 502 },
        );
      }
    }

    if (pathname.startsWith("/api/")) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },
};
