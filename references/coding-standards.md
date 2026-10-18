# Coding Standards

Required reading for Claude when writing code.

## File Operations

1. **Write tool** - Must Read existing files before using Write on them (safety check)
2. **Overwrite, don't create new** - When fixing/updating functionality, overwrite existing files, don't create new ones
3. **Wait for explicit instruction** - Don't write files unless explicitly told to
4. **Plan mode edits** - Can still edit files in plan mode if user approves the prompt
5. **NEVER auto-update user-modified files** - If user modifies a file, DO NOT update it unless EXPLICITLY asked

## Code & Debugging

1. **Show raw data for debugging** - When user wants to "see the parts", show raw data, not processed results
2. **Don't optimize unless requested** - Never remove features/processors to optimize performance
3. **Simple tasks stay simple** - Don't overcomplicate copy-and-test tasks. Do exactly what's asked.

## Environment Variables

**ALWAYS use python-dotenv for configuration.**

**Setup:**
```python
from dotenv import load_dotenv
import os

load_dotenv()

# Access variables
api_key = os.environ.get('GROQ_API_KEY')
db_path = os.environ.get('DATABASE_PATH', 'db/default.db')  # With default
```

**Create `.env` in project root:**
```
GROQ_API_KEY=gsk_xxxxxxxxxxxxx
DATABASE_PATH=db/uni.db
SECRET_KEY=your-secret-key-here
UPLOAD_FOLDER=static/uploads
```

**NEVER commit `.env` to git:**
```
# .gitignore
.env
```

**Benefits:**
- Separates config from code
- Different settings per environment (dev/prod)
- Keeps secrets out of version control
- Standard Python pattern

## LLM Integration

### CRITICAL: Local-First LLM Usage

**UNI is designed to be completely offline. ALWAYS use local LLM by default.**

**CORRECT:**
```python
from libs.llm import llm_request

response = llm_request([
    {'role': 'system', 'content': 'System prompt'},
    {'role': 'user', 'content': user_input}
], adapter='calculator', provider='local')  # ALWAYS specify provider='local'
```

**WRONG:**
```python
# DON'T DO THIS - defaults to Groq (cloud API)
response = llm_request([...], adapter='calculator')
```

**When to use Groq:**
- ONLY when explicitly mentioned in comments/code
- ONLY for specific tasks that require Groq (e.g., session summaries if specified)
- Default assumption: use local LLM

**Why this matters:**
1. UNI is a deterministic, offline-first system
2. Local LLM uses trained LoRA adapters (calculator, chat, scrum, etc.)
3. Groq is cloud-based, requires internet, and bypasses adapter training
4. Token streaming only works with local LLM

## Database Access

- Use project SQL helper: `from libs.dbsqlite import sql`
- Don't write custom database code
- See `documentation/database-conventions.md` for table/column naming
- See `documentation/SQL-STANDARDS.md` for query patterns

## HTML & Button Conventions

### CRITICAL: Use Anchor Tags for Actions

**ALWAYS use `<a>` tags for action buttons. NEVER use `<button>` tags unless it's a form submit button.**

**CORRECT:**
```html
<!-- Action button (dispatch AJAX) -->
<a class="btn btn-primary tmbtn" data-module="musicvideos" data-action="process/5">
    <i class="fad fa-magic"></i> Process Video
</a>

<!-- Close modal without action -->
<a class="btn btn-secondary tmbtn" data-vboxclose="true">Close</a>

<!-- Close modal + trigger action -->
<a class="btn btn-primary tmbtn" data-module="musicvideos" data-action="view-timeline/5" data-vboxclose="true">
    View Timeline
</a>
```

**WRONG:**
```html
<!-- DON'T DO THIS -->
<button class="btn btn-primary tmbtn" data-module="musicvideos" data-action="process/5">
    Process Video
</button>

<!-- NEVER DO THIS -->
<button onclick="window.location.reload()">View Timeline</button>
<button class="btn-close" data-action="close-modal"></button>
```

### CRITICAL: Modal Close Pattern

**Use dispatch framework commands to close modals. NEVER use onclick handlers.**

**CORRECT - Close without action:**
```html
<a class="btn btn-secondary tmbtn" data-vboxclose="true">Close</a>
```

**CORRECT - Close after backend action:**
```python
return jsonify({
    'htmls': {'#container': html},
    'vboxclose': True  # Backend closes modal after success
})
```

