---
name: dispatch-framework
description: George's default development stack for Python/Flask projects. Use when building or working on Flask applications, implementing AJAX interactions, creating database schemas, writing SQL queries, building HTML/Bootstrap UIs, or working on any Python web project. This is the mandatory framework for all George's Python projects - always apply these patterns unless explicitly told otherwise.
---

# Dispatch Framework

George's complete development stack for Python/Flask web applications. This skill provides the standardized patterns, helpers, and conventions used across all projects.

## When to Use This Skill

**ALWAYS use when:**
- Building or modifying Flask applications
- Implementing AJAX interactions
- Creating or querying databases
- Writing HTML templates with Bootstrap
- Working on any Python web project for George

**This is George's default stack** - apply these patterns automatically for all Python/Flask work unless explicitly told to use different approaches.

## Core Components

### 1. Dispatch AJAX Framework
Backend-controlled AJAX system where Flask routes return JSON instructions for DOM manipulation.

**Key principle:** Backend makes ALL decisions. Frontend is declarative using `data-*` attributes.

**Read:** `references/dispatch-framework.md` for:
- Response format (`htmls`, `vboxclose`, `redirect`, etc.)
- Anti-patterns (never use `<button>` for actions, never use onclick)
- VBox modal system
- Multi-request patterns

**Read:** `references/coding-standards.md` for:
- Button/anchor rules (ALWAYS `<a>` for actions)
- Modal close patterns
- LLM integration (local-first)

**Files:**
- `scripts/dispatch.js` - Framework implementation
- `assets/dispatch.css` - Framework styles

### 2. Database Layer
SQLite with strict naming conventions and a centralized helper.

**Read:** `references/SQL-STANDARDS.md` for:
- Table naming (plural, snake_case)
- Column prefixes (`msg_id`, `sum_content`, etc.)
- Timestamp suffixes (`_created`, `_updated`)
- Query patterns
- Parameterized queries

**Read:** `references/database-conventions.md` for:
- UNI-specific patterns
- Foreign key conventions
- Common query examples

**Helper:** `scripts/dbsqlite.py`
```python
from libs.dbsqlite import sql

# Always use parameterized queries
messages = sql("SELECT * FROM messages WHERE user_id = ?", (user_id,))
msg_id = sql("INSERT INTO messages (msg_content) VALUES (?)", (content,))
```

### 3. UI Patterns
Bootstrap 5 with standardized components and dispatch integration.

**Read:** `references/ui-patterns.md` for:
- Form patterns (ajaxform, autosave)
- Badge styling (message types, levels)
- Modal templates
- Icon standards
- Two-step deletion pattern

**Critical rules from coding-standards:**
- Use `<a class="tmbtn">` for action buttons, NOT `<button>`
- VBox modals have built-in close icons - don't add close buttons
- Use `data-vboxclose="true"` to close modals

### 4. Helper Libraries

**Database:** `scripts/dbsqlite.py`
- `sql()` function with connection pooling
- Automatic retry logic
- Dict result formatting

**LLM:** `scripts/llm.py`
- Groq API and local LLM support
- **CRITICAL:** Always use `provider='local'` by default
- Only use Groq when explicitly mentioned

**Backup:** `scripts/backup.py`
- Generate database schema docs
- Generate folder structure
- Generate requirements.txt
- Adjust `exclude_folders` per project

## Project Setup Pattern

### 1. Install Dependencies
```bash
py -m pip install flask python-dotenv requests
```

### 2. Create Project Structure
```
project/
├── app.py                    # Flask app entry point
├── db/
│   └── project.db           # SQLite database
├── libs/
│   ├── dbsqlite.py          # Copy from skill
│   ├── llm.py               # Copy from skill
│   └── backup.py            # Copy from skill
├── static/
│   ├── css/
│   │   └── dispatch.css     # Copy from skill
│   └── js/
│       └── dispatch.js      # Copy from skill
├── templates/
│   ├── base.html
│   └── partials/
│       └── prompt.html      # Universal confirmation
└── .env                      # GROQ_API_KEY=...
```

### 3. Database Setup
Follow SQL-STANDARDS.md:
- Plural table names: `messages`, `users`
- Column prefixes: `msg_id`, `user_id`
- Timestamps: `msg_created`, `msg_updated`

### 4. Flask Route Pattern
```python
from flask import Flask, jsonify, render_template, request
from libs.dbsqlite import sql

@bp.route('/module/action', methods=['POST'])
def action():
    # Validate user
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Not authenticated"})
    
    # Get form data
    data = request.form.get('field_name')
    
    # Process
    result = process_data(data)
    
    # Return dispatch response
    return jsonify({
        "htmls": {
            "#container": render_template('partial.html', data=result)
        },
        "values": {
            "#input": ""
        }
    })
```

### 5. HTML Template Pattern
```html
<form class="ajaxform" data-module="module" data-action="action">
    <input name="field_name" class="form-control" required>
    <button type="submit" class="btn btn-primary">Submit</button>
</form>

<a class="btn btn-danger tmbtn" 
   data-module="module" 
   data-action="delete-prompt/{{ id }}">
    Delete
</a>
```

## Critical Rules

### Always
1. Use `<a class="tmbtn">` for actions, NOT `<button>`
2. Use parameterized queries: `sql("... WHERE id = ?", (id,))`
3. Prefix columns: `msg_id`, not `id`
4. Use `provider='local'` for LLM by default
5. Backend controls everything - no JavaScript DOM manipulation

### Never
1. Never use onclick handlers
2. Never use `<button>` for tmbtn actions
3. Never use `SELECT *` in production
4. Never concatenate user input into SQL
5. Never add close buttons to VBox modal footers

## File References

When implementing features, read these in order of relevance:

**For AJAX/Forms:**
1. `references/dispatch-framework.md` - Complete reference
2. `references/coding-standards.md` - HTML/button rules

**For Database:**
1. `references/SQL-STANDARDS.md` - Query patterns
2. `references/database-conventions.md` - Naming rules

**For UI:**
1. `references/ui-patterns.md` - Bootstrap components
2. `references/coding-standards.md` - Modal patterns

**For File Uploads:**
1. `references/file-uploads.md` - jQuery FileUpload integration
2. `assets/mini-upload-form/` - Complete upload widget

## User Preferences

Install command: `py -m pip install ...`

## Project Scaffolding (LLM Docker)

This skill includes everything to bootstrap a new project:

```
dispatch-framework/
├── INSTALL.md                         # Bootstrap instructions
├── SKILL.md
├── commands/
│   └── install.md                     # /install slash command
├── scripts/                           # Helper libraries
├── assets/                            # Framework JS/CSS
├── references/                        # Documentation
└── scaffolding/                       # Claude environment files
    ├── CLAUDE.md
    └── .claude/
```

### Quick Setup for New Projects

**Just run `/install`**

1. Open Claude in your new (empty) project folder
2. Run `/install`
3. Claude asks for project name, OS, Python command
4. Claude copies all files to the right places
5. Run `/init` to start working

**What gets installed:**
- `CLAUDE.md` + `.claude/` folder (session management)
- `static/framework/dispatch.js` + `dispatch.css`
- `static/mini-upload-form/` (file upload widget)
- `libs/dbsqlite.py`, `libs/llm.py`
- `scripts/backup.py`
- Standard folder structure (`db/`, `templates/`, etc.)

### What It Provides

- **Session continuity** - Claude remembers where you left off
- **Slash commands** - `/init` and `/wrap` for consistent workflows
- **Communication rules** - Direct, no fluff, user leads
- **Error tracking** - Mistakes added to docs, never repeated
- **Framework files** - Ready to start coding immediately
