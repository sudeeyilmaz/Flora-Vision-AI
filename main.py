import os
import numpy as np
import io
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles 
from scipy.spatial.distance import cosine
import tensorflow as tf
from tensorflow import keras
from keras.utils import load_img, img_to_array 
from keras.applications.resnet50 import preprocess_input 
from keras.applications import ResNet50
from keras.models import Model
from fastapi.middleware.cors import CORSMiddleware
import json
import cv2
import tempfile
from pydantic import BaseModel

class QueryModel(BaseModel):
    query: str

FLOWERS_FOLDER = "flowers_by_class" 
TARGET_SIZE = (224, 224) 
TOP_K_RESULTS = 8 
OUTPUT_FILE = "flower_image_embeddings.npy"
STATIC_DIR = "GUI"
DETAILS_FILE = "flower_details.json"
def load_translations(file_path: str) -> dict:
    translations = {}
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                if "=" in line:
                    eng, tr = line.strip().split("=", 1)
                    translations[eng.strip()] = tr.strip()
        print(f"✅ {len(translations)} adet çeviri yüklendi.")
    except FileNotFoundError:
        print(f"❌ UYARI: '{file_path}' dosyası bulunamadı. Çeviriler eksik olabilir.")
    return translations

TRANSLATION_FILE = "flower_name_translations.txt"
FLOWER_NAME_TRANSLATIONS = load_translations(TRANSLATION_FILE)

app = FastAPI(title="Çiçek Benzerlik API'si", version="1.0")

