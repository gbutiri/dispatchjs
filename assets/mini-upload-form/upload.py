import os
from flask import Flask, request, jsonify

app = Flask(__name__)

# A list of permitted file extensions
allowed_extensions = {'mp3', 'wav', 'ogg'}

# Check if the POST request has the file part
if 'upl' in request.files and request.files['upl'].filename != '':
    file = request.files['upl']

    # Get the file extension
    extension = file.filename.rsplit('.', 1)[1].lower()

    # Check if the extension is allowed
    if extension in allowed_extensions:
        upload_folder = 'uploads'

        # Ensure the upload folder exists
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder)

        # Save the file to the specified directory
        file_path = os.path.join(upload_folder, file.filename)

        try:
            file.save(file_path)
            response = {"status": "success"}
        except Exception as e:
            response = {"status": "error", "message": str(e)}
    else:
        response = {"status": "error"}
else:
    response = {"status": "error"}

#print(jsonify(response))