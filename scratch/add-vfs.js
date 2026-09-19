const fs = require('fs');
const path = require('path');
const file = 'artifacts/api-server/src/routes/projects.ts';

const routeCode = `
// ── WebContainer Virtual File System Endpoint ──────────────────────────────
router.get("/:id/vfs", async (req: Request<GetProjectParams>, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Validate access
    const [project] = await db
      .select({ id: projectsTable.id })
      .from(projectsTable)
      .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, userId)))
      .limit(1);

    if (!project) return res.status(404).json({ error: "Project not found" });

    // Fetch all files from project_files
    const files = await db
      .select()
      .from(projectFilesTable)
      .where(eq(projectFilesTable.projectId, id));

    // Convert flat file list to hierarchical WebContainer FileSystemTree
    const tree: Record<string, any> = {};

    for (const file of files) {
      if (file.isDir) continue; // WebContainers auto-create directories based on file paths
      const parts = file.filePath.split('/').filter(Boolean);
      
      let current = tree;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
          current[part] = { directory: {} };
        }
        current = current[part].directory;
      }
      
      const fileName = parts[parts.length - 1];
      current[fileName] = {
        file: {
          contents: file.content || ""
        }
      };
    }

    res.json(tree);
  } catch (err: any) {
    logger.error({ err, projectId: req.params.id }, "Failed to generate VFS tree");
    res.status(500).json({ error: "Failed to generate VFS tree", details: err?.message });
  }
});
`;

let content = fs.readFileSync(file, 'utf8');
// Insert before module.exports or export default, or at the bottom before export { router } if it exists.
// Wait, projects.ts exports `export const projectsRouter = router;` or `export default router;`
if (content.includes('export const projectsRouter = router;')) {
    content = content.replace('export const projectsRouter = router;', routeCode + '\nexport const projectsRouter = router;');
} else if (content.includes('export default router;')) {
    content = content.replace('export default router;', routeCode + '\nexport default router;');
} else {
    console.log("Could not find export statement to hook onto.");
}

fs.writeFileSync(file, content);
console.log("Added /vfs route");
