import os
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from scanner import scan_directory
from hasher import find_exact_duplicates, find_near_duplicate_images
from send2trash import send2trash

app = Flask(__name__)
CORS(app) # Allow frontend to communicate with backend

@app.route('/api/scan', methods=['POST'])
def run_scan():
    data = request.json
    directory = data.get('directory')
    
    if not directory:
        return jsonify({"error": "Directory path is required"}), 400
        
    try:
        # 1. Scan directory
        files_metadata = list(scan_directory(directory))
        
        # 2. Find exact duplicates
        exact_duplicates = find_exact_duplicates(files_metadata)
        
        # 3. Find near duplicate images
        near_duplicates = find_near_duplicate_images(files_metadata)
        
        # 4. Calculate analytics
        total_files = len(files_metadata)
        reclaimable_space_bytes = sum(g['redundant_space'] for g in exact_duplicates) + sum(g['redundant_space'] for g in near_duplicates)

        return jsonify({
            "status": "success",
            "analytics": {
                "total_files": total_files,
                "duplicate_groups_count": len(exact_duplicates),
                "near_duplicate_groups_count": len(near_duplicates),
                "reclaimable_space_bytes": reclaimable_space_bytes
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

if __name__ == '__main__':
    app.run(debug=True, port=5000)
