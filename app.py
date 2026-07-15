import os
import time
import shutil
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from scanner import scan_directory
from hasher import find_exact_duplicates, find_near_duplicate_images
from send2trash import send2trash

app = Flask(__name__)
CORS(app) # Allow frontend to communicate with backend

@app.route('/api/default-directory', methods=['GET'])
def get_default_directory():
    try:
        downloads_path = os.path.expanduser('~/Downloads')
        downloads_path = os.path.normpath(downloads_path)
        return jsonify({"status": "success", "directory": downloads_path})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/scan', methods=['POST'])
def run_scan():
    data = request.json
    directory = data.get('directory')
    max_files = data.get('max_files', 20000)
    exclusions = data.get('exclusions', None)
    
    if not directory:
        return jsonify({"error": "Directory path is required"}), 400
        
    try:
        # 1. Scan directory
        files_metadata = list(scan_directory(directory, max_files=max_files, exclude_dirs=exclusions))
        
        # 2. Find exact duplicates
        exact_duplicates = find_exact_duplicates(files_metadata)
        
        # 3. Find near duplicate images
        near_duplicates = find_near_duplicate_images(files_metadata)
        
        # 4. Calculate analytics
        total_files = len(files_metadata)
        reclaimable_space_bytes = sum(g['redundant_space'] for g in exact_duplicates) + sum(g['redundant_space'] for g in near_duplicates)

        categories_map = {
            'Images': {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'},
            'Documents': {'.pdf', '.doc', '.docx', '.txt', '.csv', '.xlsx', '.ppt', '.pptx'},
            'Videos': {'.mp4', '.mkv', '.avi', '.mov', '.wmv'},
            'Archives': {'.zip', '.rar', '.7z', '.tar', '.gz'},
            'Audio': {'.mp3', '.wav', '.flac', '.aac', '.ogg'},
            'Code': {'.py', '.js', '.html', '.css', '.json', '.md', '.jsx', '.ts', '.tsx', '.c', '.cpp', '.java'}
        }
        
        category_sizes = {cat: 0 for cat in categories_map.keys()}
        category_sizes['Others'] = 0
        
        for f in files_metadata:
            ext = f.get('extension', '').lower()
            matched = False
            for cat, exts in categories_map.items():
                if ext in exts:
                    category_sizes[cat] += f.get('size', 0)
                    f['category'] = cat
                    matched = True
                    break
            if not matched:
                category_sizes['Others'] += f.get('size', 0)
                f['category'] = 'Others'
                
        file_type_breakdown = [{"name": k, "value": v} for k, v in category_sizes.items() if v > 0]
        file_type_breakdown.sort(key=lambda x: x['value'], reverse=True)
        
        top_large_files = sorted(files_metadata, key=lambda x: x.get('size', 0), reverse=True)[:5]

        return jsonify({
            "status": "success",
            "analytics": {
                "total_files": total_files,
                "duplicate_groups_count": len(exact_duplicates),
                "near_duplicate_groups_count": len(near_duplicates),
                "reclaimable_space_bytes": reclaimable_space_bytes,
                "file_type_breakdown": file_type_breakdown,
                "top_large_files": top_large_files,
                "all_files": files_metadata
            },
            "duplicates": exact_duplicates,
            "near_duplicates": near_duplicates
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/semantic-scan', methods=['POST'])
def run_semantic_scan():
    data = request.json
    directory = data.get('directory')
    if not directory:
        return jsonify({"error": "Directory path is required"}), 400
        
    try:
        from semantic_hasher import find_semantic_duplicates
        files_metadata = list(scan_directory(directory))
        semantic_duplicates = find_semantic_duplicates(files_metadata)
        
        return jsonify({
            "status": "success",
            "semantic_duplicates": semantic_duplicates
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/file', methods=['GET'])
def get_file():
    filepath = request.args.get('path')
    if not filepath or not os.path.exists(filepath):
        return "File not found", 404
    return send_file(filepath)

@app.route('/api/delete', methods=['POST'])
def delete_files():
    data = request.json
    files_to_delete = data.get('files', [])
    
    if not files_to_delete:
        return jsonify({"error": "No files provided"}), 400
        
    deleted_count = 0
    reclaimed_space = 0
    errors = []
    
    for filepath in files_to_delete:
        try:
            if os.path.exists(filepath):
                size = os.path.getsize(filepath)
                send2trash(filepath)
                deleted_count += 1
                reclaimed_space += size
        except Exception as e:
            errors.append({"file": filepath, "error": str(e)})
            
    return jsonify({
        "status": "success",
        "deleted_count": deleted_count,
        "reclaimed_space_bytes": reclaimed_space,
        "errors": errors
    })

@app.route('/api/zombies', methods=['POST'])
def get_zombies():
    data = request.json
    directory = data.get('directory')
    if not directory: return jsonify({"error": "Directory required"}), 400
    
    current_time = time.time()
    ONE_YEAR = 31536000
    HUNDRED_MB = 100 * 1024 * 1024
    
    zombies = []
    try:
        files_metadata = list(scan_directory(directory))
        for f in files_metadata:
            if f['size'] > HUNDRED_MB and (current_time - f.get('access_time', current_time)) > ONE_YEAR:
                zombies.append(f)
                
        zombies.sort(key=lambda x: x['size'], reverse=True)
        return jsonify({"status": "success", "zombies": zombies})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/categorize/preview', methods=['POST'])
def categorize_preview():
    data = request.json
    directory = data.get('directory')
    if not directory: return jsonify({"error": "Directory required"}), 400
    
    plan = []
    categories = {
        'Images': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
        'Documents': ['.pdf', '.doc', '.docx', '.txt', '.csv', '.xlsx'],
        'Videos': ['.mp4', '.mkv', '.avi', '.mov'],
        'Archives': ['.zip', '.rar', '.7z', '.tar', '.gz'],
        'Executables': ['.exe', '.msi', '.apk']
    }
    
    try:
        for f in os.listdir(directory):
            filepath = os.path.join(directory, f)
            if os.path.isfile(filepath):
                ext = os.path.splitext(f)[1].lower()
                target_folder = 'Others'
                for cat, exts in categories.items():
                    if ext in exts:
                        target_folder = cat
                        break
                        
                target_path = os.path.join(directory, target_folder)
                plan.append({
                    "file": f,
                    "source": filepath,
                    "target_dir": target_path,
                    "category": target_folder
                })
        return jsonify({"status": "success", "plan": plan})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/categorize/execute', methods=['POST'])
def categorize_execute():
    data = request.json
    plan = data.get('plan', [])
    
    moved_count = 0
    details = {}
    try:
        for item in plan:
            source = item['source']
            target_dir = item['target_dir']
            category = item['category']
            f = item['file']
            
            if os.path.exists(source):
                if not os.path.exists(target_dir):
                    os.makedirs(target_dir)
                shutil.move(source, os.path.join(target_dir, f))
                
                if category not in details:
                    details[category] = []
                details[category].append(f)
                moved_count += 1
                
        return jsonify({"status": "success", "moved_count": moved_count, "details": details})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/prune/preview', methods=['POST'])
def prune_preview():
    data = request.json
    directory = data.get('directory')
    if not directory: return jsonify({"error": "Directory required"}), 400
    
    plan = []
    try:
        for dirpath, dirnames, filenames in os.walk(directory, topdown=False):
            if dirpath == directory: continue
            if not os.listdir(dirpath):
                plan.append(dirpath)
        return jsonify({"status": "success", "plan": plan})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/prune/execute', methods=['POST'])
def prune_execute():
    data = request.json
    plan = data.get('plan', [])
    pruned_count = 0
    try:
        for dirpath in plan:
            if os.path.exists(dirpath) and not os.listdir(dirpath):
                try:
                    os.rmdir(dirpath)
                    pruned_count += 1
                except OSError:
                    pass
        return jsonify({"status": "success", "pruned_count": pruned_count})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/default-directory', methods=['GET'])
def default_directory():
    try:
        if os.name == 'nt':
            import winreg
            sub_key = r'SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Shell Folders'
            downloads_guid = '{374DE290-123F-4565-9164-39C4925E467B}'
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, sub_key) as key:
                location = winreg.QueryValueEx(key, downloads_guid)[0]
            return jsonify({"directory": location})
        else:
            return jsonify({"directory": os.path.join(os.path.expanduser('~'), 'Downloads')})
    except Exception as e:
        return jsonify({"directory": os.path.join(os.path.expanduser('~'), 'Downloads')})

@app.route('/api/rename', methods=['POST'])
def rename_file():
    data = request.json
    filepath = data.get('path')
    new_name = data.get('new_name')
    if not filepath or not new_name:
        return jsonify({"error": "path and new_name are required"}), 400
        
    try:
        dir_name = os.path.dirname(filepath)
        new_filepath = os.path.join(dir_name, new_name)
        
        if os.path.exists(new_filepath):
            return jsonify({"error": "A file with that name already exists"}), 400
            
        os.rename(filepath, new_filepath)
        return jsonify({"status": "success", "new_path": new_filepath})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
