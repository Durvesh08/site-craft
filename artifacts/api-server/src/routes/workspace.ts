import { Router, Request, Response, IRouter } from "express";

const workspaceRouter: IRouter = Router();

export interface WorkspaceUsage {
  aiCreditsUsed: number;
  aiCreditsTotal: number;
  storageUsedMB: number;
  storageTotalMB: number;
  deploymentsCount: number;
  deploymentsTotal: number;
}

export interface WorkspaceProfile {
  id: string;
  name: string;
  avatarLetter: string;
  handle?: string;
  defaultMemberCreditLimit: number;
}

let usageState: WorkspaceUsage = {
  aiCreditsUsed: 14200,
  aiCreditsTotal: 50000,
  storageUsedMB: 1900,
  storageTotalMB: 10000,
  deploymentsCount: 8,
  deploymentsTotal: 50
};

let profileState: WorkspaceProfile = {
  id: 'da4276813087dedd48ca',
  name: 'Zovaix Production Studio',
  avatarLetter: 'Z',
  handle: 'zovaix-studio',
  defaultMemberCreditLimit: 1
};

// GET /api/workspace/usage — Usage meters API
workspaceRouter.get("/api/workspace/usage", (_req: Request, res: Response) => {
  res.json({
    success: true,
    usage: usageState
  });
});

// GET /api/workspace/settings — Get workspace profile & settings
workspaceRouter.get("/api/workspace/settings", (_req: Request, res: Response) => {
  res.json({
    success: true,
    workspace: profileState
  });
});

// PATCH /api/workspace/settings — Update workspace settings
workspaceRouter.patch("/api/workspace/settings", (req: Request, res: Response) => {
  const { name, handle, defaultMemberCreditLimit } = req.body;

  if (name) profileState.name = name;
  if (handle) profileState.handle = handle;
  if (typeof defaultMemberCreditLimit === 'number') {
    profileState.defaultMemberCreditLimit = defaultMemberCreditLimit;
  }

  res.json({
    success: true,
    message: "Workspace settings updated",
    workspace: profileState
  });
});

export default workspaceRouter;
