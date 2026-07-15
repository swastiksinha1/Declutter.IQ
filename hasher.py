import hashlib
import os
from PIL import Image
import imagehash
import concurrent.futures

def calculate_sha256(filepath, chunk_size=65536):
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

def calculate_partial_hash(filepath, chunk_size=4096):
    """Calculates the SHA-256 hash of the first few KB of a file."""
    sha256 = hashlib.sha256()
    try:
        with open(filepath, 'rb') as f:
            chunk = f.read(chunk_size)
            if chunk:
                sha256.update(chunk)
        return sha256.hexdigest()
    except Exception as e:
        print(f"Error reading partial file {filepath}: {e}")
        return None

def _get_partial_hash(metadata):
    ph = calculate_partial_hash(metadata['path'])
    return metadata, ph

def _get_full_hash(metadata):
    fh = calculate_sha256(metadata['path'])
    return metadata, fh

def find_exact_duplicates(metadata_list):
    """Groups files that are exact byte-for-byte duplicates."""
    size_groups = {}
    for metadata in metadata_list:
        size = metadata['size']
        if size not in size_groups:
            size_groups[size] = []
        size_groups[size].append(metadata)
        
    candidates = []
    for size, files in size_groups.items():
        if len(files) > 1:
            candidates.extend(files)

    partial_groups = {}
    if candidates:
        with concurrent.futures.ThreadPoolExecutor() as executor:
            for metadata, ph in executor.map(_get_partial_hash, candidates):
                if ph:
                    if ph not in partial_groups:
                        partial_groups[ph] = []
                    partial_groups[ph].append(metadata)

    full_candidates = []
    for ph, files in partial_groups.items():
        if len(files) > 1:
            full_candidates.extend(files)

    hash_groups = {}
    if full_candidates:
        with concurrent.futures.ThreadPoolExecutor() as executor:
            for metadata, fh in executor.map(_get_full_hash, full_candidates):
                if fh:
                    if fh not in hash_groups:
                        hash_groups[fh] = []
                    hash_groups[fh].append(metadata)
                    
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

def _compute_phash(img_metadata):
    try:
        with Image.open(img_metadata['path']) as image:
            phash = imagehash.phash(image)
            return img_metadata['path'], {"metadata": img_metadata, "hash": phash}
    except Exception:
        return img_metadata['path'], None

def find_near_duplicate_images(metadata_list, threshold=5):
    """Finds visually similar images using perceptual hashing."""
    image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}
    images = [m for m in metadata_list if m['extension'].lower() in image_extensions]
    
    phash_dict = {}
    if images:
        with concurrent.futures.ThreadPoolExecutor() as executor:
            for path, res in executor.map(_compute_phash, images):
                if res:
                    phash_dict[path] = res
            
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
