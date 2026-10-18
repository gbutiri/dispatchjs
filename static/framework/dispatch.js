console.log('Using the compressed one.');

/**
 * DISPATCH FRAMEWORK - UNI Frontend AJAX Controller
 *
 * Declarative AJAX system using HTML data attributes. Backend routes return JSON
 * with DOM manipulation instructions that this framework executes automatically.
 *
 * CORE PATTERN:
 *   1. Add data attributes to HTML elements (data-module, data-action, data-data)
 *   2. Trigger AJAX via classes: .tmbtn, .ajaxform, .autosave
 *   3. Backend returns JSON with DOM manipulation commands
 *   4. postAjax() executes all commands in sequence
 *
 * HTML TRIGGERS:
 *   .tmbtn        - Click triggers AJAX
 *   .tmbtnchk     - Click triggers AJAX (checkboxes)
 *   .ajaxform     - Form submit triggers AJAX
 *   .autosave     - Change triggers AJAX (saves on blur)
 *
 * DATA ATTRIBUTES:
 *   data-module   - Backend module/blueprint (default: 'dashboard')
 *   data-action   - Backend route/action (default: 'bad_call')
 *   data-data     - Additional POST parameters
 *   data-noload   - Skip loading spinner
 *   data-loadmsg  - Custom loading message
 *   data-vboxclose - Close modal without AJAX
 *
 * BACKEND RESPONSE FORMAT (JSON):
 *   {
 *     htmls: {selector: html},           // Replace element HTML
 *     values: {selector: value},         // Set input values
 *     errors: {selector: error_html},    // Display validation errors
 *     appends: {selector: html},         // Append HTML to element
 *     prepends: {selector: html},        // Prepend HTML to element
 *     removes: [selector],               // Remove elements
 *     classAdds: {selector: classes},    // Add CSS classes
 *     classRemoves: {selector: classes}, // Remove CSS classes
 *     focus: selector,                   // Focus element
 *     redirect: url,                     // Navigate to URL
 *     vbox: html,                        // Open modal with content
 *     vboxclose: true,                   // Close current modal
 *     alert: {title, message, type},     // Show notification (PNotify)
 *     js: "console.log('hi')",          // Execute JavaScript
 *     ...and 20+ more manipulation types
 *   }
 *
 * KEY FUNCTIONS:
 *   postAjax(data)              - Execute all JSON response commands
 *   el_split(selector)          - Handle compound jQuery selectors
 *   do_toggle(data)             - Handle dropdown/toggle behaviors
 *   processAutosave()           - Handle autosave success/error feedback
 *   processInternalErrors()     - Scroll to validation errors
 *   handleSpinner()             - Remove loading spinners
 *   processXHRError()           - Handle AJAX failures
 *
 * VBOX MODAL SYSTEM:
 *   $.fn.vbox('open', html)     - Open modal with content
 *   $.fn.vbox('close')          - Close top modal
 *   $.fn.vbox('closeall')       - Close all modals
 *   ESC key closes modals
 *   Supports stacked modals (g_vboxlevel counter)
 *
 * LOADING SPINNER:
 *   Automatic on all AJAX calls unless data-noload present
 *   Shows FontAwesome spinning gear with custom message
 *   Removed automatically on success/error
 *
 * AUTOSAVE BEHAVIOR:
 *   Tracks original value on focus
 *   Only triggers AJAX if value changed
 *   Shows success/error feedback via Bootstrap has-success/has-error
 *   Automatically clears feedback after 1 second
 *
 * ERROR HANDLING:
 *   Network errors: Shows error in vbox modal
 *   Validation errors: Adds has-error class, scrolls to first error
 *   Server errors: HTTP 500/404 handled with user-friendly messages
 *
 * ANIMATION SUPPORT:
 *   slide_html_left/right: Slide transitions for vbox content
 *   slideups/slidedowns: jQuery slideUp/slideDown animations
 *
 * USED BY:
 *   All UNI frontend pages (chat, settings, admin, etc.)
 *   All Flask blueprints return dispatch-compatible JSON
 *
 * DEPENDENCIES:
 *   - jQuery
 *   - PNotify (for alert notifications)
 *   - FontAwesome (for icons)
 *
 * EXAMPLES:
 *   <!-- Button trigger -->
 *   <button class="tmbtn" data-module="chat" data-action="send">Send</button>
 *
 *   <!-- Form trigger -->
 *   <form class="ajaxform" data-module="settings" data-action="update">
 *     <input name="api_key">
 *     <button type="submit">Save</button>
 *   </form>
 *
 *   <!-- Autosave trigger -->
 *   <input class="autosave" data-module="settings" data-action="autosave" name="email">
 */

