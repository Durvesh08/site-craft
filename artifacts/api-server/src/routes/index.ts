import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import projectsRouter from "./projects";
import generationRouter from "./generation";
import jobsRouter from "./jobs";
import assetsRouter from "./assets";
import deploymentsRouter from "./deployments";
import analyticsRouter from "./analytics";
import promptsRouter from "./prompts";
import versionsRouter from "./versions";
import meRouter from "./me";
import settingsRouter from "./settings";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(meRouter);
router.use(projectsRouter);
router.use(generationRouter);
router.use(jobsRouter);
router.use(assetsRouter);
router.use(deploymentsRouter);
router.use(analyticsRouter);
router.use(promptsRouter);
router.use(versionsRouter);
router.use(settingsRouter);
router.use(storageRouter);

export default router;
