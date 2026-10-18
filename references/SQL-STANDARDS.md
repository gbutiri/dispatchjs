# SQL and Database Standards

**Purpose:** Consistent database design standards for all AI projects

**Version:** 2.0 (Corrected)
**Last Updated:** 2025-11-04

---

## Philosophy

**Principles:**
1. **Clarity over cleverness** - Readable code is maintainable code
2. **Consistency everywhere** - Same patterns across all databases
3. **Self-documenting** - Names should explain purpose
4. **Future-proof** - Design for change, not just current needs
5. **Performance-aware** - Index intelligently, query efficiently

---

## Naming Conventions

### Table Names

**Format:** `lowercase_with_underscores` (snake_case)

**Rules:**
- Plural nouns (e.g., `messages`, `summaries`, `projects`, `users`)
- Descriptive and unambiguous
- No abbreviations unless universally understood
- For imported/external data: prefix with source (e.g., `llm_messages`, `llm_summaries`)

**Examples:**
```sql
✅ GOOD:
messages
summaries
projects
user_entities
llm_messages (imported from LLM source)
llm_summaries (imported summaries)

❌ BAD:
tblMessages (prefix)
Message (singular, CamelCase)
conv_msg (abbreviated)
msg (too short)
```

### Column Names

**Format:** `lowercase_with_underscores` (snake_case)

**THE MOST IMPORTANT RULE:**
- **Always prefix columns with singular table name**
- `messages` table → `msg_id`, `msg_content`, `msg_created`
- `summaries` table → `sum_id`, `sum_title`, `sum_content`, `sum_created`
- `projects` table → `project_id`, `project_name`, `project_created`
- `intents` table → `int_id`, `int_name`, `int_protocol`

**Standard Suffixes:**
- `_id` - Primary keys (INTEGER NOT NULL PRIMARY KEY)
- `_created` - Creation timestamps (TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)
- `_updated` - Update timestamps (TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)
- `_content` - Text content (TEXT)
- `_name` - Name fields (TEXT)
- `_ref_id` - External reference IDs (TEXT)

**Examples:**
```sql
✅ GOOD:
-- messages table
msg_id
msg_role
msg_content
msg_metadata
msg_type
msg_created
msg_updated

-- summaries table
sum_id
sum_title
sum_content
sum_reflection
sum_level
sum_date
sum_created
sum_updated

-- projects table
project_id
project_name
project_path
project_inbox_path
project_description
project_tech_stack
project_is_active
project_created
project_updated

❌ BAD:
id (no table prefix!)
created_at (wrong suffix - use _created)
updated_at (wrong suffix - use _updated)
content (no table prefix!)
name (no table prefix!)
createdDate (CamelCase)
```

### Foreign Key Naming

**Rules:**
- Use the **exact same name** as the referenced table's primary key
- If `users` table has `user_id`, all foreign keys reference it as `user_id`
- If `summaries` table has `sum_id`, all foreign keys reference it as `sum_id`

**Examples:**
```sql
-- messages table references users and summaries
CREATE TABLE messages (
    msg_id INTEGER NOT NULL PRIMARY KEY,
    msg_content TEXT,
    user_id INTEGER NOT NULL,  -- References users.user_id
    sum_id INTEGER DEFAULT 0,   -- References summaries.sum_id
    msg_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (sum_id) REFERENCES summaries(sum_id) ON DELETE SET NULL
);
```

### Index Names

**Format:** `idx_tablename_columnname` or `idx_tablename_column1_column2`

**Examples:**
```sql
✅ GOOD:
idx_messages_user_id
idx_messages_sum_id
idx_summaries_user_id
idx_projects_project_name

❌ BAD:
index1
msg_user_idx
idx_msg_user (abbreviated table name)
```

---

## Data Types

### SQLite Standard Types

**Use these consistently:**

```sql
-- Text
TEXT              -- Variable-length strings

-- Numeric
INTEGER           -- Whole numbers, auto-incrementing IDs
REAL              -- Floating-point numbers

-- Boolean
INTEGER           -- 0 = false, 1 = true (SQLite has no native BOOLEAN)

-- Timestamps
TIMESTAMP         -- Use SQLite's TIMESTAMP with DEFAULT CURRENT_TIMESTAMP

-- JSON
TEXT              -- Store JSON as text, use json_extract()
```