var _autosave_value = '';
var kt;


/**
 * Parse and execute compound jQuery selectors
 *
 * Handles selectors with spaces (e.g., "#parent .child") by splitting into
 * parent selector and find() operation. Simple selectors return standard $().
 *
 * LOGIC:
 *   1. Check if selector contains space
 *   2. If yes → split by space, use first part as parent, rest as find() target
 *   3. If no → return standard $(selector)
 *
 * @param {string} el - jQuery selector (simple or compound)
 * @returns {jQuery} jQuery object
 *
 * @example
 *   el_split("#chat .message") → $("#chat").find(".message")
 *   el_split(".button") → $(".button")
 */
function el_split(el) {
	if (el.indexOf(" ") !== -1) {

		_split = el.split(" ");
		_first = _split[0];
		_rest = _split.slice(1).join(" ");
		return $(_first).find(_rest);

	} else {

		return $(el);

	}
}


/**
 * Execute toggle behavior based on trigger type
 *
 * Handles three toggle patterns defined by data-trigger attribute on parent:
 * - "toggle": Toggle visibility of .trigger elements
 * - "dropdown": Toggle visibility of .target elements
 * - "dropdown-toggle": Toggle both .trigger and .target elements
 *
 * @param {Object} d - Response data object containing _toggle_type and $parent
 * @param {string} d._toggle_type - Toggle type from data-trigger attribute
 * @param {jQuery} d.$parent - Parent element containing .trigger/.target
 *
 * Used by:
 *   - postAjax(): Executed after AJAX response processing
 */
function do_toggle(d) {

	switch (d._toggle_type) {

		case "toggle":
			d.$parent.find('.trigger').toggleClass('hidden');
			break;

		case "dropdown":
			d.$parent.find('.target').toggleClass('hidden');
			break;

		case "dropdown-toggle":
			d.$parent.find('.trigger').toggleClass('hidden');
			d.$parent.find('.target').toggleClass('hidden');
			break;

	}

}


/**
 * Execute all DOM manipulation commands from backend JSON response
 *
 * Core dispatch function that processes backend JSON and applies changes to DOM.
 * Executes commands in specific order to ensure proper rendering sequence.
 *
 * EXECUTION ORDER:
 *   1. slide_html_left/right - Animated slide transitions
 *   2. htmls - Replace element HTML
 *   3. errors - Display validation errors with has-error class
 *   4. values - Set input/select values
 *   5. slideups/slidedowns - jQuery slide animations
 *   6. appends - Append HTML to elements
 *   7. prepends - Prepend HTML to elements
 *   8. appendsto - Append element to target
 *   9. replaceables - Replace entire element
 *   10. removes - Remove elements from DOM
 *   11. afters - Insert HTML after element
 *   12. befores - Insert HTML before element
 *   13. attrremoves - Remove attributes
 *   14. propchanges - Change element properties
 *   15. attrchanges - Change element attributes
 *   16. classRemoves - Remove CSS classes
 *   17. classAdds - Add CSS classes
 *   18. classToggles - Toggle CSS classes
 *   19. csselems - Apply inline CSS styles
 *   20. focus - Focus specific element
 *   21. vbox/vboxclose/vboxcloseall - Modal operations
 *   22. closevbox/closevboxall - Modal close operations
 *   23. redirect - Navigate to URL
 *   24. cont - Trigger doAjaxController event
 *   25. alert - Display PNotify notification
 *   26. push - Update browser history
 *   27. js - Execute arbitrary JavaScript (eval)
 *   28. posthtmls - Final HTML updates (after all operations)
 *   29. do_toggle() - Execute toggle behaviors
 *
 * COMMAND FORMATS:
 *   htmls: {selector: html_string}
 *   values: {selector: value}
 *   errors: {selector: error_html}
 *   removes: [selector_array]
 *   classAdds: {selector: "class1 class2"}
 *   alert: {title: "Title", message: "Text", type: "success|error|info"}
 *   redirect: "url_string"
 *   js: "javascript_code_string"
 *
 * @param {Object} d - Backend JSON response data
 *
 * Used by:
 *   - doAjaxController event handler (main AJAX success callback)
 *   - processAutosave() (autosave-specific handling)
 */
