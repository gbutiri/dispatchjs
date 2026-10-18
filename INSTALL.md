# Install Dispatch Framework

This command sets up a new project with the full dispatch framework development environment.

---

## Step 1: Gather Project Info

Ask the user for:
- **Project name** (e.g., "myapp", "blog-api")
- **OS** (Windows / macOS / Linux)
- **Python command** (`py` for Windows, `python3` for Unix)

Use current working directory as project path.

## Step 2: Copy Scaffolding to Project Root

From this skill's `scaffolding/` folder, copy to project root:
- `scaffolding/CLAUDE.md` → `CLAUDE.md`
- `scaffolding/.claude/` → `.claude/`

## Step 3: Copy Framework Assets

From this skill, copy to project:
- `assets/dispatch.css` → `static/framework/dispatch.css`
- `assets/dispatch.js` → `static/framework/dispatch.js`
- `assets/mini-upload-form/` → `static/mini-upload-form/`

## Step 4: Copy Helper Libraries

From this skill's `scripts/` folder, copy to project:
- `scripts/dbsqlite.py` → `libs/dbsqlite.py`
- `scripts/llm.py` → `libs/llm.py`
- `scripts/backup.py` → `scripts/backup.py`

## Step 5: Create Project Folders

Create these folders if they don't exist:
```
db/
libs/
scripts/
static/framework/
templates/
templates/partials/
```

## Step 6: Fill In Placeholders

In the newly created `CLAUDE.md`, replace:
- `{{PROJECT_NAME}}` → user's project name
- `{{OS}}` → user's OS
- `{{PROJECT_PATH}}` → current working directory
- `{{PYTHON_CMD}}` → user's Python command

## Step 7: Verify Installation

Confirm all files exist:

**Scaffolding:**
- [ ] CLAUDE.md
- [ ] .claude/CURRENT_STATE.md
- [ ] .claude/PROTOCOLS.md
- [ ] .claude/commands/init.md
- [ ] .claude/commands/wrap.md
- [ ] .claude/documentation/behavioral-guidelines.md
- [ ] .claude/documentation/mistakes-to-avoid.md

**Framework:**
- [ ] static/framework/dispatch.js
- [ ] static/framework/dispatch.css
- [ ] static/mini-upload-form/

**Libraries:**
- [ ] libs/dbsqlite.py
- [ ] libs/llm.py
- [ ] scripts/backup.py

**Folders:**
- [ ] db/
- [ ] templates/
- [ ] templates/partials/

## Step 8: Done

Say: **"Dispatch framework installed. Run `/init` to start."**

---

**Note:** This file is part of the skill and stays here. It doesn't get copied or deleted.
