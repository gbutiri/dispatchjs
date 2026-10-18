# /install - Set Up Dispatch Framework

Install the dispatch framework development environment in the current project.

## Skill Location

The skill files (scaffolding/, assets/, scripts/, references/) are in the current working directory.

All source paths below are relative to the current folder.

---

## Step 1: Ask User for Project Info

Ask for:
- **Project name** (e.g., "myapp", "blog-api")
- **OS** (Windows / macOS / Linux)
- **Python command** (`py` for Windows, `python3` for Unix)

Use current working directory as `PROJECT_PATH`.

## Step 2: Create Folders

Create these in project root:
```
db/
libs/
scripts/
static/framework/
static/mini-upload-form/
templates/
templates/partials/
.claude/
.claude/commands/
.claude/documentation/
.claude/plans/
.claude/summaries/
.claude/summaries/archive/
```

## Step 3: Copy Files

**From skill's `scaffolding/` to project root:**
- `scaffolding/CLAUDE.md` → `./CLAUDE.md`
- `scaffolding/.claude/CURRENT_STATE.md` → `./.claude/CURRENT_STATE.md`
- `scaffolding/.claude/PROTOCOLS.md` → `./.claude/PROTOCOLS.md`
- `scaffolding/.claude/commands/init.md` → `./.claude/commands/init.md`
- `scaffolding/.claude/commands/wrap.md` → `./.claude/commands/wrap.md`
- `scaffolding/.claude/documentation/behavioral-guidelines.md` → `./.claude/documentation/behavioral-guidelines.md`
- `scaffolding/.claude/documentation/mistakes-to-avoid.md` → `./.claude/documentation/mistakes-to-avoid.md`

**From skill's `assets/` to project:**
- `assets/dispatch.css` → `./static/framework/dispatch.css`
- `assets/dispatch.js` → `./static/framework/dispatch.js`
- `assets/mini-upload-form/` (entire folder) → `./static/mini-upload-form/`

**From skill's `scripts/` to project:**
- `scripts/dbsqlite.py` → `./libs/dbsqlite.py`
- `scripts/llm.py` → `./libs/llm.py`
- `scripts/backup.py` → `./scripts/backup.py`

## Step 4: Fill Placeholders in CLAUDE.md

In the newly created `./CLAUDE.md`, replace:
- `{{PROJECT_NAME}}` → user's project name
- `{{OS}}` → user's OS
- `{{PROJECT_PATH}}` → current working directory
- `{{PYTHON_CMD}}` → user's Python command

## Step 5: Verify

Check these files exist:
- `./CLAUDE.md`
- `./.claude/CURRENT_STATE.md`
- `./.claude/PROTOCOLS.md`
- `./.claude/commands/init.md`
- `./.claude/commands/wrap.md`
- `./.claude/documentation/behavioral-guidelines.md`
- `./.claude/documentation/mistakes-to-avoid.md`
- `./static/framework/dispatch.js`
- `./static/framework/dispatch.css`
- `./libs/dbsqlite.py`
- `./libs/llm.py`

## Step 6: Done

Say: **"Dispatch framework installed. Run `/init` to start."**
