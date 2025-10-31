import os
import numpy as np
from tqdm import tqdm
import tensorflow as tf
from tensorflow import keras 
from keras.utils import load_img, img_to_array 
from keras.applications.resnet50 import preprocess_input 
from keras.applications import ResNet50
from keras.models import Model

FLOWERS_FOLDER = "flowers_by_class" 
OUTPUT_FILE = "flower_image_embeddings.npy"
TARGET_SIZE = (224, 224) 

def initialize_feature_extractor():
    print("🧠 ResNet50 Özellik Çıkarıcı Model Yükleniyor...")
    try:
        base_model = ResNet50(weights='imagenet', include_top=False) 
        x = base_model.output
        x = keras.layers.GlobalAveragePooling2D()(x) 
        feature_extractor_model = Model(inputs=base_model.input, outputs=x)
        print("✅ Model Başarıyla Yüklendi.")
        return feature_extractor_model
    except Exception as e:
        print(f"❌ Model yüklenirken bir hata oluştu: {e}")
        return None

def extract_features(img_path, model):
    try:
        img = load_img(img_path, target_size=TARGET_SIZE)
        img_array = img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0) 
        img_array = preprocess_input(img_array) 
        features = model.predict(img_array, verbose=0)
        return features.flatten()
        
    except Exception as e:
        print(f"  [HATA] Görüntü işlenemedi: {img_path}. Hata: {e}")
        return None

def process_all_flowers():
    if not os.path.exists(FLOWERS_FOLDER):
        print(f"❌ HATA: '{FLOWERS_FOLDER}' klasörü bulunamadı. Lütfen klasör adını ve konumunu kontrol edin.")
        return

    feature_extractor_model = initialize_feature_extractor()
    if feature_extractor_model is None:
        return

    all_features = []
    
    flower_classes = [d for d in os.listdir(FLOWERS_FOLDER) if os.path.isdir(os.path.join(FLOWERS_FOLDER, d))]
    
    print(f"\n📂 Toplam {len(flower_classes)} çiçek sınıfı bulundu. Vektör çıkarma işlemi başlıyor...")

    for flower_class in tqdm(flower_classes, desc="Sınıflar"):
        class_path = os.path.join(FLOWERS_FOLDER, flower_class)
        for img_file in os.listdir(class_path):
            if img_file.lower().endswith(('.jpg', '.jpeg', '.png')): 
                img_path = os.path.join(class_path, img_file)
                
                vector = extract_features(img_path, feature_extractor_model)
                
                if vector is not None:
                    all_features.append({
                        'flower_class': flower_class,
                        'filename': img_file,
                        'vector': vector
                    })

    if all_features:
        np.save(OUTPUT_FILE, all_features)
        
        print(f"\n🎉 İşlem Tamamlandı!")
        print(f"Toplam {len(all_features)} fotoğrafın vektörü başarıyla çıkarıldı.")
        print(f"Vektörler '{OUTPUT_FILE}' dosyasına kaydedildi.")
        print(f"Örnek Vektör Boyutu: {all_features[0]['vector'].shape}")
    else:
        print("\n⚠️ Hiçbir fotoğraf işlenemedi. Lütfen dosya yollarınızı ve uzantılarınızı kontrol edin.")

if __name__ == "__main__":
    process_all_flowers()