function postAjax(d) {

	for (el in d.slide_html_left) {
		$vbox = $(document).find('.vbox');
		$vbox.animate({left:"-100%"}, 200, function() {
			$vbox.hide().html(d.slide_html_left[el]).css({'left':'100%'}).show().animate({'left': '0%'});
		});
	}

	for (el in d.slide_html_right) {
		$vbox = $(document).find('.vbox');
		$vbox.animate({left:"100%"}, 200, function() {
			$vbox.hide().html(d.slide_html_right[el]).css({'left':'-100%'}).show().animate({'left': '0%'});
		});
	}

	for (el in d.htmls) {
		el_split(el).html(d.htmls[el]);
	}

	for (el in d.errors) {
		el_split(el).html(d.errors[el]);
		el_split(el).closest('.has-feedback').addClass('has-error');
	}

	for (el in d.values) {
		el_split(el).val(d.values[el]);
	}

	for (el in d.slideups) {
		$(document).find(d.slideups[el]).slideUp(function() {
			$(d.slideups[el]).remove();
		});
	}

	for (el in d.slidedowns) {
		$(document).find(d.slidedowns[el]).slideDown();
	}

	for (el in d.appends) {
		el_split(el).append(d.appends[el]);
	}

	for (el in d.prepends) {
		el_split(el).prepend(d.prepends[el]);
	}

	for (el in d.appendsto) {
		el_split(el).appendTo(d.appendsto[el]);
	}

	for (el in d.replaceables) {
		el_split(el).replaceWith(d.replaceables[el]);
	}

	for (el in d.removes) {
		$(document).find(d.removes[el]).remove();
	}

	for (el in d.afters) {
		el_split(el).after(d.afters[el]);
	}

	for (el in d.befores) {
		el_split(el).before(d.befores[el]);
	}

	for (el in d.attrremoves) {
		el_split(el).removeAttr(d.attrremoves[el]);
	}

	for (el in d.propchanges) {
		for (value in d.propchanges[el]) {
			$(el).prop(value, d.propchanges[el][value]);
		}
	}

	for (el in d.attrchanges) {
		for (value in d.attrchanges[el]) {
			$(el).attr(value, d.attrchanges[el][value]);
		}
	}

	for (el in d.classRemoves) {
		el_split(el).removeClass(d.classRemoves[el]);
	}

	for (el in d.classAdds) {
		el_split(el).addClass(d.classAdds[el]);
	}

	for (el in d.classToggles) {
		el_split(el).toggleClass(d.classToggles[el]);
	}

	for (el in d.csselems) {
		for (v in d.csselems[el]) {
			el_split(el).css(v, d.csselems[el][v]);
		}
	};

	if (typeof(d.focus) !== 'undefined') {
		$(d.focus).focus();
	};

	if (typeof(d.vbox) !== 'undefined') {
		$.fn.vbox('open', d.vbox);
	};

	if (typeof(d.vboxclose) !== 'undefined') {
		$.fn.vbox('close');
	};

	if (typeof(d.vboxcloseall) !== 'undefined') {
		$.fn.vbox('closeall');
	};

	if (typeof(d.closevbox) !== 'undefined') {
		$.fn.vbox('close');
	}

	if (typeof(d.closevboxall) !== 'undefined') {
		$.fn.vbox('closeall');
	}

	if (typeof(d.redirect) !== 'undefined') {

		if (d.redirect != '') {
			window.location.href = d.redirect;
		}

	}

	if (typeof(d.cont) !== 'undefined') {
		$(document).trigger('doAjaxController', [$(d.cont)]);
	}

	if (typeof(d.alert) !== 'undefined') {

		var _alert = $.parseJSON(d.alert);

		new PNotify({
			title : _alert.title,
			text : _alert.message,
			type : _alert.type,
			//styling : 'bootstrap3',
			styling : 'fontawesome',
		});

	}

	if (typeof(d.push) !== 'undefined') {
		history.pushState(d.push.data, d.push.title, d.push.url);
	}

	if (typeof(d.js) !== 'undefined') {

		try {
			console.log(d.js);
			eval(d.js);
		} catch (e) {}

	}

	for (el in d.posthtmls) {
		el_split(el).html(d.posthtmls[el]);
	}

	do_toggle(d);
}


