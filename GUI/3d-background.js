// /static/3d-background.js

const initThreeJS = () => {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    // --- SAHNE KURULUMU ---
    const scene = new THREE.Scene();
    // Sis efekti ekleyerek uzaktaki çiçeklerin kaybolmasını sağlayalım (Derinlik hissi için)
    scene.fog = new THREE.Fog(0x000000, 10, 100);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30; // Kamerayı biraz geriye alalım

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Performans için pixel ratio'yu sınırlayalım
    container.appendChild(renderer.domElement);

    // --- ÇOKLU ÇİÇEK OLUŞTURMA (INSTANCED MESH) ---
    const flowerCount = 400; // Çiçek sayısı (Performansa göre artırıp azaltabilirsiniz)
    
    // Soyut çiçek/koza şekli için Icosahedron (Düşük poligonlu küre benzeri) kullanıyoruz.
    // İsterseniz TetrahedronGeometry veya OctahedronGeometry de deneyebilirsiniz.
    const flowerGeometry = new THREE.IcosahedronGeometry(1, 0); 
    
    const flowerMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff88, // Neon Yeşil
        wireframe: true, // Tel kafes görünümü
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide // Hem içini hem dışını göster
    });

    // InstancedMesh: Tek bir geometriyi yüzlerce kez çizmenin performanslı yolu
    const flowers = new THREE.InstancedMesh(flowerGeometry, flowerMaterial, flowerCount);
    scene.add(flowers);

    // Her bir çiçeğin pozisyonunu, rotasyonunu ve boyutunu ayarlamak için geçici bir nesne
    const dummy = new THREE.Object3D();

    for (let i = 0; i < flowerCount; i++) {
        // Rastgele Pozisyon (Geniş bir alana yayalım)
        dummy.position.set(
            (Math.random() - 0.5) * 100, // X ekseninde yayılma
            (Math.random() - 0.5) * 100, // Y ekseninde yayılma
            (Math.random() - 0.5) * 100 - 20 // Z ekseninde yayılma (biraz geriye doğru)
        );

        // Rastgele Rotasyon
        dummy.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

        // Rastgele Boyut (Bazıları küçük, bazıları büyük)
        const scale = Math.random() * 1.5 + 0.5;
        dummy.scale.set(scale, scale, scale);

        // Ayarlamaları uygula
        dummy.updateMatrix();
        flowers.setMatrixAt(i, dummy.matrix);
    }
    // Değişikliklerin geçerli olması için bu şart
    flowers.instanceMatrix.needsUpdate = true;


    // --- EKSTRA PARTİKÜLLER (Toz/Polen Efekti) ---
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 800;
    const posArray = new Float32Array(particlesCount * 3);

    for(let i = 0; i < particlesCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 120;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.2,
        color: 0x00d2ff, // Neon Mavi
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);


    // --- ETKİLEŞİM VE ANİMASYON ---
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX - window.innerWidth / 2) * 0.0005;
        mouseY = (event.clientY - window.innerHeight / 2) * 0.0005;
    });

    const animate = () => {
        requestAnimationFrame(animate);

        // Tüm çiçek grubunu yavaşça kendi ekseninde döndür
        flowers.rotation.y += 0.0005;
        flowers.rotation.z += 0.0002;

        // Mouse hareketiyle tüm sahneyi hafifçe oynat (Yumuşak geçiş)
        targetX = mouseX;
        targetY = mouseY;
        
        // Kameranın veya sahnenin tamamının dönmesi daha sinematik bir etki yaratır
        scene.rotation.x += 0.05 * (targetY - scene.rotation.x);
        scene.rotation.y += 0.05 * (targetX - scene.rotation.y);

        // Partikülleri ters yöne döndür
        particlesMesh.rotation.y = -scene.rotation.y * 1.5;

        renderer.render(scene, camera);
    };

    animate();

    // Pencere Boyutu Değişince
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
};

document.addEventListener('DOMContentLoaded', initThreeJS);