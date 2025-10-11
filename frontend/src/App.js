import React, { useState, useCallback } from 'react';
import axios from 'axios';
import './App.css';

function App() {
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);
    const [downloadUrl, setDownloadUrl] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [convertedFileName, setConvertedFileName] = useState(null);

    const handleFileChange = (selectedFile) => {
        const allowedTypes = [
            'application/pdf'
        ];
        
        if (selectedFile && allowedTypes.includes(selectedFile.type)) {
            setFile(selectedFile);
            setError(null);
            setDownloadUrl(null);
            setConvertedFileName(null);
        } else {
            setError('Please select a PDF file (.pdf).');
        }
    };

    const onDrop = useCallback((event) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragOver(false);
        const droppedFile = event.dataTransfer.files[0];
        if (droppedFile) {
            handleFileChange(droppedFile);
        }
    }, []);

    const onDragOver = useCallback((event) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragOver(true);
    }, []);

    const onDragLeave = useCallback((event) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleUpload = async () => {
        if (!file) {
            setError('Please select a file first.');
            return;
        }

        setIsUploading(true);
        setError(null);
        setDownloadUrl(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post('http://localhost:8000/upload', formData, {
                responseType: 'blob', // Important to handle the zip file
            });

            // Create blob with correct mime type
            const blob = new Blob([response.data], { type: 'application/zip' });
            const url = window.URL.createObjectURL(blob);
            setDownloadUrl(url);
            
            // Extract filename from response headers or use uploaded filename
            let filename = file.name.replace(/\.pdf$/i, '');
            const contentDisposition = response.headers['content-disposition'];
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].replace('.zip', '');
                }
            }
            setConvertedFileName(filename);
            setFile(null); // Clear the file input after successful upload

        } catch (err) {
            if (err.response && err.response.data) {
                const errorData = err.response.data;
                if (errorData instanceof Blob) {
                    try {
                        const errorJsonText = await errorData.text();
                        const errorJson = JSON.parse(errorJsonText);
                        setError(errorJson.error || 'An error occurred during conversion.');
                    } catch (e) {
                        setError('Could not parse error response.');
                    }
                } else {
                     setError(err.response.data.error || 'An unknown error occurred.');
                }
            } else {
                setError('A network error occurred. Is the backend server running?');
            }
        } finally {
            setIsUploading(false);
        }
    };
    
    const triggerFileInput = () => {
        document.getElementById('file-input').click();
    };

    return (
        <div className="App">
            <header className="App-header">
                <h1>PDF to Image Converter</h1>
                <p>Drag & drop a PDF file or click to select</p>
                <div
                    className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onClick={triggerFileInput}
                >
                    <input 
                        id="file-input"
                        type="file" 
                        accept="application/pdf,.pdf"
                        onChange={(e) => handleFileChange(e.target.files[0])} 
                        style={{ display: 'none' }}
                    />
                    {file ? (
                        <p>Selected file: {file.name}</p>
                    ) : (
                        <p>Drop your PDF file here</p>
                    )}
                </div>

                {error && <p className="error-message">{error}</p>}

                <button onClick={handleUpload} disabled={isUploading || !file}>
                    {isUploading ? 'Converting...' : 'Convert to Images'}
                </button>

                {isUploading && (
                    <div className="spinner-container">
                        <div className="spinner"></div>
                        <p>Processing your file, please wait...</p>
                    </div>
                )}

                {downloadUrl && (
                    <div className="download-section">
                        <p>Your file is ready!</p>
                        <a href={downloadUrl} download={`${convertedFileName}.zip`}>
                            <button>Download ZIP</button>
                        </a>
                    </div>
                )}
            </header>
        </div>
    );
}

export default App;