/**
 * Display loading spinner on page
 *
 * Appends animated loading circle to body using _loading_circle_html template.
 *
 * Used by:
 *   - doAjaxController event handler (shows spinner before AJAX call)
 */
function load_circle() {
	$('body').append(_loading_circle_html);
}


/**
 * Remove loading spinner from page
 *
 * Removes #loading-circle element from DOM.
 *
 * Used by:
 *   - AJAX success callback (removes spinner after response)
 *   - AJAX error callback (removes spinner on failure)
 */
function remove_circle() {
	$('#loading-circle').remove();
}


/**
 * Handle autosave success/error feedback display
 *
 * Shows visual feedback for autosave operations using Bootstrap has-success/has-error
 * classes. Success feedback clears after 1 second timeout.
 *
 * LOGIC:
 *   1. If no error → remove disabled attribute, add has-success class
 *   2. Set 1 second timeout to remove success/error classes
 *   3. Clear error messages
 *   4. If error → add has-error class to parent and closest .has-feedback
 *   5. Display error message in .err element with text-danger class
 *
 * @param {Object} data - Backend response data
 * @param {boolean} data.error - Error message if present
 * @param {jQuery} $this - Input element being autosaved
 * @param {jQuery} $parent - Parent container element
 *
 * Used by:
 *   - doAjaxController event handler (autosave success callback)
 */
function processAutosave(data, $this, $parent) {

	// Debugging
	console.log('doing-autosave');

	// If there is no error, we will remove the disabled attribute and show success
	if (!data.error) {

		// remove the disabled attribute
		$this.removeAttr('disabled');

		// add the success class to the parent
		$parent.addClass('has-success');

		// Set a one second timeout to remove the success class and clean up.
		var k = setTimeout(function () {
			$parent.removeClass('has-success has-error')
		}, 1000);
		$parent.find('.err').html('');

	} else {

		// If there is an error, we will add the error class to the parent and show the error message
		$this.parent().addClass('has-error');
		$parent.find('.err').addClass('text-danger').html(data.error);
		$this.closest('.has-feedback').addClass('has-error');

	}
}


/**
 * Handle validation errors and scroll to first error
 *
 * Checks for errors or success messages in response. If errors exist, scrolls
 * to first .has-error element and changes submit button to danger state.
 *
 * LOGIC:
 *   1. Check if data.errors or data.success exists
 *   2. Find first .has-error element in form
 *   3. Animate scroll to first error (200ms swing)
 *   4. Change submit button classes to btn-danger
 *
 * @param {Object} data - Backend response data
 * @param {Object} data.errors - Validation errors object
 * @param {boolean} data.success - Success flag
 * @param {jQuery} $this - Form element being processed
 *
 * Used by:
 *   - doAjaxController event handler (after postAjax execution)
 */
function processInternalErrors(data, $this) {
	// Check to see if there are any errors or success messages
	if (typeof(data.errors) !== 'undefined' || data.success) {

		// If there are errors, we will scroll to the first error
		if (typeof($this.find('.has-error')[0]) !== 'undefined') {

			// Scroll to the first error
			$('html, body').animate({
				scrollTop : $this.find('.has-error').offset().top
			}, 200, 'swing');

			// Add the error class to the parent
			$this.find('[type="submit"]').removeClass('btn-success btn-warning').addClass('btn-danger');

		}
	} else {}

}


/**
 * Remove loading spinner and re-enable button after AJAX completion
 *
 * Restores button to original state by removing disabled attribute, removing
 * btn-default class, restoring original button classes, and removing spinner icon.
 *
 * LOGIC:
 *   1. If submit button exists → remove disabled, remove btn-default class
 *   2. Restore original button classes from _btn_classes
 *   3. Remove .fa-spinner icon
 *   4. If no submit button → just remove disabled attribute
 *
 * @param {jQuery} $this - Form or button element
 * @param {string} _btn_classes - Original button CSS classes to restore
 *
 * Used by:
 *   - doAjaxController event handler (AJAX success callback)
 *   - processXHRError() (AJAX error callback)
 */
