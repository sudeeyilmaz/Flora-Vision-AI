import os
import shutil
from scipy.io import loadmat
import pandas as pd

jpg_folder = "jpg"               
output_folder = "flowers_by_class"  
os.makedirs(output_folder, exist_ok=True)
labels = loadmat("imagelabels.mat")["labels"][0].astype(int)

df = pd.read_csv("label_names.csv")  
for i, label_id in enumerate(labels, start=1):
    img_name = f"image_{i:05d}.jpg"
    src_path = os.path.join(jpg_folder, img_name)
    if not os.path.exists(src_path):
        print(f"⚠️ Eksik dosya: {img_name}")
        continue
    flower_name = df.loc[df["label_id"] == label_id, "flower_name"].item()
    target_dir = os.path.join(output_folder, flower_name)
    os.makedirs(target_dir, exist_ok=True)
    dst_path = os.path.join(target_dir, img_name)
    shutil.copy2(src_path, dst_path)  

print("✅ Tüm fotoğraflar türlerine göre klasörlendi!")
