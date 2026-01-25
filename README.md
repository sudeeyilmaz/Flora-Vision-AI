# 🌸 Flora Vision AI

![Python](https://img.shields.io/badge/Python-3.x-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688)
![ResNet50](https://img.shields.io/badge/CV-ResNet50-orange)
![Gemma](https://img.shields.io/badge/LLM-Gemma%203-blueviolet)
![Oxford102](https://img.shields.io/badge/Dataset-Oxford%20Flowers-green)

**Flora Vision AI** is a smart botanical assistant that bridges the gap between **Computer Vision** and **Large Language Models (LLMs)**.

This full-stack web application allows users to upload a flower image to find visually similar species using **ResNet50** embeddings and have an interactive conversation about the flower using the **Gemma 3** chatbot model.

## 🚀 Key Features

* **🔍 Visual Similarity Search:** Uses a pre-trained **ResNet50** model to extract feature vectors from images and finds the most similar flowers from the **Oxford 102 Flower Dataset**.
* **💬 AI Botanist Chatbot:** Integrated with **Google's Gemma 3** model to answer questions, provide care tips, and explain details about the detected flowers.
* **📂 Oxford Dataset Integration:** Built upon the comprehensive Oxford 102 Category Flower Dataset.
* **⚡ Modern Web Stack:**
    * **Backend:** FastAPI for high-performance API endpoints.
    * **Frontend:** A responsive UI built with HTML5, CSS3, and JavaScript.

## 📂 Project Structure

```text
├── main.py                 # FastAPI application entry point
├── embedding.py            # Feature extraction using ResNet50
├── flower_details.json     # Metadata and descriptions for flowers
├── GUI/                    # Frontend source code (HTML/JS/CSS)
├── requirements.txt        # Python dependencies
└── ...                     # Dataset helper scripts (csv_make.py, group.py)
```
<img width="1344" height="643" alt="Screenshot From 2026-01-25 17-43-57" src="https://github.com/user-attachments/assets/f4f57edb-e121-40d6-a9a9-dcba281f8771" />
<img width="1344" height="643" alt="Screenshot From 2026-01-25 17-44-50" src="https://github.com/user-attachments/assets/b1f5bf05-89e4-4b8f-9f7b-ac6409775680" />
<img width="853" height="615" alt="Screenshot From 2026-01-25 17-46-24" src="https://github.com/user-attachments/assets/164ad785-c8d7-47fa-9aa8-495ad4a21359" />

## ⚙️ Installation & Usage
**1.** Clone the repository
git clone [https://github.com/sudeeyilmaz/Flora-Vision-AI.git](https://github.com/sudeeyilmaz/Flora-Vision-AI.git)
cd Flora-Vision-AI

**2.** Install Dependencies
pip install -r requirements.txt
**3.** Prepare the Dataset
Ensure the Oxford Flower Dataset images and labels (imagelabels.mat) are placed in the correct directory. You may need to run the embedding generator first:
python embedding.py

**4.** Run the Application
Start the FastAPI server:
uvicorn main:app --reload

**5.** Access the Web UI
Open your browser and navigate to: http://127.0.0.1:8000

## 🛠️ Tech Stack
AI & ML: PyTorch (ResNet50), Gemma 3 (LLM)

**Backend:** FastAPI, Uvicorn

**Frontend:** HTML, JavaScript, CSS

**Data Processing:** NumPy, Pandas, SciPy (for .mat files)