function handleSpinner($this, _btn_classes) {
	if ($this.find('[type="submit"]')) {
		$this.find('[type="submit"]').removeAttr('disabled').removeClass('btn-default').addClass(_btn_classes).find('.fa-spinner').remove();
	} else {
		// Otherwise, we will just remove the disabled attribute, enabling the button
		$this.removeAttr('disabled');
	}
}


/**
 * Handle AJAX request failures and display user-friendly error messages
 *
 * Processes different HTTP status codes and exception types, removes loading
 * spinner, and displays error message in vbox modal.
 *
 * ERROR TYPES HANDLED:
 *   - jqXHR.status === 0: Network connection failure
 *   - jqXHR.status == 404: Page not found
 *   - jqXHR.status == 500: Internal server error
 *   - exception === 'parsererror': JSON parsing failed
 *   - exception === 'timeout': Request timeout
 *   - exception === 'abort': Request aborted
 *   - Other: Uncaught error with responseText
 *
 * LOGIC:
 *   1. Determine error message based on status/exception
 *   2. Remove disabled attribute from submit button
 *   3. Remove btn-default, restore original classes, remove spinner
 *   4. Remove loading circle from DOM
 *   5. Open vbox modal with error message
 *
 * @param {Object} jqXHR - jQuery XHR object
 * @param {string} exception - Exception type string
 * @param {jQuery} $this - Form or button element
 * @param {string} _btn_classes - Original button CSS classes to restore
 *
 * Used by:
 *   - doAjaxController event handler (AJAX error callback)
 */
function processXHRError(jqXHR, exception, $this, _btn_classes) {
	console.log('error');
	var msg = '';
	if (jqXHR.status === 0) {
		msg = '<strong>Dispatch Framework Error</strong><br><br>Connection failed. Please check your network connection and try again.';
	} else if (jqXHR.status == 404) {
		msg = '<strong>Dispatch Framework Error</strong><br><br>Page not found. The requested action does not exist.<br><br><small>HTTP 404</small>';
	} else if (jqXHR.status == 500) {
		msg = '<strong>Dispatch Framework Error</strong><br><br>Internal server error. Please try again or contact support if the problem persists.<br><br><small>HTTP 500</small>';
	} else if (exception === 'parsererror') {
		msg = '<strong>Dispatch Framework Error</strong><br><br>Invalid response from server. Please refresh the page and try again.';
	} else if (exception === 'timeout') {
		msg = '<strong>Dispatch Framework Error</strong><br><br>Request timed out. Check your connection and try again.';
	} else if (exception === 'abort') {
		msg = '<strong>Dispatch Framework Error</strong><br><br>Request was cancelled. Please try again.';
	} else {
		msg = '<strong>Dispatch Framework Error</strong><br><br>An unexpected error occurred.<br><br><small>' + jqXHR.responseText + '</small>';
	}

	$this.find('[type="submit"]').removeAttr('disabled').removeClass('btn-default').addClass(_btn_classes).find('.fa-spinner').remove();

	$(document).find('#loading-circle').remove();
	$.fn.vbox("open", msg);
}


/**
 * Main AJAX controller event handler - orchestrates all dispatch operations
 *
 * Central event that processes all AJAX requests triggered by .tmbtn, .ajaxform,
 * and .autosave elements. Extracts data attributes, builds AJAX request, handles
 * loading states, and processes response via postAjax().
 *
 * WORKFLOW:
 *   1. Extract data attributes (data-module, data-action, data-data)
 *   2. Clear previous error states (has-error, has-success)
 *   3. Determine toggle type from parent's data-trigger
 *   4. Handle special cases (data-vboxclose, data-noload)
 *   5. Show loading spinner (unless data-noload present)
 *   6. If ajaxform → serialize form data, disable submit button, add spinner
 *   7. If autosave → check if value changed, only AJAX if different
 *   8. Build AJAX URL: /{module}/{action}
 *   9. Execute POST request with jQuery.ajax()
 *   10. On success → handleSpinner, processAutosave (if needed), postAjax, processInternalErrors
 *   11. On error → processXHRError
 *
 * DATA ATTRIBUTES PROCESSED:
 *   data-module: Backend module/blueprint (default: 'dashboard')
 *   data-action: Backend route (default: 'bad_call')
 *   data-data: Additional POST parameters
 *   data-vboxclose: Close modal without AJAX
 *   data-noload: Skip loading spinner
 *   data-loadmsg: Custom loading message (default: 'Stand by ...')
 *
 * SPECIAL BEHAVIORS:
 *   - ajaxform: Serializes form, disables/spinners submit button
 *   - autosave: Only triggers if value changed from focus, shows success feedback
 *   - Checkbox autosave: Sends checked state (1 or 0)
 *   - Submit button value: Captures focused submit button for multi-button forms
 *
 * @param {Event} e - jQuery event object
 * @param {jQuery} $this - Element that triggered the event
 *
 * Triggered by:
 *   - .tmbtn click events
 *   - .tmbtnchk click events
 *   - .ajaxform submit events
 *   - .autosave change events
 *   - Manual $(document).trigger('doAjaxController', [$element])
 */
