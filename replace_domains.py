import os

def replace_in_file(path, old, new):
    if not os.path.exists(path):
        return
    with open(path, "r") as f:
        content = f.read()
    if old in content:
        content = content.replace(old, new)
        with open(path, "w") as f:
            f.write(content)
        print(f"Updated {path}: {old} -> {new}")

# 1. API Server Orchestrator (default domain)
replace_in_file("artifacts/api-server/src/ai/orchestrator.ts", "zovaix.site", "site.zovaix.com")

# 2. API Server Domains (CNAME target)
replace_in_file("artifacts/api-server/src/routes/domains.ts", "cname.zovaix.site", "site.zovaix.com")
replace_in_file("artifacts/api-server/src/routes/domains.ts", "zovaix.site", "site.zovaix.com")

# 3. API Server Workspace (Email sender + Invite link)
replace_in_file("artifacts/api-server/src/routes/workspace.ts", "invites@zovaix.site", "invites@zovaix.com")
replace_in_file("artifacts/api-server/src/routes/workspace.ts", "https://zovaix.site", "https://site.zovaix.com")
replace_in_file("artifacts/api-server/src/routes/workspace.ts", "zovaix.site", "site.zovaix.com") # Catch any stragglers

# 4. Frontend Workspace Service (Mock emails)
replace_in_file("artifacts/sitecraft/src/services/workspace.ts", "@zovaix.site", "@zovaix.com")

# 5. Frontend Deployments Service & Deployments Page
replace_in_file("artifacts/sitecraft/src/services/deployments.ts", "zovaix.site", "site.zovaix.com")
replace_in_file("artifacts/sitecraft/src/pages/deployments-page.tsx", "zovaix.site", "site.zovaix.com")

# 6. Everything else in frontend
for root, dirs, files in os.walk("artifacts/sitecraft/src"):
    for file in files:
        if file.endswith((".ts", ".tsx")):
            path = os.path.join(root, file)
            # We already handled workspace.ts and deployments.ts/tsx, but doing it again with the generic replace is safe if they don't have remaining zovaix.site
            with open(path, "r") as f:
                content = f.read()
            if "zovaix.site" in content:
                content = content.replace("zovaix.site", "site.zovaix.com")
                with open(path, "w") as f:
                    f.write(content)
                print(f"Updated {path} (generic rule)")
