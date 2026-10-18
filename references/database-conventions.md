# Database Conventions (UNI)

## Table Naming
- Always plural: `messages`, `summaries`, `intents`, `regex_patterns`
- Lowercase with underscores: `user_entities`, `llm_messages`
- Prefix imported tables with source: `llm_messages`, `llm_summaries`

## Column Naming
- Prefix with singular table name: `msg_id`, `sum_id`, `int_id`, `pat_id`
- Standard suffixes:
  - `_id` for primary keys (INTEGER NOT NULL PRIMARY KEY)
  - `_created` for creation timestamps (TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)
  - `_updated` for update timestamps (TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)
  - `_content` for text content (TEXT)
  - `_name` for name fields (TEXT)
  - `_ref_id` for external reference IDs (TEXT)

## Standard Column Patterns

### Core UNI Tables
See `database_structure.txt` for full schema:
- `messages` - Active conversation messages (native UNI)
- `summaries` - Hierarchical summaries (dual-track: topical + reflective)
- `intents` - Intent definitions
- `regex_patterns` - Regex patterns for intent matching

### Imported Conversation Tables (OpenAI)
See `database_structure.txt` for full schema:
- `llm_messages` - Imported messages (preserves original structure)
- `llm_summaries` - Imported summaries from OpenAI archive

### User Tables
See `database_structure.txt` for full schema:
- `users` - User accounts with authentication and preferences
- `user_entities` - User-defined entities for NLP parsing

### Project Mode Tables
See `database_structure.txt` for full schema:
- `packages` - Knowledge packages
- `projects` - Project definitions
- `project_packages` - Package assignments

### Intent/Pattern Scoping (NEW)
- `intents.package_id` (INTEGER, default 0)
- `regex_patterns.package_id` (INTEGER, default 0)

**Convention:** `package_id = 0` means "framework_core" (always active)

### Query Pattern
```python
# Get patterns for active packages only
package_ids = list(loaded_packages.keys()) + [0]
patterns = sql(f"SELECT * FROM regex_patterns WHERE package_id IN ({placeholders})", tuple(package_ids))
```

## Foreign Key Naming
- Use full column name from parent table: `user_id`, `sum_id`, `int_id`
- Always match the referenced table's primary key name exactly
- Reference IDs from external sources: `sum_ref_id`, `msg_ref_id`

## Query Safety
- Always use parameterized queries via `sql()` helper
- Never concatenate user input into SQL strings
- Use `single=True` parameter for single record queries
- Always validate user_id from session

## Common Query Patterns

### Message Queries
```python
# Get active conversation messages
messages = sql("""
    SELECT * FROM messages
    WHERE sum_id = 0 AND user_id = ?
    ORDER BY msg_id ASC
""", (user_id,))

# Get messages for specific summary
messages = sql("""
    SELECT * FROM messages
    WHERE sum_id = ? AND user_id = ?
    ORDER BY msg_id ASC
""", (sum_id, user_id))

# Get messages by date range
messages = sql("""
    SELECT * FROM messages
    WHERE user_id = ? AND DATE(msg_created) BETWEEN ? AND ?
    ORDER BY msg_created ASC
""", (user_id, start_date, end_date))

# Insert message with metadata
msg_id = sql("""
    INSERT INTO messages
    (msg_role, msg_content, msg_metadata, int_id, msg_type, user_id)
    VALUES (?, ?, ?, ?, ?, ?)
""", ('user', content, metadata, intent_id, 'regex', user_id))
```

