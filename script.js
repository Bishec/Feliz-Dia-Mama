let scene, camera, renderer, composer;
let stars;
let planet, messageGroup, heartGroup;
let mouseX = 0, mouseY = 0;
let targetZoom = 1;
let currentZoom = 1;
let stickerNodes = []; // Stores { mesh, data } for raycasting

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let started = false;

const startBtn = document.getElementById('start-btn');
const intro = document.getElementById('intro');
const content = document.getElementById('content');
const popupOverlay = document.getElementById('popup-overlay');
const popupEmoji = document.getElementById('popup-emoji');
const popupTitle = document.getElementById('popup-title');
const popupMsg = document.getElementById('popup-message');
const popupClose = document.getElementById('popup-close');

const stickerData = [
    {
        text: "Eres mi luz",
        icon: "🐱",
        title: "Eres mi referente",
        message: "No sé si te lo digo seguido, pero lo pienso mucho. Eres la persona que más admiro en silencio."
    },
    {
        text: "Paciencia infinita",
        icon: "🐶",
        title: "Tu paciencia vale oro",
        message: "Admito que no siempre fui fácil. Gracias por seguir ahí cada vez que lo necesité."
    },
    {
        text: "Amor sin condiciones",
        icon: "🐰",
        title: "Sin condiciones",
        message: "Tu amor nunca tuvo letra pequeña. Siempre estuviste, sin pedir nada a cambio. Eso es hermoso."
    },
    {
        text: "Mi cómplice",
        icon: "🐼",
        title: "Mi cómplice",
        message: "Hay cosas que solo tú entiendes sin que yo tenga que explicarlas. Te agradezco mucho eso."
    },
    {
        text: "La más fuerte",
        icon: "🐹",
        title: "Siempre en pie",
        message: "Has cargado cosas que hubieran derrumbado a cualquiera. Y aquí sigues. Eso me llena de orgullo."
    },
    {
        text: "Gracias, mamá",
        icon: "🐨",
        title: "Gracias de verdad",
        message: "No siempre lo digo como debería. Pero hoy quiero que sepas que te agradezco todo, cada cosa, grande o pequeña."
    },
    {
        text: "Siempre estás",
        icon: "🦊",
        title: "Siempre ahí",
        message: "No importa en qué momento te llame, ahí estás. Eso no es poca cosa. Significa muchísimo."
    },
    {
        text: "Te quiero, ma",
        icon: "🐻",
        title: "Te quiero, ma",
        message: "Sé que no te lo digo tanto como debería, pero hoy es un buen día para empezar. Feliz día, mamá. 🧡"
    }
];

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 2.5;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Starfield
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 8000;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
        starPositions[i] = (Math.random() - 0.5) * 800;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, transparent: true }));
    scene.add(stars);

    // BLACK PLANET
    const planetGeo = new THREE.SphereGeometry(0.5, 64, 64);
    planet = new THREE.Mesh(planetGeo, new THREE.MeshPhongMaterial({
        color: 0x000000, emissive: 0x000000, specular: 0x111111, shininess: 30
    }));
    scene.add(planet);

    // PINK RING
    const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.7, 1.1, 64),
        new THREE.MeshBasicMaterial({ color: 0xff69b4, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
    );
    ring.rotation.x = Math.PI / 2;
    planet.add(ring);

    // HEART OF HEARTS (3 Rows)
    heartGroup = new THREE.Group();
    for (let r = 0; r < 3; r++) {
        const rowScale = 1.6 + (r * 0.15);
        for (let i = 0; i < 60; i++) {
            const t = (i / 60) * Math.PI * 2;
            const h = createHeartSprite();
            h.userData = { t, scale: rowScale };
            heartGroup.add(h);
        }
    }
    scene.add(heartGroup);

    // STICKER NODES (clickable)
    messageGroup = new THREE.Group();
    stickerData.forEach((data, i) => {
        const sprite = createStickerSprite(data.icon, data.text);
        const phi = Math.acos(-1 + (2 * i) / stickerData.length);
        const theta = Math.sqrt(stickerData.length * Math.PI) * phi;
        sprite.position.set(
            2.4 * Math.cos(theta) * Math.sin(phi),
            2.4 * Math.sin(theta) * Math.sin(phi),
            2.4 * Math.cos(phi)
        );
        sprite.userData = { ...data, index: i };
        messageGroup.add(sprite);
        stickerNodes.push(sprite);
    });
    scene.add(messageGroup);

    // Lights
    scene.add(new THREE.PointLight(0xffffff, 2, 100).position.set(5, 5, 5) && new THREE.PointLight(0xffffff, 2, 100));
    const pl = new THREE.PointLight(0xffffff, 2, 100);
    pl.position.set(5, 5, 5);
    scene.add(pl);
    scene.add(new THREE.AmbientLight(0x202020));

    // Post Processing
    const renderScene = new THREE.RenderPass(scene, camera);
    const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.05;
    bloomPass.strength = 1.0;
    bloomPass.radius = 0.8;
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    window.addEventListener('resize', onWindowResize);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('touchmove', onTouchMove, false);
    renderer.domElement.addEventListener('click', onCanvasClick);
    renderer.domElement.addEventListener('touchend', onCanvasClick);
    popupClose.addEventListener('click', closePopup);
    popupOverlay.addEventListener('click', (e) => { if (e.target === popupOverlay) closePopup(); });

    animate();
}

