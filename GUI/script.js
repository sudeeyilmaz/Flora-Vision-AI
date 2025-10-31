// /static/script.js

const fileUpload = document.getElementById('file-upload');
const previewImg = document.getElementById('image-preview');
const analyzeButton = document.getElementById('analyze-button');
const resultsGallery = document.getElementById('results-gallery');
const fileNameDisplay = document.getElementById('file-name-display');
const videoUpload = document.getElementById('video-upload');
const videoNameDisplay = document.getElementById('video-name-display');
const analyzeVideoButton = document.getElementById('analyze-video-button');

let selectedFile = null;
let selectedVideo = null;

// Buton metinlerini saklayın
const imageButtonText = `<i class="fas fa-search"></i> Benzer Çiçekleri Bul`;
const videoButtonText = `<i class="fas fa-search"></i> Videodaki Benzer Çiçekleri Bul`;

// Başlangıçta analiz butonunu hazırla
analyzeButton.innerHTML = imageButtonText;
analyzeVideoButton.innerHTML = videoButtonText;
analyzeButton.disabled = true;
analyzeVideoButton.disabled = true;


// --- Olay Dinleyicileri ---

// 1. Görüntü Seçildiğinde Önizleme
fileUpload.addEventListener('change', (event) => {
    selectedFile = event.target.files[0];
    
    if (selectedFile) {
        // Dosya seçildiğinde video seçili değilse videoyu temizle
        selectedVideo = null;
        videoNameDisplay.textContent = 'Henüz video seçilmedi.';
        analyzeVideoButton.disabled = true;

        previewImg.src = URL.createObjectURL(selectedFile);
        previewImg.style.display = 'block';
        
        fileNameDisplay.textContent = `Seçilen Dosya: ${selectedFile.name}`;
        analyzeButton.disabled = false;
        resultsGallery.innerHTML = '<p class="info-message">Yukarıdaki "Benzer Çiçekleri Bul" butonuna tıklayarak analizi başlatın.</p>';
        analyzeButton.innerHTML = imageButtonText;
    } else {
        // Temizleme mantığı
        previewImg.src = '#';
        previewImg.style.display = 'none';
        fileNameDisplay.textContent = 'Henüz dosya seçilmedi.';
        analyzeButton.disabled = true;
        resultsGallery.innerHTML = '<p class="info-message">Henüz bir analiz yapılmadı. Yukarıdan bir çiçek görseli yükleyin.</p>';
    }
});

// 2. Video Seçildiğinde
videoUpload.addEventListener('change', (event) => {
    selectedVideo = event.target.files[0];

    if (selectedVideo) {
        // Video seçildiğinde resim seçili değilse resmi temizle
        selectedFile = null;
        previewImg.src = '#';
        previewImg.style.display = 'none';
        fileNameDisplay.textContent = 'Henüz dosya seçilmedi.';
        analyzeButton.disabled = true;
        
        videoNameDisplay.textContent = `Seçilen Video: ${selectedVideo.name}`;
        analyzeVideoButton.disabled = false;
        resultsGallery.innerHTML = '<p class="info-message">Videoyu analiz etmek için butona tıklayın.</p>';
        analyzeVideoButton.innerHTML = videoButtonText;
    } else {
        videoNameDisplay.textContent = 'Henüz video seçilmedi.';
        analyzeVideoButton.disabled = true;
    }
});
// /static/script.js dosyasının en altına bu yeni fonksiyonu ekleyin

function findNearbyFlorists() {
    // 1. Kullanıcıdan konum izni isteme
    if (navigator.geolocation) {
        // Arayüzde kullanıcıya bilgi verilebilir
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Konum başarıyla alındı
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                // Google Haritalar'ın koordinat tabanlı arama formatı:
                const mapsUrl = `https://www.google.com/maps/search/çiçekçi/@${lat},${lon},15z`;
                
                // Yeni pencerede aç
                window.open(mapsUrl, '_blank');
                
                // Analiz sonuçlarını geri yükle (veya durumu güncelle)
                // Bu kısım biraz karmaşık olduğu için, basitçe bir bilgilendirme yapalım:
                
            },
            (error) => {
                // Konum izni reddedildi veya hata oluştu
                console.error("Konum alma hatası:", error);
                // Konum alınamazsa, genel bir arama yap
                const generalMapsUrl = "https://www.google.com/maps/search/çiçekçi";
                window.open(generalMapsUrl, '_blank');
                resultsGallery.innerHTML = '<p class="info-message" style="color: orange;"><i class="fas fa-exclamation-triangle"></i> Konum izni verilmediği için genel bir çiçekçi araması yapıldı.</p>';
            }
        );
    } else {
        // Tarayıcı GeoLocation'ı desteklemiyorsa
        const generalMapsUrl = "https://www.google.com/maps/search/çiçekçi";
        window.open(generalMapsUrl, '_blank');
        resultsGallery.innerHTML = '<p class="info-message" style="color: orange;"><i class="fas fa-exclamation-triangle"></i> Tarayıcınız konum servislerini desteklemiyor. Genel arama yapıldı.</p>';
    }
}
// 3. Video Analiz Butonuna Tıklandığında
analyzeVideoButton.addEventListener('click', async () => {
    if (!selectedVideo) return;

    resultsGallery.innerHTML = '<p class="info-message"><i class="fas fa-spinner fa-spin"></i> Video analiz ediliyor...</p>';
    analyzeVideoButton.disabled = true;
    analyzeVideoButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Analiz Ediliyor...`;

    const formData = new FormData();
    // 'media_file' anahtarı main.py'deki 'media_file' parametresiyle eşleşmelidir.
    formData.append('flower_video', selectedVideo);

    try {
        const response = await fetch('/api/find_similarity_video', { // API endpoint'i ortak olmalıdır
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Analiz sunucusu hatası: ${errorData.detail || 'Bilinmeyen Hata'}`);
        }

        const data = await response.json();
        displayResults(data.results);

    } catch (error) {
        console.error("Video analiz hatası:", error);
        resultsGallery.innerHTML = `<p style="color: red;" class="error-message"><i class="fas fa-exclamation-circle"></i> Analiz başarısız oldu: ${error.message}</p>`;
    } finally {
        analyzeVideoButton.disabled = false;
        analyzeVideoButton.innerHTML = videoButtonText;
    }
});