$(document).on('doAjaxController', function (e, $this) {
	var _data = '';
	var _action = 'bad_call';
	var _module = 'dashboard';
	var _do_ajax = true;
	var _noload = false;
	var _toggle_type = '';
	var $parent = $this.parent();

	$(document).find('.has-feedback').removeClass('has-error has-success');

	if (typeof($this.attr('data-data')) !== 'undefined') {
		_data = $this.attr('data-data');
	}

	if (typeof($this.attr('data-action')) !== 'undefined') {
		_action = $this.attr('data-action');
	}

	if (typeof($this.attr('data-module')) !== 'undefined') {
		_module = $this.attr('data-module');
	}

	if (typeof($this.attr('data-vboxclose')) !== 'undefined') {
		_do_ajax = false;
		$.fn.vbox('close');
	}

	if (typeof($parent.attr('data-trigger')) !== 'undefined') {
		_toggle_type = $parent.attr('data-trigger');
	}

	if (typeof($this.attr('data-noload')) !== 'undefined') {
		_noload = true;
	}

	if (_noload == false) {

		load_circle();

		if (typeof($this.attr('data-loadmsg')) !== 'undefined') {
			_loadmsg = $this.attr('data-loadmsg');
		} else {
			_loadmsg = 'Stand by ...';
		}

		$(document).find('#loading-circle').find('.loading-circle-message').html(_loadmsg);

	}

	var _btn_classes = '';

	if ($this.hasClass('ajaxform')) {

		_btn_classes = $this.find("[type=submit]").attr('class');
		_data = $this.serialize();

		$this.find('.err').addClass('text-danger');
		if ($this.find("[type=submit]")) {

			$button = $this.find('[type="submit"]');
            if ($button.hasClass('btn-block')) {_block = 'btn-block';} else {_block = '';}
			$button.attr('disabled', "disabled").attr('class', 'btn ' + _block + ' btn-default').append(' <i class="fad fa-spinner fa-spin"></i>');

			var btn = $this.find("button[type=submit]:focus").val();
			var _spliter = (_data.length > 0) ? '&' : '';
			_data += _spliter + $this.find("button[type=submit]:focus").attr('name') + '=' + btn;

		} else {
			//$this.find('button')
		}

		$this.find('.err').html('');

	} else if ($this.hasClass('autosave')) {

		if ($this.attr('type') == 'checkbox') {

			_data += "&name=" + $this.attr('name') + '&value=' + ($this.is(':checked') ? 1: 0);

		} else {

			_data += "&name=" + $this.attr('name') + '&value=' + encodeURIComponent($this.val());
			console.log($this.val(), _autosave_value);

			if ($this.val() !== _autosave_value) {

				$this.attr('disabled', 'disabled');
				$parent.removeClass('has-error has-success');

			} else {

				$this.removeAttr('disabled');
				_do_ajax = false;

			}

		}

	} else {

		_data = $this.attr('data-data') ? $this.attr('data-data') : '';
		if (typeof($this.prop('checked')) !== 'undefined') {
			_data += '&checked=' + $this.prop('checked');
		}

	};

	if (_do_ajax) {

		// Prepend the slash for the action if it is not empty
		if (_action != '') {
			_action = '/' + _action;
		}

		// Start status polling if data-poll-status is set
		var _poll_status = $this.attr('data-poll-status');
		if (_poll_status) {
			startStatusPoll(_module, _poll_status);
		}

		$.ajax({
			url : '/' + _module + _action,
			type : 'post',
			data : _data,
			dataType : 'json',
			success : function (data) {

				// Stop status polling
				stopStatusPoll();

				// remove the loading circle
				$('#loading-circle').remove();

				// Handle Spinner: If we find the `submit` button, we will remove the spinner and re-enable it
				handleSpinner($this, _btn_classes);

				// Handle autosave.
				if ($this.hasClass('autosave')) {

					// If we are doing an autosave, we will process the data accordingly.
					processAutosave(data, $this, $parent);
					postAjax(data);

				} else {

					// If we are not doing an autosave, we will just run the postAjax function to handle the response.
					postAjax(data);

				}

				// And then we will process any errors that may have occurred.
				processInternalErrors(data, $this);

			},
			error: function(jqXHR, exception) {

				// Stop status polling
				stopStatusPoll();

				processXHRError(jqXHR, exception, $this, _btn_classes);


			}
		});

	} else {

		$('#loading-circle').remove();

	}

}).on('click', '.tmbtnchk', function (e) {

	$(document).trigger('doAjaxController', [$(this)]);

}).on('click', '.tmbtn', function (e) {

	e.preventDefault();
	e.stopPropagation();
	$(document).trigger('doAjaxController', [$(this)]);

}).on('submit', '.ajaxform', function (e) {

	e.preventDefault();
	$(document).trigger('doAjaxController', [$(this)]);

}).on('focus', '.autosave', function (e) {
	var $this = $(this);
	_autosave_value = $this.val();
}).on('change', '.autosave', function (e) {

	e.preventDefault();
	$(document).trigger('doAjaxController', [$(this)]);

}).on('click', function (e) {

	$target = $(e.target);
	$wrapper = $target.parents('.trigger-wrapper');
	$('.trigger-wrapper.reset').not($wrapper).find('.trigger, .target').removeClass('hidden');
	$('.trigger-wrapper.reset').not($wrapper).find('.init-hidden').addClass('hidden');

}).on('click', '.trigger-wrapper .target', function (e) {

	e.stopPropagation();

}).on('change', '.has-error input, .has-error select', function (e) {

	var $this = $(this);
	$this.closest('.has-error').removeClass('has-error');

});