// ---- STICKER SPRITE: Circle with emoji + label ----
function createStickerSprite(emoji, label) {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size + 80;
    const ctx = canvas.getContext('2d');

    // Circle background (pink gradient)
    const grad = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size / 2);
    grad.addColorStop(0, '#ff69b4');
    grad.addColorStop(1, '#880033');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2);
    ctx.fill();

    // Glow border
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Emoji
    ctx.font = `${size * 0.52}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, size / 2, size / 2);

    // Label below
    ctx.font = 'bold 32px Montserrat, sans-serif';
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'rgba(255,20,147,0.8)';
    ctx.shadowBlur = 12;
    ctx.fillText(label.toUpperCase(), size / 2, size + 45);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(mat);

    // Escalado responsivo
    const isMobile = window.innerWidth < 768;
    const baseScale = isMobile ? 1.0 : 0.75;
    sprite.scale.set(baseScale, baseScale * ((size + 80) / size), 1);
    return sprite;
}

function getHeartPoint(t, scale) {
    return {
        x: scale * Math.pow(Math.sin(t), 3),
        y: scale * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16
    };
}

function createHeartSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ff1493';
    ctx.beginPath();
    ctx.moveTo(32, 48);
    ctx.bezierCurveTo(32, 46, 12, 34, 12, 22);
    ctx.bezierCurveTo(12, 14, 20, 8, 28, 8);
    ctx.bezierCurveTo(32, 8, 32, 12, 32, 12);
    ctx.bezierCurveTo(32, 12, 32, 8, 36, 8);
    ctx.bezierCurveTo(44, 8, 52, 14, 52, 22);
    ctx.bezierCurveTo(52, 34, 32, 46, 32, 48);
    ctx.fill();
    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
    sprite.scale.set(0.06, 0.06, 1);
    return sprite;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) {
    mouseX = (event.clientX - window.innerWidth / 2) / 100;
    mouseY = (event.clientY - window.innerHeight / 2) / 100;
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    const dist = Math.sqrt(mouseX * mouseX + mouseY * mouseY);
    targetZoom = 1.2 + (dist * 0.4);
}

function onTouchMove(event) {
    if (event.touches.length === 0) return;
    const touch = event.touches[0];
    mouseX = (touch.clientX - window.innerWidth / 2) / 100;
    mouseY = (touch.clientY - window.innerHeight / 2) / 100;
    mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    const dist = Math.sqrt(mouseX * mouseX + mouseY * mouseY);
    targetZoom = 1.2 + (dist * 0.4);
}

function onCanvasClick() {
    if (!started) return;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(stickerNodes);
    if (intersects.length > 0) {
        const data = intersects[0].object.userData;
        openPopup(data);
    }
}

function openPopup(data) {
    popupEmoji.textContent = data.icon;
    popupTitle.textContent = data.title;
    popupMsg.textContent = data.message;
    popupOverlay.classList.add('visible');
}

function closePopup() {
    popupOverlay.classList.remove('visible');
}

function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.001;
    stars.rotation.y -= 0.0001;
    planet.rotation.y += 0.01;
    messageGroup.rotation.y += 0.003;

    heartGroup.children.forEach((h) => {
        h.userData.t += 0.005;
        const p = getHeartPoint(h.userData.t, h.userData.scale);
        h.position.set(p.x, p.y, 0);
    });

    messageGroup.children.forEach((m, i) => {
        m.position.y += Math.sin(time * 0.8 + i) * 0.003;
    });

    // Hover effect: scale up hovered sticker
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(stickerNodes);
    stickerNodes.forEach(s => {
        const isMobile = window.innerWidth < 768;
        const base = isMobile ? 1.0 : 0.75;
        s.scale.setScalar(hits.length > 0 && hits[0].object === s ? base * 1.15 : base);
    });

    camera.position.x += (mouseX - camera.position.x) * 0.05;
    camera.position.y += (-mouseY - camera.position.y) * 0.05;
    currentZoom += (targetZoom - currentZoom) * 0.02;
    camera.position.z = 3 / currentZoom;
    camera.lookAt(scene.position);
    composer.render();
}

startBtn.addEventListener('click', () => {
    intro.classList.add('hidden');
    content.classList.remove('hidden');
    started = true;
    targetZoom = 2;
});

init();