### Field Type Guidelines

**Primary Keys:**
```sql
-- Standard pattern: {table_prefix}_id
msg_id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT
sum_id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT
project_id TEXT PRIMARY KEY  -- Use TEXT for UUIDs in distributed systems
```

**Timestamps:**
```sql
-- ALWAYS use _created and _updated suffixes
-- NOT created_at or updated_at!
msg_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
msg_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
sum_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
sum_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
```

**Booleans:**
```sql
-- Use INTEGER with descriptive names
project_is_active INTEGER DEFAULT 1
sum_is_processed INTEGER DEFAULT 0

-- Can add CHECK constraint for safety
project_is_active INTEGER DEFAULT 1 CHECK(project_is_active IN (0, 1))
```

**Enums (Category Fields):**
```sql
-- Use TEXT with CHECK constraint
msg_role TEXT CHECK(msg_role IN ('system', 'user', 'assistant'))
msg_type TEXT CHECK(msg_type IN ('llm', 'regex', 'syntactic'))
priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'critical'))
```

**Counts:**
```sql
-- Use INTEGER with DEFAULT 0
message_count INTEGER DEFAULT 0
task_count INTEGER DEFAULT 0
```

**Paths:**
```sql
-- Use TEXT, always store absolute paths
project_path TEXT NOT NULL
project_inbox_path TEXT NOT NULL
```

**JSON:**
```sql
-- Store as TEXT
msg_metadata TEXT  -- Store JSON as text
project_tech_stack TEXT  -- Store JSON array as text
```

---

## Schema Design Patterns

### Primary Keys