origins = ["http://localhost:8080", "http://127.0.0.1:5000", "*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

try:
    print(f"[{DETAILS_FILE}] yükleniyor...")
    with open(DETAILS_FILE, 'r', encoding='utf-8') as f:
        raw_details = json.load(f)
        FLOWER_DETAILS = {k.replace(' ', '_'): v for k, v in raw_details.items()}
    print(f"✅ {len(FLOWER_DETAILS)} adet çiçek detayı yüklendi.")
except FileNotFoundError:
    print(f"❌ UYARI: Detay dosyası '{DETAILS_FILE}' bulunamadı. Bakım bilgileri sunulamayacak.")

try:
    print(f"[{OUTPUT_FILE}] dosyası yükleniyor...")
    LOADED_FEATURES = np.load(OUTPUT_FILE, allow_pickle=True)
    ALL_VECTORS = np.array([item['vector'] for item in LOADED_FEATURES])
    print(f"✅ {len(ALL_VECTORS)} adet vektör başarılı bir şekilde belleğe yüklendi.")
except FileNotFoundError:
    print(f"❌ HATA: Vektör dosyası '{OUTPUT_FILE}' bulunamadı. Lütfen vektör çıkarma işlemini kontrol edin.")
    exit()
# main.py dosyasının içine, diğer fonksiyonların altına

def get_flower_details_by_name(flower_name_tr: str):
    """Çevrilmiş isimden (Türkçe) çiçek detaylarını bulur."""
    
    # 1. Türkçeden İngilizce (orijinal) isme geri çevir
    original_name = None
    for eng, tr in FLOWER_NAME_TRANSLATIONS.items():
        if tr.lower() == flower_name_tr.lower():
            original_name = eng
            break
            
    if not original_name:
        # Belki direkt olarak flower_details.json'da Türkçe isim vardır
        original_name = flower_name_tr
        
    flower_key = original_name.replace(' ', '_')
    details = FLOWER_DETAILS.get(flower_key, None)
    
    return details, FLOWER_NAME_TRANSLATIONS.get(original_name, original_name)

def simple_nlu(query: str) -> str:
    query = query.lower().strip()
    
    if "teşekkürler" in query or "sağ ol" in query:
        return "Rica ederim, size yardımcı olabildiğime sevindim."

    if "merhaba" in query or "selam" in query:
        return "Merhaba! Ben Çiçek Benzerlik Asistanınız. Bir çiçeğin bakımı veya benzerliği hakkında size nasıl yardımcı olabilirim?"

    for flower_name_tr in FLOWER_NAME_TRANSLATIONS.values():
        name_lower = flower_name_tr.lower()
        if name_lower in query:
            details, tr_name = get_flower_details_by_name(flower_name_tr)
            
            if "bakım" in query:
                care_info = details.get('care', f"{tr_name} için detaylı bakım bilgisi bulunamadı.")
                return f"{tr_name} bakımı hakkında: {care_info}"
            
            if "sulama" in query or "su" in query:
                watering_info = details.get('watering', f"{tr_name} için sulama bilgisi bulunamadı.")
                return f"{tr_name} için sulama bilgisi: {watering_info}"
            
            if "türkiye" in query or "yetişir" in query:
                grows = "Evet, Türkiye'de yetişir." if details.get('grows_in_turkey') else "Hayır, yurtdışı türüdür."
                return f"{tr_name} türü için: {grows}"

    return "Üzgünüm, şu anda sadece yüklediğiniz çiçekler hakkındaki basit bakım ve sulama sorularına yanıt verebiliyorum."

@app.post("/api/voice_assistant",summary="Sesli asistan ile çiçek bakımı hakkında sohbet eder.")
async def voice_assistant_query(q:QueryModel):
    response_text = simple_nlu(q.query)
    return JSONResponse(content={"response": response_text})


def extract_frames_from_video(video_bytes, frame_rate=1):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    cap = cv2.VideoCapture(tmp_path)
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    interval = max(int(fps / frame_rate), 1)
    frames = []
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % interval == 0:
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frames.append(frame_rgb)
        frame_idx += 1

    cap.release()
    os.remove(tmp_path)
    return frames
# main.py dosyasındaki extract_video_features fonksiyonu

def extract_video_features(frames, model):
    vectors = []
    for frame in frames:
        img = tf.image.resize(frame, TARGET_SIZE)
        img_array = np.expand_dims(img, axis=0)
        
        # 👇 KRİTİK DÜZELTME: Dizinin kopyasını oluştur (Salt okunur hatasını çözer)
        img_array = np.copy(img_array) 
        
        # Bu satır şimdi kopyalanmış dizi üzerinde çalışacak
        img_array = preprocess_input(img_array) 
        
        feat = model.predict(img_array, verbose=0).flatten()
        vectors.append(feat)
    if len(vectors) == 0:
        return None
    return np.mean(vectors, axis=0)  # ortalama embedding
def initialize_feature_extractor():
    try:
        base_model = ResNet50(weights='imagenet', include_top=False) 
        x = base_model.output
        x = keras.layers.GlobalAveragePooling2D()(x) 
        return Model(inputs=base_model.input, outputs=x)
    except Exception as e:
        print(f"❌ Model yüklenemedi: {e}. Lütfen internet bağlantınızı veya Keras ayarlarınızı kontrol edin.")
        return None

FEATURE_EXTRACTOR_MODEL = initialize_feature_extractor()
if FEATURE_EXTRACTOR_MODEL is None:
    exit()
def extract_new_image_features(image_bytes: bytes, model: Model):
    try:
        img = load_img(io.BytesIO(image_bytes), target_size=TARGET_SIZE)
        img_array = img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0) 
        img_array = preprocess_input(img_array) 
        
        features = model.predict(img_array, verbose=0)
        return features.flatten()
        
    except Exception as e:
        print(f"[HATA] Yeni görüntüden özellik çıkarılamadı: {e}")
        return None

@app.post("/api/find_similarity", 
          summary="Yüklenen görsele en benzer çiçekleri bulur.")
