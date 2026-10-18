# UI Patterns & Standards (UNI)

## Bootstrap Integration
- Use Bootstrap 5 classes for responsive design
- Consistent form styling with `.form-control`, `.btn`, etc.
- Card layouts for content blocks
- Color-coded badges for message types:
  - Blue (`bg-primary`) for user messages
  - Gray (`bg-secondary`) for assistant messages
  - Green (`bg-success`) for regex/deterministic responses
  - Yellow (`bg-warning`) for syntactic parsed responses
  - Purple (`bg-info`) for LLM responses

## Template Patterns

### CRITICAL: Use Includes, Not Blocks

**ALWAYS use `{% include %}` for templates. NEVER use `{% extends %}` and `{% block %}`.**

**CORRECT - Include pattern:**
```html
<!-- base.html -->
<!DOCTYPE html>
<html>
<head>
    <title>{{ title }}</title>
    <link href="/static/css/dispatch.css" rel="stylesheet">
    <script src="https://code.jquery.com/jquery-3.7.0.min.js"></script>
    <script src="/static/js/dispatch.js"></script>
</head>
<body>
    {% include 'partials/nav.html' %}
    <div class="container">
        {% include content_template %}
    </div>
</body>
</html>

<!-- Route returns specific template -->
return render_template('base.html', content_template='sales/index.html')
```

**WRONG - Block pattern:**
```html
<!-- DON'T DO THIS -->
{% extends "base.html" %}
{% block content %}...{% endblock %}
```

**Why:**
- Includes are explicit and direct
- No hidden inheritance chains
- Easier to understand what renders where
- Better for partial AJAX updates

### Loading Circle & Modal Container

**dispatch.js automatically renders the loading circle and modal container. DO NOT include them in HTML.**

**WRONG:**
```html
<!-- DON'T DO THIS -->
<div id="loading-circle">...</div>
<div class="fuzz"></div>
```

**Why:**
- dispatch.js creates these elements dynamically
- Including them in HTML causes duplicates
- Framework handles all loading states and modals

### Script Loading

**Scripts load in `<head>`, not at bottom of `<body>`.**

**CORRECT:**
```html
<head>
    <link href="/static/css/styles.css" rel="stylesheet">
    <script src="https://code.jquery.com/jquery-3.7.0.min.js"></script>
    <script src="/static/js/dispatch.js"></script>
    <script src="/static/js/app.js"></script>
</head>
```

**WRONG:**
```html
<body>
    <!-- content -->
    <script src="..."></script>  <!-- Don't put scripts here -->
</body>
```

**Why:**
- Scripts should load immediately
- If site loads slow, fix the code, not load order
- Modern pattern of deferring scripts is a band-aid for bad code

## TMBTN Class - AJAX Action Buttons
**IMPORTANT:** Use `<a>` tags for AJAX action buttons, NOT `<button>` elements.

```html
<!-- Correct - use anchor tag -->
<a class="btn btn-primary tmbtn" data-module="modulename" data-action="action/id">Label</a>

<!-- Incorrect - don't use button for tmbtn -->
<button class="btn btn-primary tmbtn" data-module="modulename" data-action="action/id">Label</button>
```

The `tmbtn` class is handled by the dispatch framework for AJAX POST requests. Anchor tags work better with the framework and prevent form submission issues.

## Prompt/Confirmation Pattern (Universal Confirmation Dialog)
A reusable confirmation dialog template (`partials/prompt.html`) for any dangerous action (delete intent, clear conversation, rebuild summaries)

### The Universal Template: `partials/prompt.html`
```html
<div class="popup-header">
    <h3>Confirm Action</h3>
</div>

<div class="popup-body my-4 py-4 text-center">
    <p style="max-width: 400px;">{{ message|safe }}</p>
</div>

<div class="popup-footer">
    <a href="#" class="tmbtn btn btn-danger"
       data-module="{{ module }}"
       data-action="{{ action }}">Yes</a>

    <a class="btn btn-secondary float-end tmbtn"
       data-vboxclose="true">Cancel</a>
</div>
```

### Usage Pattern - Two-Step Flow:

#### Step 1: Trigger Prompt (delete intent)
```html
<button class="tmbtn btn btn-danger"
        data-module="learn"
        data-action="delete-intent-prompt/{{ int_id }}">
    <i class="fa fa-trash"></i> Delete Intent
</button>
```

