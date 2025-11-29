// /static/script.js

const fileUpload = document.getElementById('file-upload');
const previewImg = document.getElementById('image-preview');
const analyzeButton = document.getElementById('analyze-button');
const resultsGallery = document.getElementById('results-gallery');
const fileNameDisplay = document.getElementById('file-name-display');
const videoUpload = document.getElementById('video-upload');
const videoNameDisplay = document.getElementById('video-name-display');
const analyzeVideoButton = document.getElementById('analyze-video-button');

// --- CHAT DEĞİŞKENLERİ ---
const chatModal = document.getElementById('chat-modal');
const closeChatBtn = document.getElementById('close-chat');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const chatMessages = document.getElementById('chat-messages');
const chatFlowerName = document.getElementById('chat-flower-name');

let currentActiveFlower = ""; // O an konuşulan çiçek

// Buton metinleri
const imageButtonText = `<i class="fas fa-search"></i> Benzer Çiçekleri Bul`;
const videoButtonText = `<i class="fas fa-search"></i> Videodaki Benzer Çiçekleri Bul`;

// Başlangıç Durumu
analyzeButton.innerHTML = imageButtonText;
analyzeVideoButton.innerHTML = videoButtonText;
analyzeButton.disabled = true;
analyzeVideoButton.disabled = true;

// --- GÖRSEL YÜKLEME ---
fileUpload.addEventListener('change', (event) => {
    selectedFile = event.target.files[0];
    if (selectedFile) {
        selectedVideo = null; // Video temizle
        previewImg.src = URL.createObjectURL(selectedFile);
        document.getElementById('image-preview-wrapper').style.display = 'block'; // Görünür yap
        fileNameDisplay.textContent = selectedFile.name;
        analyzeButton.disabled = false;
        resultsGallery.innerHTML = '<div class="empty-state"><i class="fas fa-bolt"></i><p>Analiz için butona basın.</p></div>';
    }
});

// --- VİDEO YÜKLEME ---
videoUpload.addEventListener('change', (event) => {
    selectedVideo = event.target.files[0];
    if (selectedVideo) {
        selectedFile = null; // Resim temizle
        document.getElementById('image-preview-wrapper').style.display = 'none';
        videoNameDisplay.textContent = selectedVideo.name;
        analyzeVideoButton.disabled = false;
        resultsGallery.innerHTML = '<div class="empty-state"><i class="fas fa-bolt"></i><p>Video analizi için butona basın.</p></div>';
    }
});

// --- ANALİZ FONKSİYONLARI ---
analyzeButton.addEventListener('click', async () => {
    performAnalysis('/api/find_similarity', 'flower_image', selectedFile, analyzeButton, imageButtonText);
});

analyzeVideoButton.addEventListener('click', async () => {
    performAnalysis('/api/find_similarity_video', 'flower_video', selectedVideo, analyzeVideoButton, videoButtonText);
});

// Ortak Analiz Fonksiyonu
async function performAnalysis(endpoint, formKey, file, button, defaultText) {
    if (!file) return;

    button.disabled = true;
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Analiz Ediliyor...`;
    resultsGallery.innerHTML = '<div class="empty-state"><i class="fas fa-dna fa-spin"></i><p>Yapay Zeka İnceliyor...</p></div>';

    const formData = new FormData();
    formData.append(formKey, file);

    try {
        const response = await fetch(endpoint, { method: 'POST', body: formData });
        if (!response.ok) throw new Error('Sunucu Hatası');
        const data = await response.json();
        displayResults(data.results);
    } catch (error) {
        console.error(error);
        resultsGallery.innerHTML = `<p style="color:red; text-align:center;">Hata: ${error.message}</p>`;
    } finally {
        button.disabled = false;
        button.innerHTML = defaultText;
    }
}

// --- SONUÇLARI GÖSTERME (Chat Butonu Eklendi) ---
function displayResults(results) {
    resultsGallery.innerHTML = ''; 
    
    if (results.length === 0) {
        resultsGallery.innerHTML = `<div class="empty-state"><p>Benzer çiçek bulunamadı.</p></div>`;
        return;
    }

    results.forEach((item, index) => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        resultItem.style.animation = `fadeIn 0.5s ease-out forwards ${index * 0.1}s`;
        resultItem.style.opacity = '0';

        const similarity = (item.score * 100).toFixed(1);
        const flowerName = item.flower_class;

        resultItem.innerHTML = `
            <div class="similarity-badge">%${similarity}</div>
            <img src="${item.image_url}" alt="${flowerName}">
            <div class="item-content">
                <h4 class="flower-title">${flowerName}</h4>
                <p class="scientific-name">${item.scientific_name}</p>
                
                <div class="action-buttons">
                    <button class="action-btn btn-chat" onclick="openChat('${flowerName}')">
                        <i class="fas fa-robot"></i> Asistana Sor
                    </button>
                    
                    <a href="https://www.google.com/search?q=${flowerName} fiyat" target="_blank" class="action-btn btn-buy">
                        <i class="fas fa-shopping-cart"></i> Satın Al
                    </a>
                </div>
            </div>
        `;
        resultsGallery.appendChild(resultItem);
    });
}

// --- CHAT MANTIĞI ---

// Chat'i Aç
window.openChat = function(flowerName) {
    currentActiveFlower = flowerName;
    chatFlowerName.textContent = flowerName + " Hakkında";
    chatModal.classList.remove('hidden');
    
    // Geçmişi temizle (İsterseniz tutabilirsiniz)
    chatMessages.innerHTML = `
        <div class="message bot">
            Merhaba! Ben Flora AI. <strong>${flowerName}</strong> hakkında merak ettiğin her şeyi sorabilirsin.
            <br><br>Örn: "Nasıl sulamalıyım?", "Gölgeyi sever mi?"
        </div>
    `;
};

// Chat'i Kapat
closeChatBtn.addEventListener('click', () => {
    chatModal.classList.add('hidden');
});

// Mesaj Gönderme
async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Kullanıcı mesajını ekle
    appendMessage(text, 'user');
    chatInput.value = '';
    
    // Bot "yazıyor..." efekti
    const loadingId = appendMessage('<i class="fas fa-ellipsis-h fa-fade"></i>', 'bot');

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                flower_name: currentActiveFlower,
                message: text
            })
        });

        const data = await response.json();
        
        // Loading mesajını sil
        document.getElementById(loadingId).remove();
        
        // Gemma'nın cevabını ekle (Markdown varsa render et)
        // marked.parse() kütüphanesi ekli ise kullanılır, yoksa düz text
        const botReply = window.marked ? marked.parse(data.reply) : data.reply;
        appendMessage(botReply, 'bot');

    } catch (error) {
        document.getElementById(loadingId).remove();
        appendMessage("Bağlantı hatası oluştu.", 'bot');
    }
}

function appendMessage(html, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}`;
    msgDiv.innerHTML = html;
    
    // Geçici ID ver (Loading silmek için)
    const id = 'msg-' + Date.now();
    msgDiv.id = id;
    
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight; // En alta kaydır
    return id;
}

// Buton ve Enter tuşu dinleyicileri
sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});