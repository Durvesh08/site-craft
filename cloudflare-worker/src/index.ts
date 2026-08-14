export interface Env {
  // The KV namespace for domain -> project mapping
  DOMAIN_MAPPING: KVNamespace;
  // The R2 bucket containing the generated project sites
  PROJECT_STORAGE: R2Bucket;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const hostname = url.hostname;

    // 1. Look up the domain in the KV namespace to get the project_id
    const projectId = await env.DOMAIN_MAPPING.get(hostname);

    if (!projectId) {
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head><title>Domain Not Connected</title><style>body { font-family: system-ui, sans-serif; text-align: center; padding: 50px; background: #f9fafb; color: #111827; } h1 { font-size: 2em; margin-bottom: 0.5em; } p { color: #4b5563; }</style></head>
        <body>
          <h1>Domain Not Connected</h1>
          <p>This domain is not currently connected to a Zovaix project.</p>
        </body>
        </html>`,
        {
          status: 404,
          headers: { "Content-Type": "text/html" },
        }
      );
    }

    // 2. Fetch that project's generated site content from the R2 bucket
    // Extract the path from the URL
    let pathName = url.pathname;
    if (pathName === "/") {
      pathName = "/index.html";
    }

    // Determine the object key in R2.
    // E.g., if path is /style.css, objectKey is projects/project_id/style.css
    let objectKey = \`projects/\${projectId}\${pathName}\`;
    let object = await env.PROJECT_STORAGE.get(objectKey);

    // Fallback if not found: try fetching index.html (SPA routing behavior)
    if (!object && pathName !== "/index.html") {
      objectKey = \`projects/\${projectId}/index.html\`;
      object = await env.PROJECT_STORAGE.get(objectKey);
    }

    // Second fallback: try without 'projects/' prefix
    if (!object) {
      objectKey = \`\${projectId}\${pathName === "/" ? "/index.html" : pathName}\`;
      object = await env.PROJECT_STORAGE.get(objectKey);
    }
    if (!object && pathName !== "/index.html") {
      objectKey = \`\${projectId}/index.html\`;
      object = await env.PROJECT_STORAGE.get(objectKey);
    }

    if (!object) {
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head><title>Site Not Ready</title><style>body { font-family: system-ui, sans-serif; text-align: center; padding: 50px; background: #f9fafb; color: #111827; } h1 { font-size: 2em; margin-bottom: 0.5em; } p { color: #4b5563; }</style></head>
        <body>
          <h1>Site Not Ready</h1>
          <p>This site is still being generated or is not available yet.</p>
        </body>
        </html>`,
        {
          status: 404,
          headers: { "Content-Type": "text/html" },
        }
      );
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    
    // Guess basic content types if not set by R2
    if (!headers.has("Content-Type")) {
      if (objectKey.endsWith(".html")) {
        headers.set("Content-Type", "text/html; charset=utf-8");
      } else if (objectKey.endsWith(".css")) {
        headers.set("Content-Type", "text/css; charset=utf-8");
      } else if (objectKey.endsWith(".js")) {
        headers.set("Content-Type", "application/javascript; charset=utf-8");
      } else if (objectKey.endsWith(".json")) {
        headers.set("Content-Type", "application/json; charset=utf-8");
      }
    }

    return new Response(object.body, {
      headers,
    });
  },
};