#### Step 2: Prompt Route (shows confirmation)
```python
@bp_learn.route('/learn/delete-intent-prompt/<int:int_id>', methods=['POST'])
def delete_intent_prompt(int_id):
    intent = sql("SELECT * FROM intents WHERE int_id = ?", (int_id,), single=True)
    if not intent:
        return jsonify({"error": "Intent not found"})

    prompt_html = render_template('partials/prompt.html',
        message=f"Delete intent \"{intent['int_name']}\"?<br>"
                f"<small class='text-muted'>This will also delete all associated patterns.</small>",
        module='learn',
        action=f'delete-intent-confirm/{int_id}')

    return jsonify({"vbox": prompt_html})
```

#### Step 3: Confirm Route (performs deletion)
```python
@bp_learn.route('/learn/delete-intent-confirm/<int:int_id>', methods=['POST'])
def delete_intent_confirm(int_id):
    sql("DELETE FROM regex_patterns WHERE int_id = ?", (int_id,))
    sql("DELETE FROM intents WHERE int_id = ?", (int_id,))
    return jsonify({"redirect": "/learn"})
```

### Common Use Cases:

#### Clear conversation
```python
prompt_html = render_template('partials/prompt.html',
    message="Clear current conversation?<br>"
            "<small class='text-muted'>Messages will be summarized first.</small>",
    module='chat',
    action='clear-conversation-confirm')
```

#### Rebuild Tapestry range
```python
prompt_html = render_template('partials/prompt.html',
    message=f"Rebuild summaries for {date_range}?<br>"
            f"<small class='text-muted'>Existing summaries will be overwritten.</small>",
    module='tapestry',
    action=f'rebuild-confirm/{start}/{end}')
```

## Form Standards (UNI-Specific)

### Chat Input Form
```html
<form id="chat-form" class="ajaxform" data-module="chat" data-action="send">
    <label for="user-input">Type your message:</label>

    <div class="chat-wrapper">
        <div class="input-group chatbox">
            <textarea class="form-control autosize"
                      id="user-input"
                      placeholder="Type your message here..."
                      required
                      name="user_prompt"></textarea>
            <button type="submit" class="btn btn-primary">
                <i class="fas fa-paper-plane"></i>
            </button>
        </div>
    </div>

    <a href="#" class="small tmbtn" data-module="tapestry" data-action="summarize-prompt">
        summarize conversation
    </a>
    <a href="#" class="small tmbtn" data-module="learn" data-action="open">
        learning center
    </a>
</form>
```

### Learning Center Phrase Submission
```html
<form class="ajaxform" data-module="learn" data-action="send-phrase">
    <div class="mb-3">
        <label class="form-label">Learning Phrase</label>
        <textarea class="form-control autosize"
                  name="learning_phrase"
                  placeholder="Example: What's the weather like?"
                  required></textarea>
        <small class="text-muted">Enter a phrase you want UNI to recognize</small>
    </div>

    <button type="submit" class="btn btn-success">
        <i class="fa fa-brain"></i> Analyze Phrase
    </button>
</form>
```

### API Requirements Form (Dynamic)
```html
<form class="ajaxform" data-module="learn" data-action="send-requirements">
    <h4>API Requirements</h4>
    <p class="text-muted">This protocol needs additional configuration</p>

    {% for req in replacements %}
    <div class="mb-3 has-feedback">
        <label class="form-label">{{ req }}</label>
        <input type="text"
               class="form-control"
               name="api_requirement_{{ req }}"
               value="{{ req }}"
               required>
        <span class="err"></span>
    </div>
    {% endfor %}

    <input type="hidden" name="file_name" value="{{ file_name }}">

    <button type="submit" class="btn btn-primary">
        <i class="fa fa-save"></i> Save Configuration
    </button>
</form>
```

### Manual Summarization Form
```html
<form class="ajaxform" data-module="tapestry" data-action="summarize">
    <div class="mb-3">
        <label for="summary-title">Summary Title:</label>
        <div class="input-group">
            <input type="text"
                   class="form-control"
                   id="summary-title"
                   name="summary_title"
                   required>
            <button class="tmbtn btn btn-success"
                    data-module="tapestry"
                    data-action="generate-title">
                <i class="fas fa-magic"></i>
            </button>
        </div>
    </div>

    <div class="mb-3">
        <label for="summary-content">Summary Content:</label>
        <div class="input-group">
            <textarea class="form-control autosize"
                      id="summary-content"
                      name="summary_content"
                      required></textarea>
            <button class="btn btn-success tmbtn"
                    data-module="tapestry"
                    data-action="generate-summary">
                <i class="fas fa-magic"></i>
            </button>
        </div>
    </div>

    <button type="submit" class="btn btn-primary">
        <i class="fa fa-save"></i> Save Summary
    </button>
</form>
```