(function ($) {
	/**
	 * VBOX MODAL SYSTEM - jQuery plugin for stacked modals
	 *
	 * Lightweight modal system supporting multiple stacked modals with keyboard
	 * navigation. Each modal has its own overlay (fuzz) and can be closed via
	 * click, ESC key, or programmatic calls.
	 *
	 * FEATURES:
	 *   - Stacked modals: Multiple modals can be open simultaneously
	 *   - Level tracking: g_vboxlevel counter tracks modal depth
	 *   - ESC key support: Closes top modal on ESC keypress
	 *   - Click outside: Clicking .vbox-close closes modal
	 *   - Body scroll lock: Prevents scrolling when modals open
	 *   - Fade animations: 100ms opacity transitions
	 *
	 * USAGE:
	 *   $.fn.vbox('open', html)    - Open modal with HTML content
	 *   $.fn.vbox('close')         - Close top modal
	 *   $.fn.vbox('closeall')      - Close all modals
	 *
	 * HTML STRUCTURE:
	 *   <div class="fuzz" id="vbox_{level}">
	 *     <table class="vbox-table">
	 *       <tr><td class="vbox-cell">
	 *         <div class="vbox container-fluid">
	 *           <div class="vbox-content">{content}</div>
	 *           <a class="vbox-close"><i class="fa fa-times"></i></a>
	 *         </div>
	 *       </td></tr>
	 *     </table>
	 *   </div>
	 *
	 * STATE MANAGEMENT:
	 *   - g_vboxlevel: Global counter for modal depth (0 = no modals)
	 *   - Body overflow: Set to 'hidden' when modals open, 'auto' when all closed
	 *   - Each modal has unique ID with level number
	 *
	 * BEHAVIOR:
	 *   - Open: Increments g_vboxlevel, appends modal, animates opacity to 1
	 *   - Close: Animates opacity to 0, decrements g_vboxlevel, removes modal
	 *   - Close all: Removes all .fuzz elements, resets g_vboxlevel to 0
	 *   - ESC key: Only closes if g_vboxlevel > 0
	 *   - Click propagation: .vbox stops propagation, .vbox-close triggers close
	 *
	 * Used by:
	 *   - postAjax() (vbox/vboxclose/vboxcloseall commands)
	 *   - processXHRError() (error message display)
	 *   - Manual calls: $.fn.vbox('open', '<p>Content</p>')
	 */

	var g_vboxlevel = 0;
	$(document).on('click', '.vbox-close', function (e) {

		e.preventDefault();
		$.fn.vbox('close');

	}).on('click', '.vbox', function (e) {

		e.stopPropagation();

	}).on('keyup', function (e) {

		if (e.keyCode == 27) {
			if (g_vboxlevel > 0) {
				$.fn.vbox('close');
			}
		}

	});

	/**
	 * jQuery vbox plugin - manage modal open/close operations
	 *
	 * Switch-based function that handles three modal operations via action parameter.
	 * Manages modal level tracking, body scroll state, and fade animations.
	 *
	 * ACTIONS:
	 *   "open":
	 *     1. Increment g_vboxlevel counter
	 *     2. Replace template placeholders with level and content
	 *     3. Set body overflow to hidden (prevent scroll)
	 *     4. Append modal HTML to body
	 *     5. Animate opacity from 0 to 1 (100ms)
	 *     6. Add 'visible' class to .vbox
	 *
	 *   "close":
	 *     1. Find modal by current g_vboxlevel
	 *     2. Animate opacity from 1 to 0 (100ms)
	 *     3. Remove 'visible' class from .vbox
	 *     4. On animation complete:
	 *        - Decrement g_vboxlevel
	 *        - Remove modal from DOM
	 *        - If g_vboxlevel == 0, restore body overflow to auto
	 *
	 *   "closeall":
	 *     1. Remove all .fuzz elements from DOM
	 *     2. Reset g_vboxlevel to 0
	 *     3. No animation (immediate removal)
	 *
	 * @param {string} action - Operation to perform: "open", "close", or "closeall"
	 * @param {string} content - HTML content for modal (only used with "open")
	 *
	 * @example
	 *   $.fn.vbox('open', '<p>Hello World</p>')  // Open modal with content
	 *   $.fn.vbox('close')                       // Close top modal
	 *   $.fn.vbox('closeall')                    // Remove all modals
	 *
	 * Used by:
	 *   - postAjax() response handler
	 *   - processXHRError() error display
	 *   - Event handlers (.vbox-close click, ESC key)
	 */
	$.fn.vbox = function (action, content) {

		switch (action) {
		case "open":

			g_vboxlevel++;

			vbox_html = _vbox_html.replace(/{g_vboxlevel}/g, g_vboxlevel).replace(/{content}/g, content);

			$('body').css({
				'overflow' : 'hidden'
			}).append(vbox_html);

			$(document).find('#vbox_' + g_vboxlevel).animate({
				opacity : 1
			}, 100, function () {}).find('.vbox').addClass('visible');

			break;

		case "close":

			$(document).find('#vbox_' + g_vboxlevel).animate({

				opacity : 0

			}, 100, function () {

				g_vboxlevel--;
				$(this).remove();

				if (g_vboxlevel == 0) {

					$('body').css({
						'overflow' : 'auto'
					});

				}

			}).find('.vbox').removeClass('visible');

			break;

		case "closeall":

			$('.fuzz').remove();
			g_vboxlevel = 0;
			break;

		}
	};
}
(jQuery));

// HTML templates
_vbox_html = '<div class="fuzz" id="vbox_{g_vboxlevel}"><table align="center" class="vbox-table"><tr><td class="vbox-cell"><div class="vbox container-fluid"><div class="vbox-content">{content}</div><a href="#" class="vbox-close"><i class="fad fa-times"></i></a></div></td></tr></table></div>';

_loading_circle_html = '<div id="loading-circle"><i class="fad fa-cog fa-spin"></i><div class="loading-circle-message-wrapper"><div class="loading-circle-message">Loading...</div></div></div>';


/**
 * Poll status endpoint and update spinner message
 * Used for long-running tasks like video generation
 */
var _poll_interval = null;

function startStatusPoll(module, clipId) {
    _poll_interval = setInterval(function() {
        $.get('/' + module + '/video-status/' + clipId, function(data) {
            if (data.detail) {
                $('#loading-circle .loading-circle-message').html(data.detail);
            }
        });
    }, 2000);
}

function stopStatusPoll() {
    if (_poll_interval) {
        clearInterval(_poll_interval);
        _poll_interval = null;
    }
}