**Auto-increment for local:**
```sql
CREATE TABLE messages (
    msg_id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    msg_content TEXT NOT NULL,
    msg_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**UUIDs for distributed systems:**
```sql
CREATE TABLE projects (
    project_id TEXT PRIMARY KEY,  -- UUID v4
    project_name TEXT NOT NULL,
    project_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Foreign Keys

**Always define with CASCADE/RESTRICT:**
```sql
CREATE TABLE messages (
    msg_id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    msg_content TEXT,
    user_id INTEGER NOT NULL,
    sum_id INTEGER DEFAULT 0,
    msg_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (sum_id) REFERENCES summaries(sum_id) ON DELETE SET NULL
);
```

**When to CASCADE vs RESTRICT:**
- **CASCADE** - Child records should be deleted with parent (e.g., messages when user deleted)
- **RESTRICT** - Prevent deletion if children exist (e.g., can't delete project with active tasks)
- **SET NULL** - Orphan child records (e.g., messages when summary deleted)

### Timestamps

**Always include both fields:**
```sql
CREATE TABLE example (
    example_id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    example_name TEXT NOT NULL,
    example_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    example_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger to auto-update example_updated
CREATE TRIGGER update_example_timestamp
AFTER UPDATE ON example
FOR EACH ROW
BEGIN
    UPDATE example SET example_updated = CURRENT_TIMESTAMP
    WHERE example_id = OLD.example_id;
END;
```

### Indexes

**Index foreign keys:**
```sql
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_sum_id ON messages(sum_id);
```

**Index frequently queried fields:**
```sql
CREATE INDEX idx_messages_msg_created ON messages(msg_created);
CREATE INDEX idx_projects_project_name ON projects(project_name);
```

**Composite indexes for common queries:**
```sql
-- If you often query: WHERE sum_id = 0 AND user_id = ?
CREATE INDEX idx_messages_sum_id_user_id ON messages(sum_id, user_id);

-- If you often query: WHERE user_id = ? AND sum_level = ?
CREATE INDEX idx_summaries_user_id_sum_level ON summaries(user_id, sum_level);
```

**Don't over-index:**
- Every index slows down INSERT/UPDATE/DELETE
- Only index fields you actually query
- Test performance before adding indexes

---

## Query Standards

### SELECT Queries

**Always specify columns (never SELECT *):**
```sql
✅ GOOD:
SELECT msg_id, msg_content, msg_created
FROM messages
WHERE user_id = ?;

❌ BAD:
SELECT * FROM messages;
```

**Use meaningful aliases:**
```sql
✅ GOOD:
SELECT
    p.project_id,
    p.project_name,
    COUNT(m.msg_id) AS message_count
FROM projects p
LEFT JOIN messages m ON p.project_id = m.project_id
GROUP BY p.project_id;

❌ BAD:
SELECT p.*, COUNT(m.id) AS cnt
FROM projects p, messages m
WHERE p.id = m.pid;
```

### INSERT Queries

**Always specify columns:**
```sql
✅ GOOD:
INSERT INTO projects (project_id, project_name, project_path)
VALUES (?, ?, ?);

❌ BAD:
INSERT INTO projects VALUES ('uuid-here', 'uni-app', '/path');
```

**Always use parameterized queries (prevent SQL injection):**
```python
✅ GOOD:
cursor.execute(
    "INSERT INTO projects (project_id, project_name) VALUES (?, ?)",
    (project_id, name)
)

❌ BAD:
cursor.execute(f"INSERT INTO projects (project_id, project_name) VALUES ('{project_id}', '{name}')")
```

### UPDATE Queries

**Always include WHERE clause:**
```sql
✅ GOOD:
UPDATE projects
SET project_is_active = 0
WHERE project_id = ?;

❌ BAD:
UPDATE projects SET project_is_active = 0;  -- Updates ALL rows!
```

### DELETE Queries

**Always include WHERE clause:**
```sql
✅ GOOD:
DELETE FROM messages
WHERE msg_created < datetime('now', '-30 days');

❌ BAD:
DELETE FROM messages;  -- Deletes ALL rows!
```

---

## Transaction Standards

**Always use transactions for multiple operations:**
```python
✅ GOOD:
conn = sqlite3.connect('database.db')
try:
    conn.execute('BEGIN TRANSACTION')

    # Multiple operations
    conn.execute("INSERT INTO projects (...) VALUES (?)", (data,))
    conn.execute("INSERT INTO messages (...) VALUES (?)", (data,))

    conn.commit()
except Exception as e:
    conn.rollback()
    raise e
finally:
    conn.close()

❌ BAD:
conn.execute("INSERT INTO projects (...) VALUES (?)", (data,))
conn.execute("INSERT INTO messages (...) VALUES (?)", (data,))
# No transaction! If second fails, first is committed!
```

---

## Python Database Standards

### Connection Management

**Use context managers:**
```python
✅ GOOD:
import sqlite3

def get_project(project_id):
    with sqlite3.connect('database.db') as conn:
        conn.row_factory = sqlite3.Row  # Return dict-like rows
        cursor = conn.cursor()
        cursor.execute(
            "SELECT project_id, project_name FROM projects WHERE project_id = ?",
            (project_id,)
        )
        return cursor.fetchone()

❌ BAD:
def get_project(project_id):
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM projects WHERE project_id = '{project_id}'")
    result = cursor.fetchone()
    # No close! Memory leak! SQL injection!
    return result
```

### Query Functions

**Standard pattern with sql() helper:**
```python
def get_messages_by_user(user_id, limit=10):
    """
    Get recent messages for a user.

    Args:
        user_id (int): User ID
        limit (int): Maximum messages to return

    Returns:
        list: List of message dicts
    """
    messages = sql("""
        SELECT
            msg_id,
            msg_content,
            msg_created
        FROM messages
        WHERE user_id = ?
        ORDER BY msg_created DESC
        LIMIT ?
    """, (user_id, limit))

    return messages

# For single record queries
def get_summary(sum_id, user_id):
    """Get a single summary."""
    return sql("""
        SELECT sum_id, sum_title, sum_content
        FROM summaries
        WHERE sum_id = ? AND user_id = ?
    """, (sum_id, user_id), single=True)
```

---

## Common Query Patterns

### Basic Queries
```python
# Get active records
messages = sql("""
    SELECT * FROM messages
    WHERE sum_id = 0 AND user_id = ?
    ORDER BY msg_id ASC
""", (user_id,))

# Get records by date range
messages = sql("""
    SELECT * FROM messages
    WHERE user_id = ? AND DATE(msg_created) BETWEEN ? AND ?
    ORDER BY msg_created ASC
""", (user_id, start_date, end_date))

# Check if record exists
exists = sql("""
    SELECT COUNT(*) as count FROM summaries
    WHERE user_id = ? AND sum_level = ? AND sum_date = ?
""", (user_id, level, date_str), single=True)
```

### Insert Patterns
```python
# Insert with metadata
msg_id = sql("""
    INSERT INTO messages
    (msg_role, msg_content, msg_metadata, msg_type, user_id)
    VALUES (?, ?, ?, ?, ?)
""", ('user', content, metadata, 'regex', user_id))

# Insert returns the new row ID
sum_id = sql("""
    INSERT INTO summaries
    (sum_title, sum_content, sum_level, user_id)
    VALUES (?, ?, ?, ?)
""", (title, content, level, user_id))
```

### Update Patterns
```python
# Update with automatic timestamp
sql("""
    UPDATE summaries
    SET sum_content = ?, sum_updated = CURRENT_TIMESTAMP
    WHERE sum_id = ? AND user_id = ?
""", (content, sum_id, user_id))
```

### Validation Patterns
```python
# Always validate user_id from session
user_id = session.get('user_id')
if not user_id:
    return jsonify({"error": "Not authenticated"})

# Validate record belongs to user
summary = sql("""
    SELECT * FROM summaries
    WHERE sum_id = ? AND user_id = ?
""", (sum_id, user_id), single=True)
if not summary:
    return jsonify({"error": "Summary not found"})
```

---

## Documentation Standards

### Table Documentation

**Every table needs comments:**
```sql
-- projects: All AI projects in the ecosystem
CREATE TABLE projects (
    project_id TEXT PRIMARY KEY,              -- UUID v4
    project_name TEXT NOT NULL UNIQUE,        -- Human-readable name
    project_path TEXT NOT NULL,               -- Absolute path to project
    project_inbox_path TEXT NOT NULL,         -- Path to inbox folder
    project_description TEXT,                 -- Brief project description
    project_tech_stack TEXT,                  -- JSON array of technologies
    project_is_active INTEGER DEFAULT 1,      -- 0=inactive, 1=active
    project_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    project_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Schema Documentation File

**Create schema.sql with full documentation:**
```sql
-- =============================================================================
-- Database Schema
--
-- Purpose: [Brief description]
-- Version: 1.0
-- Created: 2025-11-04
-- Maintained by: [Project name]
-- =============================================================================

-- Enable foreign keys (SQLite requires this)
PRAGMA foreign_keys = ON;

-- Projects Table
-- -----------------------------------------------------------------------------
-- Stores registry of all AI projects in the ecosystem
-- Primary key: project_id (UUID v4)
-- Relationships: One-to-many with messages, tasks, boards
-- -----------------------------------------------------------------------------

CREATE TABLE projects (
    -- [table definition here with inline comments]
);

-- Indexes
CREATE INDEX idx_projects_project_name ON projects(project_name);
CREATE INDEX idx_projects_project_is_active ON projects(project_is_active);

-- Triggers
CREATE TRIGGER update_projects_timestamp
AFTER UPDATE ON projects
FOR EACH ROW
BEGIN
    UPDATE projects SET project_updated = CURRENT_TIMESTAMP
    WHERE project_id = OLD.project_id;
END;
```

---

## Common Patterns

### Soft Deletes

**Use is_active flag instead of DELETE:**
```sql
CREATE TABLE projects (
    project_id TEXT PRIMARY KEY,
    project_name TEXT NOT NULL,
    project_is_active INTEGER DEFAULT 1,  -- Soft delete flag
    project_deleted_at TIMESTAMP,          -- When marked inactive
    project_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- To "delete":
UPDATE projects
SET project_is_active = 0, project_deleted_at = CURRENT_TIMESTAMP
WHERE project_id = ?;

-- To query active only:
SELECT * FROM projects WHERE project_is_active = 1;
```

### Audit Trail

**Track who/when for changes:**
```sql
CREATE TABLE messages (
    msg_id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    msg_content TEXT NOT NULL,
    msg_created_by TEXT,               -- Which project created this
    msg_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    msg_updated_by TEXT,               -- Which project last updated
    msg_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## Anti-Patterns (What NOT to Do)

### ❌ Don't Omit Table Prefix from Columns
```sql
-- Ambiguous and non-descriptive!
id INTEGER PRIMARY KEY
name TEXT
created TIMESTAMP

-- Do this instead:
project_id TEXT PRIMARY KEY
project_name TEXT
project_created TIMESTAMP
```

### ❌ Don't Use created_at or updated_at
```sql
-- Wrong suffix!
created_at TIMESTAMP
updated_at TIMESTAMP

-- Do this instead:
msg_created TIMESTAMP
msg_updated TIMESTAMP
```

### ❌ Don't Use SELECT *
```sql
-- Wastes bandwidth, breaks if schema changes
SELECT * FROM projects;

-- Do this instead:
SELECT project_id, project_name, project_created FROM projects;
```

### ❌ Don't Use String Concatenation
```python
# SQL injection vulnerability!
query = f"SELECT * FROM projects WHERE project_name = '{user_input}'"

# Do this instead:
cursor.execute("SELECT * FROM projects WHERE project_name = ?", (user_input,))
```

### ❌ Don't Forget WHERE Clauses
```sql
-- Updates ALL rows!
UPDATE projects SET project_is_active = 0;

-- Do this instead:
UPDATE projects SET project_is_active = 0 WHERE project_id = ?;
```

---

## Checklist for New Tables

Before creating a table, verify:

- [ ] Table name is plural, snake_case
- [ ] All columns prefixed with singular table name (msg_, sum_, project_)
- [ ] Primary key follows pattern: {table_prefix}_id
- [ ] Foreign keys match parent table's primary key name exactly
- [ ] Timestamps use _created and _updated suffixes (NOT _at!)
- [ ] Timestamp type: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- [ ] Update trigger created for {table_prefix}_updated
- [ ] Indexes created for foreign keys
- [ ] Indexes created for frequently queried fields
- [ ] CHECK constraints for enum fields
- [ ] Inline comments explain each field
- [ ] Top-of-table comment explains purpose
- [ ] All queries use parameterized statements
- [ ] All queries specify column names (no SELECT *)

---

## Example: Complete Table Definition

```sql
-- messages: User conversation messages
CREATE TABLE messages (
    msg_id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    msg_role TEXT NOT NULL CHECK(msg_role IN ('system', 'user', 'assistant')),
    msg_content TEXT NOT NULL,
    msg_metadata TEXT,                        -- JSON storage
    msg_type TEXT CHECK(msg_type IN ('llm', 'regex', 'syntactic')),
    user_id INTEGER NOT NULL,                 -- Foreign key to users
    sum_id INTEGER DEFAULT 0,                 -- Foreign key to summaries
    int_id INTEGER,                           -- Foreign key to intents
    msg_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    msg_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (sum_id) REFERENCES summaries(sum_id) ON DELETE SET NULL,
    FOREIGN KEY (int_id) REFERENCES intents(int_id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_sum_id ON messages(sum_id);
CREATE INDEX idx_messages_msg_created ON messages(msg_created);

-- Auto-update trigger
CREATE TRIGGER update_messages_timestamp
AFTER UPDATE ON messages
FOR EACH ROW
BEGIN
    UPDATE messages SET msg_updated = CURRENT_TIMESTAMP
    WHERE msg_id = OLD.msg_id;
END;
```

---

## References

**SQLite Documentation:**
- https://www.sqlite.org/lang.html
- https://www.sqlite.org/datatype3.html

**Best Practices:**
- Always prefix columns with table name (msg_, sum_, project_)
- Always use _created and _updated for timestamps (NOT _at!)
- Always use parameterized queries
- Always use transactions for multiple operations
- Always specify columns in SELECT
- Always include WHERE in UPDATE/DELETE
- Always document schema with comments

---

**This is a living document - update as standards evolve!**

**Last Updated:** 2025-11-04
**Maintained By:** ai-os (standard keeper)
**Based On:** uni-app database-conventions.md
