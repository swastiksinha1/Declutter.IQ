import hashlib
import os
from PIL import Image
import imagehash

def calculate_sha256(filepath, chunk_size=8192):
    """Calculates the SHA-256 hash of a file."""
    sha256 = hashlib.sha256()
    try:
        with open(filepath, 'rb') as f:
            while chunk := f.read(chunk_size):
                sha256.update(chunk)
        return sha256.hexdigest()
    except Exception as e:
        print(f"Error reading file {filepath}: {e}")
        return None

def find_exact_duplicates(metadata_list):
    """Groups files that are exact byte-for-byte duplicates."""
    size_groups = {}
    for metadata in metadata_list:
        size = metadata['size']
        if size not in size_groups:
            size_groups[size] = []
        size_groups[size].append(metadata)
        
    hash_groups = {}
    for size, files in size_groups.items():
        if len(files) > 1:
            for metadata in files:
                file_hash = calculate_sha256(metadata['path'])
                if file_hash:
                    if file_hash not in hash_groups:
                        hash_groups[file_hash] = []
                    hash_groups[file_hash].append(metadata)
                    
    duplicates = []
    for h, files in hash_groups.items():
        if len(files) > 1:
            redundant_space = sum(f['size'] for f in files[1:])
            duplicates.append({
                "hash": h,
                "files": files,
                "redundant_space": redundant_space
            })
            
    duplicates.sort(key=lambda x: x['redundant_space'], reverse=True)
    return duplicates

def find_near_duplicate_images(metadata_list, threshold=5):
    """Finds visually similar images using perceptual hashing."""
    image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}
    images = [m for m in metadata_list if m['extension'].lower() in image_extensions]
    
    phash_dict = {}
    for img in images:
        try:
            with Image.open(img['path']) as image:
                phash = imagehash.phash(image)
                phash_dict[img['path']] = {"metadata": img, "hash": phash}
        except Exception:
            pass
            
    visited = set()
    near_duplicates = []
    
    paths = list(phash_dict.keys())
    for i in range(len(paths)):
        path1 = paths[i]
        if path1 in visited: continue
            
        group = [phash_dict[path1]["metadata"]]
        visited.add(path1)
        
        for j in range(i + 1, len(paths)):
            path2 = paths[j]
            if path2 in visited: continue
                
            if phash_dict[path1]["hash"] - phash_dict[path2]["hash"] <= threshold:
                group.append(phash_dict[path2]["metadata"])
                visited.add(path2)
                
        if len(group) > 1:
            redundant_space = sum(f['size'] for f in group[1:])
            near_duplicates.append({
                "id": str(phash_dict[path1]["hash"]),
                "files": group,
                "redundant_space": redundant_space
            })
            
    near_duplicates.sort(key=lambda x: x['redundant_space'], reverse=True)
    return near_duplicates
