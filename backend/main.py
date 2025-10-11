
import os
import shutil
import uuid
import zipfile
from fastapi import FastAPI, File, UploadFile, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pdf2image import convert_from_path

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Temporary directories for processing
TEMP_DIR = "temp"
os.makedirs(TEMP_DIR, exist_ok=True)

def cleanup_files(session_dir: str, zip_path: str):
    """Removes the session directory and the zip file."""
    try:
        shutil.rmtree(session_dir)
    except OSError as e:
        print(f"Error removing session directory {session_dir}: {e}")
    try:
        os.remove(zip_path)
    except OSError as e:
        print(f"Error removing zip file {zip_path}: {e}")

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...), background_tasks: BackgroundTasks = BackgroundTasks()):
    session_id = str(uuid.uuid4())
    session_dir = os.path.join(TEMP_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)

    pdf_path = os.path.join(session_dir, file.filename)
    
    # Save the uploaded PDF
    with open(pdf_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Convert PDF to images
    try:
        images = convert_from_path(pdf_path)
        image_paths = []
        for i, image in enumerate(images):
            image_path = os.path.join(session_dir, f"page_{i + 1}.png")
            image.save(image_path, "PNG")
            image_paths.append(image_path)
    except Exception as e:
        # Cleanup and return error if conversion fails
        shutil.rmtree(session_dir)
        return {"error": f"Failed to convert PDF: {str(e)}"}

    # Create a zip file
    zip_filename = f"{os.path.splitext(file.filename)[0]}.zip"
    zip_path = os.path.join(TEMP_DIR, zip_filename)
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        for image_path in image_paths:
            zipf.write(image_path, os.path.basename(image_path))

    # Add cleanup task to run after the response is sent
    background_tasks.add_task(cleanup_files, session_dir, zip_path)

    return FileResponse(
        path=zip_path,
        media_type='application/zip',
        filename=zip_filename
    )

@app.get("/")
def read_root():
    return {"message": "PDF to Image Converter Backend"}

