# Declutter.IQ

Declutter.IQ is an intelligent, full-stack application designed to help you analyze, organize, and clean up your local file system. It identifies duplicate files, near-duplicate images, and "zombie" files, giving you actionable insights to reclaim storage space safely and efficiently.

## Features

- **Smart Scanning & Analytics**: Scan any directory to get a breakdown of file types, storage usage, and top large files.
- **Duplicate Detection**: Find exact file duplicates and near-duplicate images (using perceptual hashing) to free up space.
- **Semantic Duplicates**: Advanced semantic scanning to identify conceptually similar files.
- **Zombie File Detection**: Find large files (over 100MB) that haven't been accessed in over a year.
- **Smart Categorization**: Preview how your clutter can be neatly organized into folders (Images, Documents, Videos, Archives, etc.).
- **Safe Deletion**: Files are sent to the system trash/recycle bin instead of being permanently deleted, preventing accidental data loss.

## Tech Stack

### Backend
- **Python & Flask**: Provides robust REST APIs.
- **ImageHash & Pillow**: Powers perceptual hashing for near-duplicate image detection.
- **Send2Trash**: Ensures files are safely moved to the recycle bin.

### Frontend
- **React & Vite**: Fast, modern frontend framework.
- **React Three Fiber & Drei**: 3D visualizations and interactive elements.
- **Framer Motion**: Smooth, beautiful UI animations.
- **Recharts**: Data visualization for storage analytics.

## Getting Started

### Prerequisites
- Python 3.x
- Node.js & npm

### Backend Setup
1. Navigate to the root directory.
2. Create a virtual environment: `python -m venv venv`
3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Run the Flask server: `python app.py` (or use a production WSGI server)

### Frontend Setup
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`

## Roadmap
- Refine the user experience and UI.
- Enhance semantic search capabilities.
- Add one-click auto-organization.
