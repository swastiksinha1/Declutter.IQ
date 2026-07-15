import os

def get_file_metadata(filepath):
    try:
        stat = os.stat(filepath)
        return {
            "path": filepath,
            "filename": os.path.basename(filepath),
            "size": stat.st_size,
            "modified_time": stat.st_mtime,
            "access_time": getattr(stat, 'st_atime', stat.st_mtime),
            "extension": os.path.splitext(filepath)[1].lower()
        }
    except Exception:
        return None

DEFAULT_EXCLUDE_DIRS = {'.git', 'node_modules', 'venv', '.venv', 'AppData', 'Windows', 'Program Files', 'Program Files (x86)'}

def scan_directory(directory_path, max_files=20000, exclude_dirs=None):
    """Recursively walks a directory and yields file metadata."""
    if not os.path.exists(directory_path) or not os.path.isdir(directory_path):
        raise ValueError(f"Invalid directory: {directory_path}")
        
    if exclude_dirs is None:
        exclude_dirs = DEFAULT_EXCLUDE_DIRS
    else:
        exclude_dirs = set(exclude_dirs)
        
    file_count = 0
    for root, dirs, files in os.walk(directory_path):
        # Exclude specified directories
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        
        for file in files:
            if file_count >= max_files:
                return # Stop to prevent infinite hang
            
            filepath = os.path.join(root, file)
            metadata = get_file_metadata(filepath)
            if metadata:
                yield metadata
                file_count += 1