// 4. Görüntü Analiz Butonuna Tıklandığında (422 Hatası Düzeltildi!)
analyzeButton.addEventListener('click', async () => {
    if (!selectedFile) return;

    // Arayüzü güncelle:
    resultsGallery.innerHTML = '<p class="info-message"><i class="fas fa-spinner fa-spin"></i> Lütfen bekleyin, analiz yapılıyor...</p>';
    analyzeButton.disabled = true;
    analyzeButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Analiz Ediliyor...`;

    const formData = new FormData();
    // 1. Görseli ekle
    formData.append('flower_image', selectedFile);
    try {
        const response = await fetch('/api/find_similarity', { 
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json(); 
            throw new Error(`Analiz sunucusu hatası: ${errorData.detail || 'Bilinmeyen Hata'}`);
        }

        const data = await response.json();
        
        displayResults(data.results);

    } catch (error) {
        console.error("Analiz sırasında bir hata oluştu:", error);
        resultsGallery.innerHTML = `<p style="color: red;" class="error-message"><i class="fas fa-exclamation-circle"></i> Analiz başarısız oldu: ${error.message}</p>`;
    } finally {
        analyzeButton.disabled = false;
        analyzeButton.innerHTML = imageButtonText; 
    }
});

// 5. Sonuçları Galeriye Yerleştirme Fonksiyonu
function displayResults(results) {
    resultsGallery.innerHTML = ''; // Temizle
    
    if (results.length === 0) {
        resultsGallery.innerHTML = '<p class="info-message">Benzer çiçek bulunamadı.</p>';
        return;
    }

    results.forEach(item => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        const flowerName = item.flower_class; 

    // main.py'den gelen smart_advice özelliğini yakalamak için
    const smartAdviceHTML = item.smart_advice && item.smart_advice.length > 5 ? 
                            `<div class="smart-advice">
                                <p class="detail-title"><i class="fas fa-exclamation-triangle"></i> Akıllı Uyarı</p>
                                <p class="detail-text" style="color: #dc3545;">${item.smart_advice}</p>
                             </div>` : '';


    const turkeyIcon = item.grows_in_turkey 
                       ? '<i class="fas fa-check-circle grows-icon"></i> Türkiye\'de Yetişir' 
                       : '<i class="fas fa-times-circle no-grows-icon"></i> Yurtdışı Türü';


    resultItem.innerHTML = `
        <img src="${item.image_url}" alt="${item.flower_class}">
        <div class="item-content">
            <p class="flower-title">${item.flower_class}</p>
            <p class="scientific-name">(${item.scientific_name})</p>
            <p class="similarity-score">Benzerlik: %${(item.score * 100).toFixed(2)}</p>
            
            <div class="care-section">
                <p class="turkey-info">${turkeyIcon}</p>
                <p class="detail-title">Sulama: </p>
                <p class="detail-text">${item.watering_info}</p>
                <p class="detail-title">Bakım: </p>
                <p class="detail-text">${item.care_info}</p>
                ${smartAdviceHTML} </div>

            <p class="detail-title" style="margin-top: 15px; text-align: center;">Konum ve Satış</p>
            
            <span onclick="findNearbyFlorists()" 
               class="location-button" style="cursor: pointer;">
               <i class="fas fa-store"></i> Yakın Çiçekçi Ara
            </span>
            <a href="https://www.google.com/search?q=${encodeURIComponent(flowerName + ' çiçek fiyatları ve fidanı')}" 
               target="_blank" class="sale-button">
               <i class="fas fa-shopping-cart"></i> Online Fiyat/Satış Ara
            </a>

            <p class="detail-title" style="margin-top: 10px; text-align: center;">Ek Kaynaklar</p>
            <a href="https://www.google.com/search?q=${encodeURIComponent(flowerName + ' çiçek bakımı')}" 
               target="_blank" class="info-button">
               <i class="fas fa-external-link-alt"></i> Detaylı Bakım Bilgisi
            </a>
        </div>
    `;
    resultsGallery.appendChild(resultItem);
    });
}