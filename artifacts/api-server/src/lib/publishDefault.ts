import { ObjectStorageService } from "./objectStorage";
import { logger } from "./logger";

export async function republishToDefaultSubdomain(project: { id: string; name: string | null; generatedHtml: string | null; workspaceId?: string | null }) {
  const projectId = project.id;
  const generatedHtml = project.generatedHtml || "";

  // 1. Publish to R2
  try {
    const storageService = new ObjectStorageService();
    await storageService.putObject(`projects/${projectId}/index.html`, generatedHtml);
    logger.info({ projectId }, "Successfully published site to R2");
  } catch (publishErr) {
    logger.error({ err: publishErr, projectId }, "Failed to publish site to R2");
    throw new Error("Failed to publish to R2");
  }

  // 2. Map default subdomain and update Cloudflare KV
  const projectSlug = project.name
    ? project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    : project.id;
  const defaultDomain = `${projectSlug}.site.zovaix.com`;
  const deploymentUrl = `https://${defaultDomain}`;

  if (process.env.CLOUDFLARE_KV_NAMESPACE_ID && process.env.CLOUDFLARE_API_TOKEN) {
    try {
      const kvResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CLOUDFLARE_KV_NAMESPACE_ID}/values/${defaultDomain}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            "Content-Type": "text/plain",
          },
          body: projectId,
        }
      );
      if (!kvResponse.ok) {
        logger.error({ projectId, defaultDomain, errorText: await kvResponse.text() }, "Failed to write KV mapping");
      } else {
        logger.info({ projectId, defaultDomain }, "Wrote default domain mapping to Cloudflare KV");
      }
    } catch (kvErr) {
      logger.error({ err: kvErr, projectId, defaultDomain }, "Error writing to Cloudflare KV");
    }
  }

  return { url: deploymentUrl };
}
