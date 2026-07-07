import os
import torch
from PIL import Image

# Global variables for lazy-loading models
_clip_model = None
_text_model = None

def get_clip_model():
    global _clip_model
    if _clip_model is None:
        from sentence_transformers import SentenceTransformer
        print("Loading CLIP model...")
        _clip_model = SentenceTransformer('clip-ViT-B-32')
    return _clip_model

def get_text_model():
    global _text_model
    if _text_model is None:
        from sentence_transformers import SentenceTransformer
        print("Loading Text model...")
        _text_model = SentenceTransformer('all-MiniLM-L6-v2')
    return _text_model

def extract_text(filepath):
    ext = os.path.splitext(filepath)[1].lower()
    text = ""
    try:
        if ext == '.txt':
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()
        elif ext == '.pdf':
            import PyPDF2
            with open(filepath, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                text = " ".join([page.extract_text() or "" for page in reader.pages])
        elif ext in {'.docx', '.doc'}:
            import docx
            doc = docx.Document(filepath)
            text = " ".join([p.text for p in doc.paragraphs])
    except Exception as e:
        print(f"Error extracting text from {filepath}: {e}")
    return text[:2000] # truncate to save memory/processing while keeping semantic core

def find_semantic_duplicates(metadata_list, threshold=0.95):
    """Finds conceptually similar images and documents using embeddings."""
    from sentence_transformers import util
    
    image_exts = {'.jpg', '.jpeg', '.png', '.webp', '.bmp'}
    text_exts = {'.txt', '.pdf', '.docx', '.doc'}
    
    # Cap files to prevent CPU overload/long wait times during demo
    images = [m for m in metadata_list if m['extension'].lower() in image_exts][:50]
    docs = [m for m in metadata_list if m['extension'].lower() in text_exts][:50]
    
    semantic_groups = []
    
    # 1. Image Semantic Grouping
    if images:
        model = get_clip_model()
        try:
            pil_images = []
            valid_images = []
            for img in images:
                try:
                    # Open and aggressively downscale to CLIP's native size to save memory/decode time
                    pil_img = Image.open(img['path'])
                    if pil_img.mode != 'RGB':
                        pil_img = pil_img.convert('RGB')
                    pil_img.thumbnail((224, 224))
                    pil_images.append(pil_img)
                    valid_images.append(img)
                except Exception:
                    pass
            
            if pil_images:
                embeddings = model.encode(pil_images, batch_size=8, convert_to_tensor=True, show_progress_bar=False)
                cosine_scores = util.cos_sim(embeddings, embeddings)
                
                visited = set()
                for i in range(len(valid_images)):
                    if i in visited: continue
                    
                    group = [valid_images[i]]
                    visited.add(i)
                    
                    for j in range(i + 1, len(valid_images)):
                        if j in visited: continue
                        if cosine_scores[i][j].item() >= threshold:
                            group.append(valid_images[j])
                            visited.add(j)
                            
                    if len(group) > 1:
                        semantic_groups.append({
                            "type": "image",
                            "description": "Conceptually similar images",
                            "files": group,
                            "redundant_space": sum(f['size'] for f in group[1:])
                        })
        except Exception as e:
            print(f"Image semantic error: {e}")
            
    # 2. Text Semantic Grouping
    if docs:
        model = get_text_model()
        doc_texts = []
        valid_docs = []
        for doc in docs:
            txt = extract_text(doc['path'])
            if len(txt.strip()) > 20:
                doc_texts.append(txt)
                valid_docs.append(doc)
                
        if doc_texts:
            try:
                embeddings = model.encode(doc_texts, batch_size=16, convert_to_tensor=True, show_progress_bar=False)
                cosine_scores = util.cos_sim(embeddings, embeddings)
                
                visited = set()
                for i in range(len(valid_docs)):
                    if i in visited: continue
                    
                    group = [valid_docs[i]]
                    visited.add(i)
                    
                    for j in range(i + 1, len(valid_docs)):
                        if j in visited: continue
                        if cosine_scores[i][j].item() >= threshold:
                            group.append(valid_docs[j])
                            visited.add(j)
                            
                    if len(group) > 1:
                        semantic_groups.append({
                            "type": "document",
                            "description": "Similar text content",
                            "files": group,
                            "redundant_space": sum(f['size'] for f in group[1:])
                        })
            except Exception as e:
                print(f"Text semantic error: {e}")
                
    return semantic_groups