## Message Display Pattern

### Conversation Messages
```html
{% for msg in messages %}
<div class="border p-2 mb-2 rounded-3 type-{{ msg['msg_type'] }}">

    {% if msg['msg_role'] == 'user' %}
        <div class="badge bg-primary">User</div>
    {% else %}
        <div class="badge bg-secondary">UNI</div>
    {% endif %}

    <!-- Message type indicator -->
    {% if msg['msg_type'] == 'regex' %}
        <span class="badge bg-success ms-2">
            <i class="fa fa-bolt"></i> Quick
        </span>
    {% elif msg['msg_type'] == 'syntactic' %}
        <span class="badge bg-warning">
            <i class="fa fa-code-branch"></i> Parsed
        </span>
    {% elif msg['msg_type'] == 'llm' %}
        <span class="badge bg-info">
            <i class="fa fa-brain"></i> Reflected
        </span>
    {% endif %}

    <div class="message-content">
        {{ msg['msg_content']|replace("$", "&#36;")|tripleticks|singleticks|
           replace_tabs_and_spaces|replace('\n', '<br>')|bold_asterisks|safe }}
    </div>

    <div class="text-muted small text-end">
        {{ msg['msg_created'].strftime('%Y-%m-%d %H:%M:%S') }}
    </div>
</div>
{% endfor %}
```

## Summary Card Pattern

### Summary List (Chat History)
```html
{% for summary in summaries %}
<div class="list-group-item summary-card" data-sum-id="{{ summary['sum_id'] }}">
    <h5>
        <a href="#" class="tmbtn"
           data-module="tapestry"
           data-action="show-summary/{{ summary['sum_id'] }}">
            {{ summary.sum_title }}
        </a>
    </h5>

    <!-- Level indicator -->
    <span class="badge bg-secondary">
        {% if summary.sum_level == 0 %}Conversation
        {% elif summary.sum_level == 1 %}Daily
        {% elif summary.sum_level == 2 %}Weekly
        {% elif summary.sum_level == 3 %}Monthly
        {% elif summary.sum_level == 4 %}Yearly
        {% endif %}
    </span>

    <p class="ellipsis mb-1" title="{{ summary.sum_content }}">
        {{ summary.sum_content }}
    </p>

    {% if summary.sum_reflection %}
    <div class="reflection-preview text-muted small">
        <i class="fa fa-lightbulb"></i> {{ summary.sum_reflection[:100] }}...
    </div>
    {% endif %}

    <div class="text-muted small">
        <i class="fa fa-calendar"></i> {{ summary['sum_created'] | datetimeformat }}
    </div>
</div>
{% endfor %}
```

## Loading States

**dispatch.js automatically handles all loading indicators. Just use `data-loadmsg` attribute.**

```html
<!-- Message sending -->
<button class="btn btn-primary" type="submit" data-loadmsg="Sending message...">
    <i class="fa fa-paper-plane"></i> Send
</button>

<!-- AJAX action with loading message -->
<a class="btn btn-info tmbtn"
   data-module="tapestry"
   data-action="run"
   data-loadmsg="Processing Tapestry memory...">
    <i class="fa fa-cogs"></i> Run Tapestry
</a>

<!-- Custom loading message -->
<button class="btn btn-success" type="submit"
        data-loadmsg="Analyzing phrase pattern...">
    <i class="fa fa-brain"></i> Analyze
</button>
```

**How it works:**
- dispatch.js shows loading circle automatically when AJAX starts
- `data-loadmsg` displays custom message during loading
- Loading circle hides when server response completes
- No HTML markup needed - dispatch.js creates all elements dynamically

## Badge Standards (UNI Context)

### Message Type Badges
```html
<!-- Deterministic response -->
<span class="badge bg-success">
    <i class="fa fa-bolt"></i> Quick Response
</span>

<!-- Parsed response -->
<span class="badge bg-warning text-dark">
    <i class="fa fa-code-branch"></i> Parsed
</span>

<!-- LLM response -->
<span class="badge bg-info">
    <i class="fa fa-brain"></i> Reflected
</span>
```

