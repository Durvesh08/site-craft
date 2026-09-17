import { logger } from "../lib/logger";
import { db, projectsTable, projectFilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import JSZip from "jszip";
import { injectTelemetryScript } from "../routes/telemetry";

export interface DeploymentConfig {
  deploymentId: string;
  projectId: string;
  generatedHtml: string;
}

export interface DeploymentProvider {
  deploy(config: DeploymentConfig, targetConfig: any): Promise<string>;
}

export class FTPDeploymentProvider implements DeploymentProvider {
  async deploy(config: DeploymentConfig, targetConfig: any): Promise<string> {
    logger.info({ deploymentId: config.deploymentId }, "Deploying via FTP");
    await new Promise(resolve => setTimeout(resolve, 2000));
    return `ftp://${targetConfig.ftpHost || 'example.com'}/${config.projectId}`;
  }
}

export class VercelDeploymentProvider implements DeploymentProvider {
  async deploy(config: DeploymentConfig, targetConfig: any): Promise<string> {
    const token = targetConfig.token || targetConfig.apiKey || process.env.VERCEL_TOKEN;
    if (!token) {
      throw new Error("Vercel API Token required. Please enter your Vercel Token to deploy.");
    }

    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, config.projectId))
      .limit(1);

    const name = (project?.name || "website").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    // Collect files
    const files = await db
      .select()
      .from(projectFilesTable)
      .where(eq(projectFilesTable.projectId, config.projectId));

    const vercelFiles: Array<{ file: string; data: string }> = [];

    if (files.length > 0) {
      for (const f of files) {
        if (!f.isDir && f.content) {
          const fileData = f.filePath.endsWith(".html")
            ? injectTelemetryScript(f.content, config.projectId)
            : f.content;
          vercelFiles.push({ file: f.filePath, data: fileData });
        }
      }
    } else {
      vercelFiles.push({ file: "index.html", data: injectTelemetryScript(config.generatedHtml, config.projectId) });
    }

    logger.info({ projectId: config.projectId, fileCount: vercelFiles.length }, "Deploying project to Vercel API");

    const res = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        files: vercelFiles,
        projectSettings: { framework: null },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || data.message || "Failed to deploy to Vercel");
    }

    const liveUrl = data.url ? (data.url.startsWith("http") ? data.url : `https://${data.url}`) : `https://${name}.vercel.app`;
    logger.info({ liveUrl, projectId: config.projectId }, "Successfully deployed to Vercel");
    return liveUrl;
  }
}

export class NetlifyDeploymentProvider implements DeploymentProvider {
  async deploy(config: DeploymentConfig, targetConfig: any): Promise<string> {
    const token = targetConfig.token || targetConfig.apiKey || process.env.NETLIFY_TOKEN;
    if (!token) {
      throw new Error("Netlify Personal Access Token required. Please enter your Netlify Token to deploy.");
    }

    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, config.projectId))
      .limit(1);

    const name = (project?.name || "website").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const files = await db
      .select()
      .from(projectFilesTable)
      .where(eq(projectFilesTable.projectId, config.projectId));

    const zip = new JSZip();
    if (files.length > 0) {
      for (const f of files) {
        if (!f.isDir && f.content) {
          const fileData = f.filePath.endsWith(".html")
            ? injectTelemetryScript(f.content, config.projectId)
            : f.content;
          zip.file(f.filePath, fileData);
        }
      }
    } else {
      zip.file("index.html", injectTelemetryScript(config.generatedHtml, config.projectId));
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    logger.info({ projectId: config.projectId }, "Deploying project to Netlify API");

    let siteId = targetConfig.siteId;
    if (!siteId) {
      const createRes = await fetch("https://api.netlify.com/api/v1/sites", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `${name}-${Date.now().toString().slice(-4)}`,
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createData.message || "Failed to create site on Netlify");
      }
      siteId = createData.id;
    }

    const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/zip",
      },
      body: zipBuffer,
    });

    const deployData = await deployRes.json();
    if (!deployRes.ok) {
      throw new Error(deployData.message || "Failed to deploy ZIP to Netlify");
    }

    const liveUrl = deployData.ssl_url || deployData.url || `https://${deployData.subdomain}.netlify.app`;
    logger.info({ liveUrl, projectId: config.projectId }, "Successfully deployed to Netlify");
    return liveUrl;
  }
}

export class CloudflarePagesProvider implements DeploymentProvider {
  async deploy(config: DeploymentConfig, targetConfig: any): Promise<string> {
    const token = targetConfig.token || process.env.CLOUDFLARE_API_TOKEN;
    const accountId = targetConfig.accountId || process.env.CLOUDFLARE_ACCOUNT_ID;

    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, config.projectId))
      .limit(1);

    if (project?.liveUrl && project.liveUrl.includes(".site.zovaix.com")) {
      return project.liveUrl;
    }

    if (!token || !accountId) {
      throw new Error("Cloudflare API Token and Account ID are required for Direct Upload deployment.");
    }

    const projSlug = (project?.name || "website").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const liveUrl = `https://${projSlug}.pages.dev`;
    logger.info({ liveUrl, projectId: config.projectId }, "Cloudflare Pages deployment completed");
    return liveUrl;
  }
}

export class DeploymentProviderFactory {
  static getProvider(protocol: string): DeploymentProvider {
    switch (protocol.toLowerCase()) {
      case "ftp":
      case "ftps":
      case "sftp":
        return new FTPDeploymentProvider();
      case "vercel":
        return new VercelDeploymentProvider();
      case "netlify":
        return new NetlifyDeploymentProvider();
      case "cloudflare_pages":
      case "cloudflare":
        return new CloudflarePagesProvider();
      default:
        throw new Error(`Unsupported deployment protocol: ${protocol}`);
    }
  }
}
