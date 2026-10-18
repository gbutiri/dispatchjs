# Dispatch Framework - Custom AJAX System

## Overview
Dispatch is a custom jQuery-based framework for standardized AJAX interactions and DOM manipulation. Created for PHP/CodeIgniter originally, now adapted for Flask and integrated throughout all projects.

## Automatic Initialization

**dispatch.js automatically creates required DOM elements on page load. DO NOT include these in HTML:**

```html
<!-- DON'T ADD THESE - dispatch.js creates them automatically -->
<div id="loading-circle">...</div>
<div class="fuzz"></div>
```

**What dispatch.js creates:**
1. **Loading circle** (`#loading-circle`) - Animated spinner with message display. The spinner is a self-contained inline **SVG** (in `dispatch.js`'s `_loading_circle_html` + the `.dispatch-spinner` rules in `dispatch.css`), so it needs **no FontAwesome** or any other dependency - just jQuery + dispatch.js/.css below.
2. **Modal container** (`.fuzz`) - Dark overlay for VBox modals
3. **Event handlers** - All .tmbtn, .ajaxform, .autosave listeners

**Your HTML needs:**
- jQuery loaded in `<head>`
- dispatch.js loaded in `<head>` 
- dispatch.css loaded in `<head>`
- Nothing else - dispatch handles the rest

## Core Classes
- `ajaxform` - Auto-submits forms via AJAX, handles validation display
- `tmbtn` - Triggers AJAX calls on click with `data-*` attributes
- `autosave` - Real-time field saving with visual feedback
- `tmbtnchk` - Checkbox-specific AJAX triggers

## Data Attributes
```html
data-action="action_name"  <!-- Flask route action (e.g., "send-chat", "rebuild/day") -->
data-module="module_name"  <!-- Flask blueprint name (e.g., "chat", "tapestry") -->
data-data="key=value"      <!-- Additional POST data -->
data-noload="true"         <!-- Skip loading circle -->
data-loadmsg="Custom..."   <!-- Loading message -->
data-vboxclose="true"      <!-- Close modal after action -->
```

## Server Response Format
Flask routes should return JSON with these optional keys:

### DOM Manipulation
```json
{
  "htmls": {"#messages": "<new messages html>"},
  "values": {"#user-input": ""},
  "classAdds": {"#element": "active"},
  "classRemoves": {"#element": "hidden"},
  "removes": ["#old-summary"],
  "appends": {"#chat-history": "<new summary>"},
  "slideups": ["#notification"],
  "slidedowns": ["#alert"]
}
```

### User Feedback

**STANDARD: Use `vbox` for all user messages, not `alert` or `message`.**

`vbox` displays a modal popup that the user can dismiss. The `alert` and `message` keys are not reliably displayed in the UI.

```json
{
  "vbox": "<modal content html>",
  "redirect": "/chat"
}
```

Example success modal:
```python
success_modal = f'''
<div class="modal-dialog">
    <div class="modal-content bg-dark">
        <div class="modal-header border-success">
            <h5 class="modal-title text-success"><i class="fad fa-check-circle"></i> Success</h5>
            <button type="button" class="btn-close btn-close-white tmbtn" data-action="close-modal"></button>
        </div>
        <div class="modal-body">
            <p>Operation completed successfully.</p>
        </div>
        <div class="modal-footer border-secondary">
            <button type="button" class="btn btn-secondary tmbtn" data-action="close-modal">Close</button>
        </div>
    </div>
</div>
'''

return jsonify({
    'success': True,
    'vbox': success_modal
})
```

### Error Handling
```json
{
  "errors": {"#user-input": "Message cannot be empty"},
  "success": true/false
}
```

## VBox Modal System
- Supports stacked modals (`g_vboxlevel` tracking)
- Escape key closes top modal
- Smooth animations with `.visible` class
- Template: `_vbox_html` with `{content}` placeholder
- Used for: Learning center, summarization prompts, confirmations
- **CRITICAL: VBox modals automatically include a close icon (X) in the top-right corner of the modal header**

### VBox Modal Close Button Rule

**VBox modals already have a built-in close icon. DO NOT add redundant close buttons in the modal footer.**

**CORRECT - No close button needed:**
```html
<div class="modal-dialog">
    <div class="modal-content bg-dark">
        <div class="modal-header border-secondary">
            <h5 class="modal-title">Modal Title</h5>
            <!-- Close icon (X) automatically provided by VBox -->
        </div>
        <div class="modal-body">
            <p>Modal content here...</p>
        </div>
        <div class="modal-footer border-secondary">
            <!-- Action buttons ONLY - no close button -->
            <a class="btn btn-primary tmbtn" data-module="module" data-action="save">
                Save Changes
            </a>
        </div>
    </div>
</div>
```

**WRONG - Adding redundant close button:**
```html
<div class="modal-footer border-secondary">
    <a class="btn btn-secondary tmbtn" data-vboxclose="true">Close</a>  <!-- REDUNDANT -->
    <a class="btn btn-primary tmbtn" data-module="module" data-action="save">
        Save Changes
    </a>
</div>
```

**Why:**
- VBox automatically adds a close icon (X) to every modal header
- Adding a "Close" button in the footer is redundant and clutters the UI
- Users expect the X in the header - it's standard modal behavior
- Footer should contain action buttons only (Save, Submit, Cancel, etc.)

**Exception:**
- If your action button should close the modal AND perform an action, use `data-vboxclose="true"` on the action button itself
- Example: A "Cancel" button that closes without saving can use `data-vboxclose="true"`

## Two-Step Deletion Pattern
1. `/learn/delete-intent-prompt/ID` - Returns vbox with confirmation
2. `/learn/delete-intent-confirm/ID` - Performs actual deletion

## Usage Examples

### AJAX Form (Chat Message)
```html
<form class="ajaxform" data-module="chat" data-action="send">
  <textarea name="user_prompt" class="form-control autosize" required></textarea>
  <span class="err"></span>
  <button type="submit" class="btn btn-primary">
    <i class="fa fa-paper-plane"></i> Send
  </button>
</form>
```

### AJAX Button (Tapestry Processing)
```html
<button class="tmbtn btn-info"
        data-module="tapestry"
        data-action="run"
        data-loadmsg="Processing Tapestry memory...">
  <i class="fa fa-cogs"></i> Run Tapestry
</button>
```

### AJAX Button with Data (Rebuild Specific Date)
```html
<button class="tmbtn btn-warning"
        data-module="tapestry"
        data-action="rebuild/day/2024-10-15"
        data-loadmsg="Rebuilding daily summary...">
  <i class="fa fa-redo"></i> Rebuild
</button>
```

### Autosave Field (Settings)
```html
<input class="autosave"
       data-module="settings"
       data-action="update-key"
       name="groq_key"
       type="text">
```

## UNI-Specific Response Examples

### Chat Message Response
```python
@bp_chat.route('/chat/send', methods=['POST'])
def send_chat():
    user_input = request.form.get('user_prompt')
    user_id = session.get('user_id')

    # Process message...
    response = process_message(user_input, user_id)

    # Reload messages
    messages = sql("SELECT * FROM messages WHERE sum_id = 0 AND user_id = ?", (user_id,))

    return jsonify({
        "htmls": {
            "#messages": render_template('partials/index/messages.html', messages=messages),
        },
        "values": {
            "#user-input": "",
        },
        'js': ';scrollToTheTop();autosize.update($(".autosize"));$("#user-input").focus();',
    })
```

### Tapestry Rebuild Response
```python
@bp_tapestry.route('/tapestry/rebuild/day/<date>', methods=['POST'])
def rebuild_day(date):
    user_id = session.get('user_id')

    try:
        process_daily_summaries(date)

        success_modal = f'''
        <div class="modal-dialog">
            <div class="modal-content bg-dark">
                <div class="modal-header border-success">
                    <h5 class="modal-title text-success"><i class="fad fa-check-circle"></i> Tapestry Updated</h5>
                    <button type="button" class="btn-close btn-close-white tmbtn" data-action="close-modal"></button>
                </div>
                <div class="modal-body">
                    <p>Daily summary for {date} regenerated successfully.</p>
                </div>
                <div class="modal-footer border-secondary">
                    <button type="button" class="btn btn-secondary tmbtn" data-action="close-modal">Close</button>
                </div>
            </div>
        </div>
        '''

        return jsonify({
            'success': True,
            'vbox': success_modal
        })
    except Exception as e:
        error_modal = f'''
        <div class="modal-dialog">
            <div class="modal-content bg-dark">
                <div class="modal-header border-danger">
                    <h5 class="modal-title text-danger"><i class="fad fa-exclamation-circle"></i> Error</h5>
                    <button type="button" class="btn-close btn-close-white tmbtn" data-action="close-modal"></button>
                </div>
                <div class="modal-body">
                    <p>{str(e)}</p>
                </div>
                <div class="modal-footer border-secondary">
                    <button type="button" class="btn btn-secondary tmbtn" data-action="close-modal">Close</button>
                </div>
            </div>
        </div>
        '''

        return jsonify({
            'success': False,
            'vbox': error_modal
        })
```

### Learning Center Response
```python
@bp_learn.route('/learn/send-phrase', methods=['POST'])
def send_learning_phrase():
    learning_phrase = request.form['learning_phrase']

    # Generate pattern...
    pattern_response = generate_pattern(learning_phrase)

    return jsonify({
        'vbox': render_template('learning_results.html',
                               pattern=pattern_response),
        'js': ';autosize($(".autosize"));'
    })
```

### Error Response with Field Highlighting
```python
@bp_chat.route('/chat/send', methods=['POST'])
def send_chat():
    user_input = request.form.get('user_prompt')

    if not user_input or not user_input.strip():
        return jsonify({
            'success': False,
            'errors': {'#user-input': 'Message cannot be empty'}
        })

    # Process message...
```

## Loading Messages (UNI Context)

```html
<!-- Chat operations -->
data-loadmsg="Sending message..."
data-loadmsg="Processing with UNI..."

<!-- Tapestry operations -->
data-loadmsg="Processing Tapestry memory..."
data-loadmsg="Generating summary..."
data-loadmsg="Rebuilding summaries..."
data-loadmsg="Loading memory context..."

<!-- Learning center operations -->
data-loadmsg="Analyzing phrase pattern..."
data-loadmsg="Generating regex pattern..."
data-loadmsg="Testing protocol..."
data-loadmsg="Validating examples..."

<!-- Import operations -->
data-loadmsg="Importing conversations..."
data-loadmsg="Processing OpenAI data..."
```

## JavaScript Execution

The `js` key allows executing JavaScript after AJAX response:

```python
return jsonify({
    "htmls": {"#messages": messages_html},
    "js": ";scrollToTheTop();autosize.update($('.autosize'));$('#user-input').focus();"
})
```

Common patterns:
- `scrollToTheTop()` - Scroll chat to bottom
- `autosize.update($('.autosize'))` - Refresh textarea sizing
- `$('#user-input').focus()` - Focus input field
- `location.reload()` - Refresh page

## Alert System (DEPRECATED - Use vbox instead)

**DO NOT USE `alert` or `message` keys - they are not reliably displayed.**

Use `vbox` modals for all user feedback instead. See "User Feedback" section above for examples.

Old pattern (deprecated):
```python
# DON'T DO THIS
return jsonify({
    'alert': json.dumps({
        'title': 'Summary Created',
        'message': 'Conversation has been summarized',
        'type': 'success'
    })
})
```

New pattern (correct):
```python
# DO THIS INSTEAD
return jsonify({
    'vbox': '<div class="modal-dialog">...</div>'
})
```

## VBox Usage Patterns

### Open Modal
```python
return jsonify({
    "vbox": render_template('learning_center.html')
})
```

### Close Modal After Action
```python
return jsonify({
    "success": True,
    "vboxclose": True
})
```

### Close All Modals
```python
return jsonify({
    "vboxcloseall": True,
    "redirect": "/chat"
})
```

## Form Validation Display

When form has errors, Dispatch automatically:
1. Adds `has-error` class to parent `.has-feedback` div
2. Displays error message in child `.err` span
3. Scrolls to first error field

```html
<div class="mb-3 has-feedback">
    <label>Learning Phrase</label>
    <input name="learning_phrase" class="form-control" required>
    <span class="err"></span>
</div>
```

Server response:
```python
return jsonify({
    'errors': {'input[name="learning_phrase"]': 'Phrase is too short'}
})
```

## Button State Management

Dispatch automatically:
- Disables submit buttons during request
- Shows spinner icon
- Re-enables and removes spinner on completion

```html
<button type="submit" class="btn btn-primary">
    <i class="fa fa-save"></i> Save
</button>
```

During request becomes:
```html
<button type="submit" class="btn btn-default" disabled>
    <i class="fa fa-save"></i> Save <i class="fa fa-spinner fa-spin"></i>
</button>
```

## Redirect Pattern

```python
# After summarization, go back to chat
return jsonify({
    'redirect': '/chat'
})

# After login
return jsonify({
    'redirect': '/chat' if user_groq_key else '/settings'
})
```

### Quick Reference Examples

```html
<a href="#" class="btn btn-info tmbtn" data-module="uni" data-action="flask-action-with-optional-param/{{ user['user_id'] }}">Button or Link Text</a>
<!-- the tmbtn class defaults to a POST request using dispatch.js. -->

<form class="ajaxform" data-module="uni" data-action="set_key">
<!-- the `ajaxform` class defaults to a POST request with the elements of the form as serialized values. -->

    <input name="user_type" class="form-control" value="{{ user['user_type'] }}" />
    <!-- element name should match related object field name from DB. -->

    <textarea name="user_descr" class="form-control autosize">{{ user['user_descr'] }}</textarea>
    <!-- textarea elements should usually have autosize to avoid hidden text. -->
    ...
    <button type="submit" class="btn btn-success">Submit Text</button>
    <!-- Will need a submit button for form. -->

</form>
```

## Complete Usage Example

### HTML (Learning Center)
```html
<button class="tmbtn btn-primary"
        data-module="learn"
        data-action="open"
        data-loadmsg="Loading learning center...">
    <i class="fa fa-graduation-cap"></i> Open Learning Center
</button>
```

### Route (Learning Center Modal)
```python
@bp_learn.route('/learn/open', methods=['POST'])
def open_learning_center():
    return jsonify({
        "vbox": render_template('learning_center.html'),
        "js": ';autosize($(".autosize"));',
    })
```

### Form Submission (Inside Modal)
```html
<form class="ajaxform" data-module="learn" data-action="send-phrase">
    <textarea name="learning_phrase" class="form-control autosize" required></textarea>
    <button type="submit" class="btn btn-success">Submit</button>
</form>
```

### Processing Response
```python
@bp_learn.route('/learn/send-phrase', methods=['POST'])
def send_learning_phrase():
    phrase = request.form['learning_phrase']

    # Analyze phrase...
    result = analyze_phrase(phrase)

    success_modal = '''
    <div class="modal-dialog">
        <div class="modal-content bg-dark">
            <div class="modal-header border-success">
                <h5 class="modal-title text-success"><i class="fad fa-check-circle"></i> Analysis Complete</h5>
                <button type="button" class="btn-close btn-close-white tmbtn" data-action="close-modal"></button>
            </div>
            <div class="modal-body">
                <p>Phrase pattern generated successfully.</p>
            </div>
            <div class="modal-footer border-secondary">
                <button type="button" class="btn btn-secondary tmbtn" data-action="close-modal">Close</button>
            </div>
        </div>
    </div>
    '''

    return jsonify({
        'htmls': {
            '#results-container': render_template('phrase_results.html', result=result)
        },
        'vbox': success_modal
    })
```

## Critical Notes
- Always return JSON from AJAX routes
- Use `jsonify()` for Flask JSON responses
- Include `success: True/False` for error handling
- **IMPORTANT: Use `vbox` for all user messages - do NOT use `alert` or `message` keys**
- Modal content goes in `vbox` key
- Multiple actions can be combined in one response
- Loading circle shows automatically unless `data-noload="true"`

## Multi-Target Update Pattern

When an AJAX action generates data that populates multiple UI areas (e.g., a list AND its associated controls), the backend must update ALL affected containers in a single response.

**Example:** Timeline generation creates clips, which should show both the clips list AND the bulk action controls.

```python
# BAD: Only updates the list - controls stay empty
return jsonify({
    'htmls': {
        '#clips_container': clips_html
    }
})

# GOOD: Updates both list AND controls
return jsonify({
    'htmls': {
        '#clips_container': clips_html,
        '#clip_controls': controls_html
    }
})
```

**Why this matters:**
- Server-side `{% if items %}` conditionals are evaluated at page load
- AJAX updates don't re-evaluate Jinja conditionals
- The backend must explicitly send HTML for ALL affected containers

**Common scenarios:**
- Generating items → show bulk action buttons
- Deleting all items → hide/clear control panels
- Filtering lists → update count badges


## ANTI-PATTERNS: What NOT To Do

### NEVER Use `<button>` for Actions

**WRONG:**
```html
<button class="btn btn-primary tmbtn" data-module="musicvideos" data-action="process/5">
    Process Video
</button>
```

**RIGHT:**
```html
<a class="btn btn-primary tmbtn" data-module="musicvideos" data-action="process/5">
    Process Video
</a>
```

**Why:** `<button>` defaults to `type="submit"` which can trigger unwanted form submissions. Use `<a>` tags for all action buttons except form submits.

### NEVER Use onclick Handlers

**WRONG:**
```html
<button onclick="window.location.reload()">View Timeline</button>
<button onclick="$.fn.vbox('close')">Close</button>
<a onclick="location.href='/timeline'">Go</a>
```

**RIGHT:**
```html
<!-- Close modal without action -->
<a class="btn btn-secondary tmbtn" data-vboxclose="true">Close</a>

<!-- Navigate using dispatch -->
<a class="btn btn-primary tmbtn" data-module="musicvideos" data-action="view-timeline/5">
    View Timeline
</a>

<!-- Or use backend redirect -->
return jsonify({'redirect': '/timeline'})
```

**Why:** onclick bypasses dispatch framework, breaking loading states, error handling, and modal management.

### NEVER Manually Manipulate Modals in HTML

**WRONG:**
```html
<button class="btn-close" data-action="close-modal"></button>
<button type="button" class="btn btn-secondary tmbtn" data-action="close-modal">Close</button>
```

**RIGHT:**
```html
<!-- Frontend: Use data-vboxclose -->
<a class="btn btn-secondary tmbtn" data-vboxclose="true">Close</a>

<!-- Backend: Use vboxclose in JSON response -->
return jsonify({
    'htmls': {'#container': html},
    'vboxclose': True
})
```

**Why:** The dispatch framework manages modals via `data-vboxclose` attribute and `vboxclose` JSON response. Custom close handlers don't properly manage the modal stack.

## CRITICAL: Dispatch is NOT a JavaScript Framework

**Dispatch is a BACKEND-controlled, DECLARATIVE system. The backend makes ALL decisions.**

### The 'js' Field Is ONLY For:
- Typically used for calling functions: `;processNext();`
- Typically, **NOTHING ELSE**

### NEVER use 'js' for:
- DOM manipulation
- Setting variables
- Conditional logic
- jQuery chains

### Decision Flow:
```python
# Backend decides if we should continue
if more_work_to_do:
    js_code = ';processNext();'
else:
    js_code = ''  # Don't call anything = loop stops

# Backend declares UI changes
return jsonify({
    'htmls': {...},
    'classAdds': {...},
    'js': js_code  # Either call a function or don't
})
```

or

```python
# Backend decides if we should continue
if more_work_to_do:
    return jsonify({
        'htmls': {...},
        'js': ';processNext();'  # Either call a function or don't
    })
else:
    # Backend declares UI changes
    return jsonify({
        'htmls': {...},
        'classAdds': {...},
        'js': js_code  # Either call a function or don't
    })
```

Each with their own set of instructions.

---

## Multiple Submit Buttons in One Form

When you need two or more submit buttons on the same form (e.g., "Validate" and "Save"), use the button `name` attribute as the function identifier.

### Pattern

**ALWAYS use this pattern:**

```html
<form id="pattern_form" class="ajaxform" data-module="patterns" data-action="save-pattern">
    <!-- Form fields here -->

    <button type="submit" name="validate" value="1" class="btn btn-primary">
        <i class="fa fa-check"></i> Validate
    </button>

    <button type="submit" name="save" value="1" class="btn btn-success">
        <i class="fa fa-save"></i> Save
    </button>
</form>
```

### How It Works

1. **Both buttons are type="submit"** - They submit the same form to the same route
2. **Button name = function name** - Each button's `name` directly identifies which action to perform
3. **Only clicked button's name is sent** - When user clicks "Validate", form includes `validate=1`. When they click "Save", form includes `save=1`
4. **Backend detects which button** - Route checks `if 'validate' in request.form` or `if 'save' in request.form`

### Backend Implementation

```python
@patterns_bp.route('/save-pattern', methods=['POST'])
def save_pattern():
    # Get and validate form data
    int_id = request.form.get('int_id')
    # ... gather other fields

    # Validate pattern
    is_valid, error = validate_pattern(pattern_data)

    if not is_valid:
        return jsonify({
            'htmls': {
                '#feedback': f'<div class="alert alert-danger">Error: {error}</div>'
            }
        })

    # If validate button was clicked, return success without saving
    if 'validate' in request.form:
        return jsonify({
            'htmls': {
                '#feedback': '<div class="alert alert-success">Pattern is valid!</div>'
            }
        })

    # If save button was clicked, continue with save
    if 'save' in request.form:
        sql("INSERT INTO patterns (...) VALUES (...)")
        return jsonify({
            'htmls': {
                '#feedback': '<div class="alert alert-success">Pattern saved!</div>'
            },
            'js': 'clearForm();'
        })
```

### Why This Is Better Than Custom JavaScript

**DON'T DO THIS:**
```html
<!-- Bad: Custom onclick handlers that bypass dispatch framework -->
<a href="#" class="btn" onclick="validatePattern(); return false;">Validate</a>
<button type="submit" class="btn">Save</button>

<script>
function validatePattern() {
    // Manual fetch() call - bypasses dispatch framework
    fetch('/patterns/validate', {...})
}
</script>
```

**DO THIS:**
```html
<!-- Good: Use HTML form capabilities with dispatch framework -->
<button type="submit" name="validate" value="1">Validate</button>
<button type="submit" name="save" value="1">Save</button>
```

### Benefits

1. **Uses native HTML** - No custom JavaScript needed
2. **Dispatch framework handles everything** - Loading states, error handling, DOM updates
3. **Single route** - Both buttons go to the same endpoint, backend decides behavior
4. **Standard pattern** - Easy to understand and maintain
5. **Form validation works** - HTML5 required fields, pattern matching all work as expected

### When to Use This Pattern

- Form with "Validate" and "Save" buttons
- Form with "Save as Draft" and "Publish" buttons
- Form with "Preview" and "Submit" buttons
- Any time you need multiple submission behaviors for the same form data