async def find_similarity(flower_image: UploadFile = File(..., description="Benzerliğini aramak istediğiniz çiçek görseli.")):

    if not flower_image.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Lütfen geçerli bir görüntü dosyası yükleyin (image/*).")

    image_bytes = await flower_image.read()
    new_vector = extract_new_image_features(image_bytes, FEATURE_EXTRACTOR_MODEL)

    if new_vector is None:
        raise HTTPException(status_code=500, detail="Yeni görüntüden özellik çıkarma hatası oluştu.")

    similarity_scores = []
    for i, stored_vector in enumerate(ALL_VECTORS):
        similarity = 1 - cosine(new_vector, stored_vector)
        item = LOADED_FEATURES[i]
        similarity_scores.append({
            'flower_class': item['flower_class'],
            'filename': item['filename'],
            'score': similarity
        })
        
    similarity_scores.sort(key=lambda x: x['score'], reverse=True)
    
    top_k_results = similarity_scores[1:TOP_K_RESULTS + 1] 
    
    final_results = []
    for result in top_k_results:
        flower_key = result['flower_class'].replace(' ', '_')
        details = FLOWER_DETAILS.get(flower_key, {})
        image_url = f"/images/{result['flower_class']}/{result['filename']}"
        final_results.append({
            'flower_class': FLOWER_NAME_TRANSLATIONS.get(result['flower_class'], result['flower_class']),
            'filename': result['filename'],
            'score': float(result['score']),
            'image_url': image_url,
            'watering_info': details.get('watering', 'Bakım bilgisi mevcut değil.'),
            'care_info': details.get('care', 'Bakım bilgisi mevcut değil.'),
            'scientific_name': details.get('scientific_name', 'Bilinmiyor'),
            'grows_in_turkey': details.get('grows_in_turkey', False)
        })

    return JSONResponse(content={"results": final_results})
@app.post("/api/find_similarity_video", summary="Yüklenen videoya göre benzer çiçekleri bulur.")
async def find_similarity_video(flower_video: UploadFile = File(..., description="Çiçek içeren video dosyası (.mp4)")):
    if not flower_video.content_type.startswith('video/'):
        raise HTTPException(status_code=400, detail="Lütfen geçerli bir video dosyası yükleyin (video/*).")

    video_bytes = await flower_video.read()
    frames = extract_frames_from_video(video_bytes, frame_rate=1)  # saniyede 1 kare
    if len(frames) == 0:
        raise HTTPException(status_code=500, detail="Videodan kare çıkarılamadı.")

    new_vector = extract_video_features(frames, FEATURE_EXTRACTOR_MODEL)
    if new_vector is None:
        raise HTTPException(status_code=500, detail="Video özellikleri çıkarılamadı.")

    # Aynı benzerlik karşılaştırma mantığımodels
    similarity_scores = []
    for i, stored_vector in enumerate(ALL_VECTORS):
        similarity = 1 - cosine(new_vector, stored_vector)
        item = LOADED_FEATURES[i]
        similarity_scores.append({
            'flower_class': item['flower_class'],
            'filename': item['filename'],
            'score': similarity
        })

    similarity_scores.sort(key=lambda x: x['score'], reverse=True)
    top_k_results = similarity_scores[1:TOP_K_RESULTS + 1] 

    final_results = []
    for result in top_k_results:
        flower_key = result['flower_class'].replace(' ', '_')
        details = FLOWER_DETAILS.get(flower_key, {})
        image_url = f"/images/{result['flower_class']}/{result['filename']}"
        final_results.append({
            'flower_class': FLOWER_NAME_TRANSLATIONS.get(result['flower_class'], result['flower_class']),
            'filename': result['filename'],
            'score': float(result['score']),
            'image_url': image_url,
            'watering_info': details.get('watering', 'Bakım bilgisi mevcut değil.'),
            'care_info': details.get('care', 'Bakım bilgisi mevcut değil.'),
            'scientific_name': details.get('scientific_name', 'Bilinmiyor'),
            'grows_in_turkey': details.get('grows_in_turkey', False)
        })

    return JSONResponse(content={"results": final_results})

@app.get("/", include_in_schema=False)
async def serve_index():
    index_file_path = os.path.join(STATIC_DIR, "index.html")
    if not os.path.exists(index_file_path):
        raise HTTPException(status_code=500, detail="index.html 'GUI' klasöründe bulunamadı.")
        
    return FileResponse(index_file_path)
@app.get("/images/{flower_class}/{filename}",
         summary="Benzer çiçek görsellerini sunar.")
async def serve_images(flower_class: str, filename: str):
    file_path = os.path.join(FLOWERS_FOLDER, flower_class, filename)
    print(f"DEBUG: Aranıyor -> {file_path}") 
    
    if not os.path.exists(file_path):
        print(f"HATA: Dosya bulunamadı -> {file_path}") 
        raise HTTPException(status_code=404, detail=f"Görüntü bulunamadı: {file_path}")
    
    return FileResponse(file_path)
if __name__ == "__main__":
    import uvicorn
    if FEATURE_EXTRACTOR_MODEL is not None:
        uvicorn.run(app, host="0.0.0.0", port=8000)