**WRONG - Manual onclick:**
```html
<!-- NEVER DO THIS -->
<button onclick="window.location.reload()">Close</button>
<button onclick="$.fn.vbox('close')">Close</button>
```

### CRITICAL: VBox Modal Templates

**VBox modals already have a close icon in the top-right corner. DO NOT add redundant close buttons.**

**CORRECT - No close button needed:**
```html
<div class="modal-dialog">
    <div class="modal-content bg-dark">
        <div class="modal-header">
            <h5>Modal Title</h5>
            <!-- Close icon already provided by VBox -->
        </div>
        <div class="modal-body">
            <!-- Content here -->
        </div>
        <div class="modal-footer">
            <!-- Action buttons only, no close button -->
            <a class="btn btn-primary tmbtn" data-module="module" data-action="action">
                Save Changes
            </a>
        </div>
    </div>
</div>
```

**WRONG - Adding redundant close button:**
```html
<!-- DON'T DO THIS -->
<div class="modal-footer">
    <a class="btn btn-secondary" data-vboxclose="true">Close</a>  <!-- Redundant -->
</div>
```

### Why These Rules Exist

1. **`<button>` tags** default to `type="submit"` which can trigger unwanted form submissions
2. **Anchor tags** are semantically correct for navigation/actions and don't have default form behavior
3. **onclick handlers** bypass the dispatch framework, breaking loading states, error handling, and consistent behavior
4. **data-vboxclose** integrates with dispatch's modal system and works correctly with stacked modals

### Exception: Form Submit Buttons

The ONLY time to use `<button>` tags is for form submission:

```html
<form class="ajaxform" data-module="musicvideos" data-action="save">
    <input name="title" class="form-control">
    <button type="submit" class="btn btn-success">Save</button>  <!-- OK -->
</form>
```

## Framework Patterns

See `documentation/dispatch-framework.md` for:
- AJAX patterns and response format
- Autosave pattern for form fields
- Individual record updates (target specific elements)
- VBox modal system
- Complete anti-pattern list

See `documentation/ui-patterns.md` for:
- Bootstrap patterns
- Badge styling
- Modal patterns

## NLP Pattern Builder Architecture

### Storage vs Display Model

**Patterns store only what's needed for matching. The edit UI shows the full sentence context.**

**Storage (pattern_data JSON):**
```json
{
  "sentence_type": "SBARQ",
  "words": [
    {"lemma": "what", "pos": "WP", "dep": "dobj", "required": true},
    {"lemma": "time", "pos": "NN", "dep": "nsubj", "required": true}
  ]
}
```

**Edit UI (all original words visible):**
```
[x] Inc  [x] word  [ ] lemma  [x] pos  [ ] dep  |  What
[x] Inc  [ ] word  [x] lemma  [x] pos  [x] dep  |  time
[ ] Inc  [ ] word  [ ] lemma  [ ] pos  [ ] dep  |  is     <- unchecked = excluded
[ ] Inc  [ ] word  [ ] lemma  [ ] pos  [ ] dep  |  it     <- unchecked = excluded
```

### Key Concepts

1. **Inc checkbox** - Controls whether word appears in pattern at all. Unchecked = word excluded from pattern JSON entirely.

2. **Field checkboxes** (word/lemma/pos/dep) - Control which fields are included when Inc is checked. Only checked fields become constraints.

3. **Required field** (future) - Will control `required: true/false` for optional matching. Currently all included words are required.

### Future Enhancements (Keep In Mind)

- **Reorder words** - Drag to change constraint order
- **Add words** - Insert new constraints not from original parse
- **Array support** - Multiple values per field (e.g., `"pos": ["NN", "NNS"]`)
- **Required toggle** - Mark constraints as optional vs required

Build with these in mind: keep word rows modular, store data in hidden fields, use data attributes for row identification.

## Git Commit Messages

GitHub treats the first line as the title shown in commit lists. Format:

1. **No blank lines** - No double spacing between lines
2. **Line 1** - Short title of commit (what was done)
3. **Line 2** - Paragraph description with details
4. **Plain text only** - NO emojis, NO signatures, NO decorative characters

Example:
```
Routes refactoring: split routes.py into 9 domain modules
Split 2500-line monolith into projects, uploads, content, timeline, prompts, render, characters, export, static. Added vbox confirmation for timeline generation. Updated button names for clarity.
```