### Summary Level Badges
```html
<!-- Conversation level -->
<span class="badge bg-primary">
    <i class="fa fa-comments"></i> Conversation
</span>

<!-- Daily -->
<span class="badge bg-secondary">
    <i class="fa fa-calendar-day"></i> Daily
</span>

<!-- Weekly -->
<span class="badge bg-info">
    <i class="fa fa-calendar-week"></i> Weekly
</span>

<!-- Monthly -->
<span class="badge bg-warning text-dark">
    <i class="fa fa-calendar-alt"></i> Monthly
</span>

<!-- Yearly -->
<span class="badge bg-success">
    <i class="fa fa-calendar"></i> Yearly
</span>
```

## Modal Patterns (UNI-Specific)

### Learning Center Modal
```html
<div class="popup-header">
    <h3>Learning Center</h3>
</div>

<div class="popup-body">
    <p class="text-center">
        Start with a phrase. UNI will analyze and generate a pattern.
    </p>

    <form class="ajaxform" data-module="learn" data-action="send-phrase">
        <label>Learning Phrase</label>
        <textarea class="form-control autosize"
                  name="learning_phrase"
                  placeholder="Example: What's the weather?"
                  required></textarea>

        <button type="submit" class="btn btn-primary mt-2">
            Submit Phrase
        </button>
    </form>

    <div id="user_requirements_form" class="mt-3"></div>
</div>
```

### Summary View Modal
```html
<div class="popup-header">
    <h3>{{ summary['sum_title'] }}</h3>
    <span class="badge bg-secondary">Level {{ summary['sum_level'] }}</span>
</div>

<div class="popup-body">
    <div class="mb-3">
        <strong>Content:</strong>
        <p>{{ summary['sum_content']|safe }}</p>
    </div>

    {% if summary['sum_reflection'] %}
    <div class="mb-3 reflection-section">
        <strong><i class="fa fa-lightbulb"></i> Self-Reflection:</strong>
        <p class="text-muted">{{ summary['sum_reflection']|safe }}</p>
    </div>
    {% endif %}

    <div class="text-muted small">
        <i class="fa fa-calendar"></i> {{ summary['sum_created'] | datetimeformat }}
    </div>
</div>
```

## Icon Standards (UNI Context)

### Feature Icons
- `fa-comments` for conversations
- `fa-memory` or `fa-brain` for Tapestry
- `fa-graduation-cap` for learning center
- `fa-cogs` for settings
- `fa-sign-out-alt` for logout

### Action Icons
- `fa-paper-plane` for send message
- `fa-magic` for AI generation
- `fa-flask` for testing
- `fa-bolt` for quick/deterministic responses
- `fa-lightbulb` for reflections
- `fa-history` for memory/summaries

### Message Type Icons
- `fa-bolt` for regex responses
- `fa-code-branch` for parsed responses
- `fa-brain` for LLM responses

## Project Mode UI Patterns

### Background States
- Normal: `body { background: #ffffff; }`
- Project Active: `body.project-active { background: #e3f2fd; }`

### Indicators
- Project badge: `<span class="badge bg-primary"><i class="fa fa-folder-open"></i> Project Name</span>`
- Package badges: Use `bg-success` for full access, `bg-secondary` for interface only

### Package Icons
- `fa-memory` - Tapestry
- `fa-share-nodes` - Social
- `fa-image` - SDXL
- `fa-file-code` - Pages
- `fa-code` - Protocols
- `fa-folder-open` - Active project

## Tab Navigation Pattern

```html
<ul class="nav nav-tabs">
    <li class="nav-item">
        <a href="/chat"
           class="nav-link {% if 'chat' in request.path %}active{% endif %}">
            <i class="fa fa-comments"></i> Chat
        </a>
    </li>
    <li class="nav-item">
        <a href="/tapestry"
           class="nav-link {% if 'tapestry' in request.path %}active{% endif %}">
            <i class="fa fa-memory"></i> Memory
        </a>
    </li>
    <li class="nav-item">
        <a href="/learn"
           class="nav-link {% if 'learn' in request.path %}active{% endif %}">
            <i class="fa fa-graduation-cap"></i> Learn
        </a>
    </li>
</ul>
```

## Responsive Design (UNI-Specific)
- Mobile-first approach
- Collapsible chat history sidebar on mobile
- Touch-friendly message bubbles (minimum 44x44px)
- Responsive modals that fit mobile screens
- Auto-resize textareas using `autosize.js`
- Stack summary cards vertically on small screens