### Summary Queries (Hierarchical)
```python
# Get summaries by level
summaries = sql("""
    SELECT * FROM summaries
    WHERE user_id = ? AND sum_level = ?
    ORDER BY sum_date DESC
""", (user_id, level))

# Get summaries in date range
summaries = sql("""
    SELECT * FROM summaries
    WHERE user_id = ? AND sum_level = ?
    AND sum_date BETWEEN ? AND ?
    ORDER BY sum_date ASC
""", (user_id, level, start_date, end_date))

# Get conversation summaries for specific date
conversations = sql("""
    SELECT * FROM summaries
    WHERE user_id = ? AND sum_level = 0 AND sum_date = ?
""", (user_id, date_str))

# Check if summary exists
existing = sql("""
    SELECT COUNT(*) as count FROM summaries
    WHERE user_id = ? AND sum_level = ? AND sum_date = ?
""", (user_id, level, date_str), single=True)

# Insert dual-track summary
sum_id = sql("""
    INSERT INTO summaries
    (sum_title, sum_content, sum_reflection, sum_level, sum_date, user_id)
    VALUES (?, ?, ?, ?, ?, ?)
""", (title, content, reflection, level, date_str, user_id))

# Update summary with reflection
sql("""
    UPDATE summaries
    SET sum_content = ?, sum_reflection = ?, sum_updated = CURRENT_TIMESTAMP
    WHERE sum_id = ? AND user_id = ?
""", (content, reflection, sum_id, user_id))
```

### Custom Memory Package Queries
```python
# Get memory packages tied to message
packages = sql("""
    SELECT * FROM summaries
    WHERE sum_ref_id = ? AND user_id = ?
    ORDER BY sum_created DESC
""", (msg_id, user_id))

# Search for topic across all summaries
topic_summaries = sql("""
    SELECT * FROM summaries
    WHERE user_id = ?
    AND (sum_content LIKE ? OR sum_title LIKE ? OR sum_reflection LIKE ?)
    ORDER BY sum_date DESC
""", (user_id, f'%{topic}%', f'%{topic}%', f'%{topic}%'))

# Create custom memory package
sum_id = sql("""
    INSERT INTO summaries
    (sum_title, sum_content, sum_reflection, sum_level, sum_ref_id, user_id)
    VALUES (?, ?, ?, ?, ?, ?)
""", (f"Custom Package: {topic}", content, reflection, 99, msg_id, user_id))
```

### Intent and Pattern Queries
```python
# Get all intents
intents = sql("SELECT * FROM intents ORDER BY int_name ASC")

# Get intent with patterns
intent_data = sql("""
    SELECT i.int_id, i.int_name, i.int_protocol,
           GROUP_CONCAT(rp.pat_regex, '|||') as patterns
    FROM intents i
    LEFT JOIN regex_patterns rp ON i.int_id = rp.int_id
    WHERE i.int_id = ?
    GROUP BY i.int_id
""", (int_id,), single=True)

# Get all regex patterns
patterns = sql("SELECT * FROM regex_patterns ORDER BY pat_id ASC")

# Get patterns for specific intent
patterns = sql("""
    SELECT * FROM regex_patterns
    WHERE int_id = ?
""", (int_id,))

# Insert new intent
int_id = sql("""
    INSERT INTO intents (int_name, int_protocol)
    VALUES (?, ?)
""", (intent_name, protocol_name))

# Insert regex pattern
pat_id = sql("""
    INSERT INTO regex_patterns (pat_regex, int_id)
    VALUES (?, ?)
""", (pattern, int_id))

# Delete intent cascade
sql("DELETE FROM regex_patterns WHERE int_id = ?", (int_id,))
sql("DELETE FROM intents WHERE int_id = ?", (int_id,))
```

### Tapestry Processing Queries
```python
# Get first and last conversation dates
date_range = sql("""
    SELECT
        DATE(MIN(sum_created)) as first_date,
        DATE(MAX(sum_created)) as last_date
    FROM summaries
    WHERE user_id = ? AND sum_level = 0
""", (user_id,), single=True)

# Check if conversations exist in date range
count = sql("""
    SELECT COUNT(*) as count FROM summaries
    WHERE user_id = ? AND sum_level = 0
    AND sum_date BETWEEN ? AND ?
""", (user_id, start_date, end_date), single=True)

# Get daily summaries for week
daily_summaries = sql("""
    SELECT * FROM summaries
    WHERE user_id = ? AND sum_level = 1
    AND sum_date BETWEEN ? AND ?
    ORDER BY sum_date ASC
""", (user_id, monday, sunday))

# Get weekly summaries for month
weekly_summaries = sql("""
    SELECT * FROM summaries
    WHERE user_id = ? AND sum_level = 2
    AND sum_date >= ? AND sum_date <= ?
    ORDER BY sum_date ASC
""", (user_id, month_start, month_end))
```

