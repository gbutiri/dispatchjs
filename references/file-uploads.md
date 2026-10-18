# File Upload Pattern

jQuery FileUpload integration with dispatch framework.

## Setup

Copy `assets/mini-upload-form/` to your project's `static/` directory.

**Include in base template:**
```html
<script src="/static/mini-upload-form/assets/js/jquery.ui.widget.js"></script>
<script src="/static/mini-upload-form/assets/js/jquery.iframe-transport.js"></script>
<script src="/static/mini-upload-form/assets/js/jquery.fileupload.js"></script>
<script src="/static/mini-upload-form/assets/js/jquery.knob.js"></script>
<script src="/static/mini-upload-form/assets/js/script.js"></script>
<link href="/static/mini-upload-form/assets/css/style.css" rel="stylesheet" />
```

## HTML Pattern

```html
<div class="upload" data-module="blog" data-action="upload-image">
    <div class="drop">
        Drop Here
        <a>Browse</a>
        <input type="file" name="upl" multiple />
    </div>
    <ul>
        <!-- Progress indicators appear here -->
    </ul>
</div>
```

**data-module / data-action:** Routes to `/{module}/{action}` like dispatch

## Flask Handler Pattern

```python
from werkzeug.utils import secure_filename
import os

UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf'}

@bp.route('/blog/upload-image', methods=['POST'])
def upload_image():
    if 'upl' not in request.files:
        return jsonify({"status": "error", "message": "No file"})
    
    file = request.files['upl']
    
    if file.filename == '':
        return jsonify({"status": "error", "message": "Empty filename"})
    
    # Validate extension
    extension = file.filename.rsplit('.', 1)[1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        return jsonify({"status": "error", "message": "Invalid file type"})
    
    # Save file
    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    
    try:
        file.save(filepath)
        
        # Return dispatch response
        return jsonify({
            "status": "success",
            "htmls": {
                "#preview": f'<img src="/static/uploads/{filename}" class="img-fluid">'
            }
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})
```

## Integration with postAjax

The upload script calls `postAjax()` on completion (line 87 of script.js), so server responses work exactly like dispatch:

```python
return jsonify({
    "status": "success",
    "htmls": {"#container": html},
    "vboxclose": True
})
```

## Progress Indicator

jQuery Knob shows circular progress during upload. Automatic - no extra code needed.

## Multiple Files

Set `multiple` attribute on input to allow multiple file selection.

## Multiple Upload Widgets (Dynamic IDs)

When you have multiple upload widgets on the same page, use dynamic IDs to target specific widgets.

**Jinja template:**
```html
{% set upload_id = range(100000, 999999) | random %}
<div id="upload-widget-{{ upload_id }}" class="upload" data-module="blog" data-action="upload-image">
    <div class="drop">Drop Image <a>Browse</a>
        <input type="file" name="upl" />
        <input type="hidden" name="upload_id" value="{{ upload_id }}" />
    </div>
    <ul></ul>
</div>
<div id="preview-{{ upload_id }}"></div>
```

**Flask handler:**
```python
@bp.route('/blog/upload-image', methods=['POST'])
def upload_image():
    upload_id = request.form.get('upload_id')
    # ... save file ...
    
    return jsonify({
        "status": "success",
        "htmls": {
            f"#preview-{upload_id}": f'<img src="/uploads/{filename}">',
            f"#upload-widget-{upload_id} ul": ''  # Clear progress
        }
    })
```

**Why:** Each widget has unique ID, allowing multiple uploads on same page with targeted updates.

## Common Use Cases

**Image upload for posts:**
```html
<div class="upload" data-module="blog" data-action="upload-featured-image">
    <div class="drop">Drop Image <a>Browse</a>
        <input type="file" name="upl" accept="image/*" />
    </div>
    <ul></ul>
</div>
<div id="preview"></div>
```

**Document upload:**
```html
<div class="upload" data-module="docs" data-action="upload-pdf">
    <div class="drop">Drop PDF <a>Browse</a>
        <input type="file" name="upl" accept=".pdf" />
    </div>
    <ul></ul>
</div>
```

## Security Notes

1. Always use `secure_filename()` from werkzeug
2. Validate file extensions on server
3. Limit file sizes in Flask config: `app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB`
4. Store uploads outside static folder for sensitive files
5. Generate unique filenames to prevent overwrites: `f"{uuid.uuid4()}_{secure_filename(file.filename)}"`
