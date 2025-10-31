# grad_cam_visualize.py

import numpy as np
import tensorflow as tf
from tensorflow import keras
import cv2
import matplotlib.pyplot as plt
from keras.utils import load_img, img_to_array
import io

# --- Yapılandırma ---
TARGET_SIZE = (224, 224) 
IMAGE_PATH = "compare/gul.jpg"  # Örnek görselinizin yolu
CLASS_INDEX = 0 # Karşılaştırma yapmak istediğiniz tahmin edilen sınıfın indeksi (örneğin 0)
LAST_CONV_LAYER_NAME = "conv5_block3_out" # ResNet50 için son Evrişim Katmanı

def make_gradcam_heatmap(img_array, model, last_conv_layer_name, pred_index=None):
    # 1. Modelin iki çıkışa sahip yeni bir versiyonunu oluştur:
    #    a) Son Evrişim Katmanının çıktısı
    #    b) Nihai tahmin çıktısı (softmax'ten hemen önce)
    grad_model = keras.models.Model(
        model.inputs, [model.get_layer(last_conv_layer_name).output, model.output]
    )

    # 2. İşlemleri GradientTape altında takip et (türev almak için)
    with tf.GradientTape() as tape:
        last_conv_layer_output, preds = grad_model(img_array)
        
        # Eğer sınıf indeksi verilmediyse, en yüksek tahmini kullan
        if pred_index is None:
            pred_index = tf.argmax(preds[0])
            
        # İstenen tahmin sınıfının skorunu al
        class_channel = preds[:, pred_index]

    # 3. Hesaplamalar
    # Son evrişim katmanı çıkışının, istenen sınıfın skoruna göre türevini al
    grads = tape.gradient(class_channel, last_conv_layer_output)

    # Her bir çıktı kanalı için yoğunluk ortalamasını al (Global Average Pooling)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))

    # 4. Isı Haritasını Oluştur
    last_conv_layer_output = last_conv_layer_output[0]
    heatmap = last_conv_layer_output @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)

    # Isı haritasını 0-1 aralığına normalize et
    heatmap = tf.maximum(heatmap, 0) / tf.reduce_max(heatmap)
    return heatmap.numpy()

def display_gradcam(img_path, heatmap, alpha=0.4):
    # Orijinal görüntüyü OpenCV ile yükle
    img = cv2.imread(img_path)
    img = cv2.resize(img, TARGET_SIZE)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB) # RGB'ye çevir

    # Isı haritasını görüntünün boyutuna yükselt (resize)
    heatmap = np.uint8(255 * heatmap)
    heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
    heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
    heatmap = cv2.resize(heatmap, (img.shape[1], img.shape[0]))

    # Orijinal görüntü ile ısı haritasını birleştir (alpha blending)
    superimposed_img = heatmap * alpha + img * (1 - alpha)
    superimposed_img = np.clip(superimposed_img, 0, 255).astype("uint8")

    # Görselleştir
    fig, ax = plt.subplots(1, 2, figsize=(10, 5))
    ax[0].imshow(img)
    ax[0].set_title('Orijinal Görüntü')
    ax[0].axis('off')
    
    ax[1].imshow(superimposed_img)
    ax[1].set_title('Grad-CAM Isı Haritası (Modelin Odağı)')
    ax[1].axis('off')

    plt.savefig("grad_cam_output.png")

# --- Çalıştırma Kısmı ---
if __name__ == "__main__":
    # 1. Özellik Çıkarıcı Modeli Yükle (main.py'den)
    # Burada tüm modeli yüklemeniz gerekir (include_top=True)
    try:
        model = keras.applications.ResNet50(weights="imagenet") 
    except Exception as e:
        print(f"❌ HATA: Model yüklenemedi. Lütfen internet bağlantınızı kontrol edin: {e}")
        exit()
    
    # 2. Görüntüyü Hazırla
    img = load_img(IMAGE_PATH, target_size=TARGET_SIZE)
    img_array = img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    # ResNet için özel önişleme
    img_array = keras.applications.resnet.preprocess_input(img_array) 
    
    # 3. Grad-CAM'i Oluştur
    # Not: Eğer kendi çiçek sınıflandırıcınızı kullanıyorsanız, pred_index = tahmin edilen çiçek sınıfınızın indeksi olmalı.
    heatmap = make_gradcam_heatmap(img_array, model, LAST_CONV_LAYER_NAME)
    
    # 4. Görselleştir
    display_gradcam(IMAGE_PATH, heatmap)