### Imported Conversation Queries (OpenAI)
```python
# Get all imported conversations
conversations = sql("""
    SELECT DISTINCT sum_id, sum_ref_id, sum_title
    FROM llm_summaries
    WHERE user_id = ?
    ORDER BY sum_created DESC
""", (user_id,))

# Get messages for imported conversation
messages = sql("""
    SELECT * FROM llm_messages
    WHERE sum_ref_id = ? AND user_id = ?
    ORDER BY msg_created ASC
""", (conv_id, user_id))

# Check if conversation already imported
existing = sql("""
    SELECT * FROM llm_summaries
    WHERE sum_ref_id = ? AND user_id = ?
""", (conv_id, user_id), single=True)
```

## Validation Patterns
```python
# Always validate user_id from session
user_id = session.get('user_id')
if not user_id:
    return jsonify({"error": "Not authenticated"})

# Validate summary belongs to user
summary = sql("""
    SELECT * FROM summaries
    WHERE sum_id = ? AND user_id = ?
""", (sum_id, user_id), single=True)
if not summary:
    return jsonify({"error": "Summary not found"})

# Validate intent exists before protocol execution
intent = sql("""
    SELECT * FROM intents WHERE int_id = ?
""", (int_id,), single=True)
if not intent:
    return jsonify({"error": "Intent not found"})

# Check Groq API key configured
user = sql("""
    SELECT user_groq_key FROM users WHERE user_id = ?
""", (user_id,), single=True)
if not user or not user.get('user_groq_key', '').strip():
    return jsonify({"redirect": "/settings"})
```

## Special Field Conventions

### sum_level (Summary Hierarchy)
- `-1`: Agent session summary (created when agent exits during conversation)
- `0`: Individual conversation
- `1`: Daily summary
- `2`: Weekly summary
- `3`: Monthly summary
- `4`: Yearly summary
- `99`: Custom memory package

### sum_parent_id (Tree Structure)
- Field: `sum_parent_id` (INTEGER, default NULL)
- Self-referencing foreign key to `summaries.sum_id`
- Creates hierarchical tree structure for summaries
- `NULL`: Orphaned (waiting for parent) or top-level summary
- Links child summaries to their parent:
  - Agent sessions (-1) → Conversation (0)
  - Conversations (0) → Daily (1)
  - Daily (1) → Weekly (2)
  - Weekly (2) → Monthly (3)
  - Monthly (3) → Yearly (4)
- See `docs/tapestry-tree-structure.md` for complete documentation

### sum_is_processed (Processing Status)
- Field: `sum_is_processed` (INTEGER, default 0)
- Values: 0=unprocessed, 1=processed
- Allows resumable rebuilds and granular progress tracking

### msg_type (Message Processing Path)
- `llm`: LLM reflection fallback
- `regex`: Deterministic regex pattern match
- `syntactic`: NLP constituency parsing

### sum_ref_id (Custom Memory Packages)
- `NULL`: Chronological Tapestry summary
- `{msg_id}`: Custom package tied to specific message query

## Naming Examples
- ✅ Good: `msg_id`, `sum_content`, `int_protocol`, `pat_regex`
- ❌ Bad: `id`, `content`, `protocol`, `pattern`
- ✅ Good: `sum_reflection` (self-awareness track)
- ❌ Bad: `reflection` or `sum_notes`

## Database File Location
- SQLite file: `db/uni.db`
- Use `libs/dbsqlite.py` for all database operations
- Backup location: `db/backups/` (if implemented)

## Migration Conventions
- Add new columns with `DEFAULT NULL` for backwards compatibility
- Always backup database before schema changes
- Test on copy first
- Document migration in `db/migrations/` with timestamp

## Development Environment

- **Tool:** DB Browser for SQLite
- **Foreign Keys:** OFF during development (avoids constraint issues when modifying schema)
- **Production:** Re-enable foreign keys when schema is finalized