(function($){
$(document).ready(function(){

    $(document).on('click','.drop a', function(){
        var $drop = $(this);
        var $upload = $drop.closest('.upload');
        var ul = $upload.find('ul');
		var _file_count = 0;

        $upload.find('input').click();
    });


    window.init_file_upload = function($element) {

        // Get module and action from data attributes
        var _module = $element.attr('data-module') || 'admin';
        var _action = $element.attr('data-action') || 'upload';

        // Build URL like dispatch does
        var upload_url = '/' + _module + '/' + _action;

        // Initialize the jQuery File Upload plugin
        $($element).fileupload({

            url: upload_url,
            //var $this = $(this);
            // This element will accept file drag/drop uploading
            dropZone: $element.find('.drop'),
            // This function is called when a file is added to the queue;
            // either via the browse button, or via drag/drop:
            add: function (e, data) {
				_file_count = data.originalFiles.length;
				//console.log(data,e);
				//return false;
                ul = $element.find('ul');
                //console.log('adsf');
                $('.ajaxform button.submit').attr('disabled','disabled');
                var tpl = $('<li class="working"><input type="text" value="0" data-width="48" data-height="48" data-fgColor="#0788a5" data-readOnly="1" data-bgColor="#3e4043" /><p>Processing...</p></li>');

                // Append the file name and file size
                //tpl.find('p').text(data.files[0].name).append('<i>' + formatFileSize(data.files[0].size) + '</i>');

                // Add the HTML to the UL element
                ul[0].innerHTML = '';
                data.context = tpl.appendTo(ul);

                // Initialize the knob plugin
                tpl.find('input').knob();

                // Listen for clicks on the cancel icon
                tpl.find('span').click(function(){

                    if(tpl.hasClass('working')){
                        jqXHR.abort();
                    }

                    tpl.fadeOut(function(){
                        tpl.remove();
                    });

                });

                // Automatically upload the file once it is added to the queue
                var jqXHR = data.submit();
            },

            progress: function(e, data){

                // Calculate the completion percentage of the upload
                var progress = parseInt(data.loaded / data.total * 100, 10);

                // Update the hidden input field and trigger a change
                // so that the jQuery knob plugin knows to update the dial
                data.context.find('input').val(progress).change();

                if(progress == 100){
                    data.context.removeClass('working');
                }
            },

            complete:function(e, data) {
                // console.log(e,data);
                var _data = $.parseJSON(e.responseText);
				//_data.file_count = _file_count;
                //console.log(_data);
                postAjax(_data);
                $('.ajaxform button.submit').removeAttr('disabled');
				$element.find('ul').html('');
            },

            fail:function(e, data){
                // Something has gone wrong!
                data.context.addClass('error');
            }

        });
    }
    $('.upload').each(function() {
        window.init_file_upload($(this));
    });
    // Simulate a click on the file input button
    // to show the file browser dialog


    // Prevent the default action when a file is dropped on the window
    $(document).on('drop dragover', function (e) {
        e.preventDefault();
    });

    // Helper function that formats the file sizes
    function formatFileSize(bytes) {
        if (typeof bytes !== 'number') {
            return '';
        }

        if (bytes >= 1000000000) {
            return (bytes / 1000000000).toFixed(2) + ' GB';
        }

        if (bytes >= 1000000) {
            return (bytes / 1000000).toFixed(2) + ' MB';
        }

        return (bytes / 1000).toFixed(2) + ' KB';
    }

});
})(jQuery);