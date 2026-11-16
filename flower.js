/**
 * flower.js - Procedural 3D Blooming Flower for Alishba
 * Powered by Three.js
 */

class FlowerScene {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.flowerGroup = null;
    this.petals = [];
    this.fallingPetals = [];
    this.fallingPetalMat = null;
    this.particles = null;
    this.rainParticles = null;
    this.isRaining = false;
    this.rainTimeout = null;

    this.bloomProgress = 1.0; // 0 = closed bud, 1 = full majestic bloom
    this.targetBloom = 1.0;

    // Palette presets
    this.palettes = {
      blush: {
        name: "Blush Peony",
        petal: 0xff6b8b,
        petalInner: 0xff8fab,
        petalOuter: 0xff4d6d,
        emissive: 0x3d0014,
        core: 0xffd166,
        stem: 0x2d6a4f,
        lightColor: 0xffccd5,
        bgGradient: ["#1a0914", "#2a1124", "#0f050d"]
      },
      lavender: {
        name: "Lavender Dream",
        petal: 0xb5838d,
        petalInner: 0xd8b4e2,
        petalOuter: 0x9b5de5,
        emissive: 0x220533,
        core: 0xffe66d,
        stem: 0x284b40,
        lightColor: 0xdfccf1,
        bgGradient: ["#130a1c", "#201230", "#0a050f"]
      },
      sunset: {
        name: "Golden Sunset",
        petal: 0xf77f00,
        petalInner: 0xfcbf49,
        petalOuter: 0xd62828,
        emissive: 0x4a1200,
        core: 0xfff3b0,
        stem: 0x386641,
        lightColor: 0xffe0b2,
        bgGradient: ["#1f0e08", "#2d160c", "#100603"]
      },
      midnight: {
        name: "Midnight Mirage",
        petal: 0x00b4d8,
        petalInner: 0x90e0ef,
        petalOuter: 0x0077b6,
        emissive: 0x011f3d,
        core: 0xe0aaff,
        stem: 0x1d3557,
        lightColor: 0xade8f4,
        bgGradient: ["#030d1a", "#08182d", "#01060d"]
      },
      pearl: {
        name: "Pure Silk",
        petal: 0xfbf8f3,
        petalInner: 0xffe8d6,
        petalOuter: 0xf7ede2,
        emissive: 0x2a2118,
        core: 0xf6bd60,
        stem: 0x40534c,
        lightColor: 0xfff7ed,
        bgGradient: ["#161311", "#231f1c", "#0d0b0a"]
      }
    };

    this.currentPaletteKey = "blush";
    this.currentPalette = this.palettes.blush;

    this.clock = new THREE.Clock();
    this.mouse = new THREE.Vector2();
    this.targetMouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.isPlucking = false;

    this.init();
  }

  init() {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 500;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x130a14, 0.035);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 1.2, 5.8);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0.4, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 9.0;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.35;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.7;

    // 5. Lighting
    this.setupLights();

    // 6. Build the 3D Flower
    this.buildFlower();

    // 7. Background particles and drifting petals
    this.setupAtmosphere();

    // 8. Event listeners
    window.addEventListener("resize", () => this.onWindowResize());
    this.renderer.domElement.addEventListener("pointerdown", (e) => this.onPointerDown(e));
    window.addEventListener("pointermove", (e) => this.onPointerMove(e));

    // 9. Start loop
    this.animate();
  }

  setupLights() {
    this.ambientLight = new THREE.AmbientLight(0xffebee, 0.65);
    this.scene.add(this.ambientLight);

    this.keyLight = new THREE.DirectionalLight(0xfff0f5, 1.5);
    this.keyLight.position.set(4, 6, 4);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    this.keyLight.shadow.bias = -0.001;
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight(0xd8b4e2, 0.85);
    this.fillLight.position.set(-5, 2, -3);
    this.scene.add(this.fillLight);

    this.rimLight = new THREE.DirectionalLight(0xffccd5, 1.25);
    this.rimLight.position.set(0, 5, -5);
    this.scene.add(this.rimLight);

    this.coreLight = new THREE.PointLight(0xffd166, 2.2, 4.2);
    this.coreLight.position.set(0, 0.8, 0);
    this.scene.add(this.coreLight);
  }

  createPetalGeometry(width, length, cupDepth, tipCurl, segmentsU = 22, segmentsV = 26) {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const uvs = [];
    const indices = [];

    for (let j = 0; j <= segmentsV; j++) {
      const v = j / segmentsV;
      const profile = Math.sin(Math.PI * Math.pow(v, 0.62)) * (1.0 + 0.12 * Math.sin(Math.PI * 2 * v));

      for (let i = 0; i <= segmentsU; i++) {
        const u = (i / segmentsU) - 0.5;

        const x = u * width * profile;
        const y = v * length;

        const cup = -cupDepth * (0.25 - u * u) * Math.sin(Math.PI * v);
        const curlProgress = Math.max(0, v - 0.52) / 0.48;
        const curl = tipCurl * Math.pow(curlProgress, 2.2);
        const ruffle = Math.sin(u * 14.0) * 0.025 * Math.sin(Math.PI * v);

        const z = cup + curl + ruffle;

        positions.push(x, y, z);
        uvs.push(i / segmentsU, v);
      }
    }

    const rowSize = segmentsU + 1;
    for (let j = 0; j < segmentsV; j++) {
      for (let i = 0; i < segmentsU; i++) {
        const a = j * rowSize + i;
        const b = a + 1;
        const c = a + rowSize;
        const d = c + 1;

        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  buildFlower() {
    this.flowerGroup = new THREE.Group();
    this.scene.add(this.flowerGroup);

    this.innerPetalMaterial = new THREE.MeshPhysicalMaterial({
      color: this.currentPalette.petalInner,
      emissive: this.currentPalette.emissive,
      emissiveIntensity: 0.35,
      roughness: 0.32,
      metalness: 0.04,
      clearcoat: 0.3,
      clearcoatRoughness: 0.2,
      transmission: 0.18,
      ior: 1.45,
      side: THREE.DoubleSide
    });

    this.petalMaterial = new THREE.MeshPhysicalMaterial({
      color: this.currentPalette.petal,
      emissive: this.currentPalette.emissive,
      emissiveIntensity: 0.3,
      roughness: 0.35,
      metalness: 0.05,
      clearcoat: 0.25,
      clearcoatRoughness: 0.25,
      transmission: 0.15,
      ior: 1.45,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide
    });

    this.outerPetalMaterial = new THREE.MeshPhysicalMaterial({
      color: this.currentPalette.petalOuter,
      emissive: this.currentPalette.emissive,
      emissiveIntensity: 0.25,
      roughness: 0.4,
      metalness: 0.05,
      clearcoat: 0.2,
      clearcoatRoughness: 0.3,
      transmission: 0.1,
      ior: 1.45,
      side: THREE.DoubleSide
    });

    const layers = [
      { count: 4, width: 0.65, length: 1.1, cup: 0.45, curl: 0.05, budAngle: 0.12, bloomAngle: 0.42, radius: 0.14, yOffset: 0.68, mat: this.innerPetalMaterial },
      { count: 6, width: 0.85, length: 1.35, cup: 0.55, curl: 0.12, budAngle: 0.22, bloomAngle: 0.68, radius: 0.25, yOffset: 0.62, mat: this.innerPetalMaterial },
      { count: 8, width: 1.1, length: 1.7, cup: 0.65, curl: 0.22, budAngle: 0.32, bloomAngle: 0.95, radius: 0.42, yOffset: 0.54, mat: this.petalMaterial },
      { count: 10, width: 1.35, length: 2.05, cup: 0.75, curl: 0.38, budAngle: 0.42, bloomAngle: 1.25, radius: 0.62, yOffset: 0.44, mat: this.petalMaterial },
      { count: 12, width: 1.6, length: 2.4, cup: 0.82, curl: 0.55, budAngle: 0.52, bloomAngle: 1.55, radius: 0.82, yOffset: 0.32, mat: this.outerPetalMaterial },
      { count: 14, width: 1.85, length: 2.7, cup: 0.9, curl: 0.72, budAngle: 0.62, bloomAngle: 1.82, radius: 1.05, yOffset: 0.18, mat: this.outerPetalMaterial }
    ];

    this.petals = [];
    const goldenAngle = 2.39996;

    layers.forEach((layer, layerIdx) => {
      const geom = this.createPetalGeometry(layer.width, layer.length, layer.cup, layer.curl);

      for (let i = 0; i < layer.count; i++) {
        const pivot = new THREE.Group();
        pivot.position.y = layer.yOffset;

        const angle = (i * (Math.PI * 2 / layer.count)) + (layerIdx * goldenAngle);
        pivot.rotation.y = angle;

        const mesh = new THREE.Mesh(geom, layer.mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.z = layer.radius;
        mesh.rotation.z = (Math.random() - 0.5) * 0.1;

        pivot.add(mesh);
        this.flowerGroup.add(pivot);

        this.petals.push({
          pivot: pivot,
          mesh: mesh,
          layerIdx: layerIdx,
          budAngle: layer.budAngle + (Math.random() - 0.5) * 0.04,
          bloomAngle: layer.bloomAngle + (Math.random() - 0.5) * 0.08,
          baseY: layer.yOffset
        });
      }
    });

    this.buildStamenCenter();
    this.buildSepals();
    this.buildStem();
    this.buildLeaves();

    this.flowerGroup.position.y = -0.35;
  }

  buildStamenCenter() {
    const centerGroup = new THREE.Group();
    centerGroup.position.y = 0.68;

    const coreGeom = new THREE.SphereGeometry(0.24, 16, 16);
    this.coreMat = new THREE.MeshStandardMaterial({
      color: this.currentPalette.core,
      emissive: this.currentPalette.core,
      emissiveIntensity: 0.7,
      roughness: 0.3
    });
    this.coreMesh = new THREE.Mesh(coreGeom, this.coreMat);
    this.coreMesh.scale.set(1, 0.6, 1);
    centerGroup.add(this.coreMesh);

    const stamenCount = 48;
    const filamentMat = new THREE.LineBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.85 });
    const antherGeom = new THREE.SphereGeometry(0.038, 8, 8);
    const antherMat = new THREE.MeshStandardMaterial({
      color: 0xffe66d,
      emissive: 0xffaa00,
      emissiveIntensity: 0.9
    });

    for (let i = 0; i < stamenCount; i++) {
      const radius = 0.08 + Math.random() * 0.24;
      const theta = Math.random() * Math.PI * 2;
      const height = 0.25 + Math.random() * 0.28;

      const px = Math.cos(theta) * radius;
      const pz = Math.sin(theta) * radius;

      const anther = new THREE.Mesh(antherGeom, antherMat);
      anther.position.set(px * 1.3, height, pz * 1.3);
      centerGroup.add(anther);

      const points = [
        new THREE.Vector3(px * 0.5, 0, pz * 0.5),
        new THREE.Vector3(px * 1.3, height, pz * 1.3)
      ];
      const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(lineGeom, filamentMat);
      centerGroup.add(line);
    }

    this.flowerGroup.add(centerGroup);
    this.stamenCenter = centerGroup;
  }

  buildSepals() {
    const sepalGeom = this.createPetalGeometry(0.45, 1.2, 0.3, 0.45, 12, 12);
    this.sepalMat = new THREE.MeshStandardMaterial({
      color: this.currentPalette.stem,
      roughness: 0.6,
      side: THREE.DoubleSide
    });

    const count = 5;
    for (let i = 0; i < count; i++) {
      const pivot = new THREE.Group();
      pivot.position.y = 0.25;
      pivot.rotation.y = (i * Math.PI * 2 / count) + 0.3;
      pivot.rotation.x = 1.95;

      const mesh = new THREE.Mesh(sepalGeom, this.sepalMat);
      mesh.position.z = 0.28;
      pivot.add(mesh);
      this.flowerGroup.add(pivot);
    }
  }

  buildStem() {
    const stemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.3, 0),
      new THREE.Vector3(0.08, -0.6, 0.02),
      new THREE.Vector3(-0.06, -1.6, -0.04),
      new THREE.Vector3(0.04, -2.6, 0.06),
      new THREE.Vector3(0, -3.8, 0)
    ]);

    const stemGeom = new THREE.TubeGeometry(stemCurve, 64, 0.095, 12, false);
    this.stemMaterial = new THREE.MeshStandardMaterial({
      color: this.currentPalette.stem,
      roughness: 0.5,
      metalness: 0.1
    });

    this.stemMesh = new THREE.Mesh(stemGeom, this.stemMaterial);
    this.stemMesh.castShadow = true;
    this.stemMesh.receiveShadow = true;
    this.flowerGroup.add(this.stemMesh);
  }

  buildLeaves() {
    const leafGeom = this.createPetalGeometry(0.95, 1.9, 0.25, 0.22, 16, 16);
    this.leafMaterial = new THREE.MeshStandardMaterial({
      color: this.currentPalette.stem,
      roughness: 0.5,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    const leaf1Pivot = new THREE.Group();
    leaf1Pivot.position.set(-0.04, -1.2, 0.02);
    leaf1Pivot.rotation.y = -1.2;
    leaf1Pivot.rotation.x = 1.15;
    leaf1Pivot.rotation.z = -0.3;

    const leaf1 = new THREE.Mesh(leafGeom, this.leafMaterial);
    leaf1.castShadow = true;
    leaf1Pivot.add(leaf1);
    this.flowerGroup.add(leaf1Pivot);

    const leaf2Pivot = new THREE.Group();
    leaf2Pivot.position.set(0.03, -2.2, -0.02);
    leaf2Pivot.rotation.y = 1.8;
    leaf2Pivot.rotation.x = 1.25;
    leaf2Pivot.rotation.z = 0.2;

    const leaf2 = new THREE.Mesh(leafGeom, this.leafMaterial);
    leaf2.scale.set(1.15, 1.15, 1.15);
    leaf2.castShadow = true;
    leaf2Pivot.add(leaf2);
    this.flowerGroup.add(leaf2Pivot);
  }

  setupAtmosphere() {
    const particleCount = 140;
    const pGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    this.particleData = [];

    for (let i = 0; i < particleCount; i++) {
      const radius = 1.2 + Math.random() * 3.5;
      const angle = Math.random() * Math.PI * 2;
      const y = -2.5 + Math.random() * 5.5;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      this.particleData.push({
        radius: radius,
        angle: angle,
        speed: 0.15 + Math.random() * 0.35,
        yBase: y,
        bobSpeed: 0.5 + Math.random() * 1.5,
        bobAmp: 0.15 + Math.random() * 0.25
      });
    }

    pGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255, 255, 255, 1)");
    grad.addColorStop(0.3, "rgba(255, 230, 160, 0.8)");
    grad.addColorStop(0.7, "rgba(255, 150, 180, 0.25)");
    grad.addColorStop(1, "rgba(255, 150, 180, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const pTexture = new THREE.CanvasTexture(canvas);

    const pMaterial = new THREE.PointsMaterial({
      size: 0.16,
      map: pTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.85
    });

    this.particles = new THREE.Points(pGeometry, pMaterial);
    this.scene.add(this.particles);

    const petalGeom = this.createPetalGeometry(0.35, 0.5, 0.15, 0.1, 8, 8);
    this.fallingPetalMat = new THREE.MeshStandardMaterial({
      color: this.currentPalette.petal,
      roughness: 0.4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75
    });

    this.fallingPetals = [];
    const driftCount = 28;

    for (let i = 0; i < driftCount; i++) {
      const mesh = new THREE.Mesh(petalGeom, this.fallingPetalMat);
      const x = (Math.random() - 0.5) * 8.0;
      const y = -3.0 + Math.random() * 8.0;
      const z = -2.0 + Math.random() * 6.0;

      mesh.position.set(x, y, z);
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      this.scene.add(mesh);
      this.fallingPetals.push({
        mesh: mesh,
        speedY: 0.008 + Math.random() * 0.014,
        rotSpeedX: 0.01 + Math.random() * 0.02,
        rotSpeedY: 0.008 + Math.random() * 0.015,
        rotSpeedZ: 0.01 + Math.random() * 0.015,
        swaySpeed: 0.8 + Math.random() * 1.2,
        swayAmp: 0.006 + Math.random() * 0.008,
        initialX: x
      });
    }

    this.setupRainEffect();
  }

  setupRainEffect() {
    const rainCount = 180;
    const rainGeom = new THREE.BufferGeometry();
    const rainPos = new Float32Array(rainCount * 3);

    for (let i = 0; i < rainCount; i++) {
      rainPos[i * 3] = (Math.random() - 0.5) * 2.5;
      rainPos[i * 3 + 1] = 2.0 + Math.random() * 5.0;
      rainPos[i * 3 + 2] = (Math.random() - 0.5) * 2.5;
    }

    rainGeom.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));

    const rainMat = new THREE.PointsMaterial({
      color: 0x90e0ef,
      size: 0.08,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });

    this.rainParticles = new THREE.Points(rainGeom, rainMat);
    this.scene.add(this.rainParticles);
  }

  triggerWatering() {
    if (this.isRaining) return;
    this.isRaining = true;

    this.rainParticles.material.opacity = 0.9;

    const pos = this.rainParticles.geometry.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      pos[i] = (Math.random() - 0.5) * 2.0;
      pos[i + 1] = 2.0 + Math.random() * 4.0;
      pos[i + 2] = (Math.random() - 0.5) * 2.0;
    }
    this.rainParticles.geometry.attributes.position.needsUpdate = true;

    this.setBloomProgress(1.0);

    if (window.gsap) {
      gsap.to(this.coreLight, {
        intensity: 4.5,
        duration: 0.6,
        yoyo: true,
        repeat: 3,
        ease: "power2.inOut"
      });

      gsap.to(this.flowerGroup.position, {
        y: -0.15,
        duration: 0.4,
        yoyo: true,
        repeat: 1,
        ease: "sine.out"
      });
    }

    clearTimeout(this.rainTimeout);
    this.rainTimeout = setTimeout(() => {
      if (window.gsap) {
        gsap.to(this.rainParticles.material, {
          opacity: 0,
          duration: 0.8,
          onComplete: () => {
            this.isRaining = false;
          }
        });
      } else {
        this.rainParticles.material.opacity = 0;
        this.isRaining = false;
      }
    }, 2200);
  }

  setBloomProgress(targetValue, duration = 1.2) {
    this.targetBloom = Math.max(0, Math.min(1, targetValue));

    if (window.gsap) {
      gsap.to(this, {
        bloomProgress: this.targetBloom,
        duration: duration,
        ease: "power2.out"
      });
    } else {
      this.bloomProgress = this.targetBloom;
    }
  }

  setPalette(paletteKey) {
    if (!this.palettes[paletteKey]) return;
    this.currentPaletteKey = paletteKey;
    const p = this.palettes[paletteKey];
    this.currentPalette = p;

    if (window.gsap) {
      const targetPetalColor = new THREE.Color(p.petal);
      const targetInnerColor = new THREE.Color(p.petalInner);
      const targetOuterColor = new THREE.Color(p.petalOuter);
      const targetEmissive = new THREE.Color(p.emissive);
      const targetCore = new THREE.Color(p.core);
      const targetStem = new THREE.Color(p.stem);
      const targetRim = new THREE.Color(p.lightColor);

      gsap.to(this.innerPetalMaterial.color, { r: targetInnerColor.r, g: targetInnerColor.g, b: targetInnerColor.b, duration: 0.9 });
      gsap.to(this.petalMaterial.color, { r: targetPetalColor.r, g: targetPetalColor.g, b: targetPetalColor.b, duration: 0.9 });
      gsap.to(this.outerPetalMaterial.color, { r: targetOuterColor.r, g: targetOuterColor.g, b: targetOuterColor.b, duration: 0.9 });
      gsap.to(this.petalMaterial.emissive, { r: targetEmissive.r, g: targetEmissive.g, b: targetEmissive.b, duration: 0.9 });
      gsap.to(this.coreLight.color, { r: targetCore.r, g: targetCore.g, b: targetCore.b, duration: 0.9 });
      gsap.to(this.coreMat.color, { r: targetCore.r, g: targetCore.g, b: targetCore.b, duration: 0.9 });
      gsap.to(this.rimLight.color, { r: targetRim.r, g: targetRim.g, b: targetRim.b, duration: 0.9 });
      gsap.to(this.stemMaterial.color, { r: targetStem.r, g: targetStem.g, b: targetStem.b, duration: 0.9 });
      gsap.to(this.leafMaterial.color, { r: targetStem.r, g: targetStem.g, b: targetStem.b, duration: 0.9 });
      if (this.sepalMat) gsap.to(this.sepalMat.color, { r: targetStem.r, g: targetStem.g, b: targetStem.b, duration: 0.9 });
      if (this.fallingPetalMat) gsap.to(this.fallingPetalMat.color, { r: targetPetalColor.r, g: targetPetalColor.g, b: targetPetalColor.b, duration: 0.9 });
    } else {
      this.innerPetalMaterial.color.set(p.petalInner);
      this.petalMaterial.color.set(p.petal);
      this.outerPetalMaterial.color.set(p.petalOuter);
      this.petalMaterial.emissive.set(p.emissive);
      this.coreLight.color.set(p.core);
      this.coreMat.color.set(p.core);
      this.rimLight.color.set(p.lightColor);
      this.stemMaterial.color.set(p.stem);
      this.leafMaterial.color.set(p.stem);
      if (this.sepalMat) this.sepalMat.color.set(p.stem);
      if (this.fallingPetalMat) this.fallingPetalMat.color.set(p.petal);
    }
  }

  pluckPetal(onCompleteCallback) {
    if (this.isPlucking) return;
    this.isPlucking = true;

    const candidates = this.petals.filter(p => p.layerIdx >= 3 && !p.isPlucked);
    if (candidates.length === 0) {
      this.petals.forEach(p => { p.isPlucked = false; p.pivot.visible = true; });
    }

    const available = this.petals.filter(p => p.layerIdx >= 3 && !p.isPlucked);
    const chosen = available[Math.floor(Math.random() * available.length)];
    if (!chosen) {
      this.isPlucking = false;
      return;
    }

    chosen.isPlucked = true;

    const geom = chosen.mesh.geometry.clone();
    const mat = chosen.mesh.material.clone();
    const detached = new THREE.Mesh(geom, mat);

    chosen.mesh.updateWorldMatrix(true, false);
    detached.applyMatrix4(chosen.mesh.matrixWorld);
    this.scene.add(detached);

    chosen.pivot.visible = false;

    if (window.gsap) {
      const tl = gsap.timeline({
        onComplete: () => {
          this.scene.remove(detached);
          geom.dispose();
          mat.dispose();
          this.isPlucking = false;
          setTimeout(() => {
            chosen.isPlucked = false;
            chosen.pivot.visible = true;
          }, 8000);

          if (onCompleteCallback) onCompleteCallback();
        }
      });

      tl.to(detached.position, {
        x: detached.position.x * 1.3 + (Math.random() - 0.5) * 0.8,
        y: this.camera.position.y - 0.5,
        z: this.camera.position.z - 1.8,
        duration: 1.8,
        ease: "power2.inOut"
      });

      tl.to(detached.rotation, {
        x: detached.rotation.x + Math.PI * 2.5,
        y: detached.rotation.y + Math.PI * 1.5,
        z: detached.rotation.z + Math.PI,
        duration: 1.8,
        ease: "sine.inOut"
      }, "<");

      tl.to(detached.scale, {
        x: 0.1,
        y: 0.1,
        z: 0.1,
        duration: 0.4,
        ease: "power2.in"
      }, "-=0.3");
    } else {
      this.scene.remove(detached);
      this.isPlucking = false;
      if (onCompleteCallback) onCompleteCallback();
    }
  }

  onPointerMove(event) {
    const x = (event.clientX / window.innerWidth) * 2 - 1;
    const y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.targetMouse.set(x, y);
  }

  onPointerDown(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.petals.map(p => p.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      window.dispatchEvent(new CustomEvent("flower-clicked", {
        detail: { x: event.clientX, y: event.clientY }
      }));
    }
  }

  onWindowResize() {
    if (!this.container || !this.renderer) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || 500;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  captureSnapshot() {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL("image/png");
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    this.petals.forEach(petal => {
      if (petal.isPlucked) return;

      const layerOffset = petal.layerIdx * 0.1;
      const normalizedBloom = Math.min(1.0, Math.max(0.0, (this.bloomProgress - layerOffset * 0.45) / (1.0 - layerOffset * 0.45)));
      const targetAngle = THREE.MathUtils.lerp(petal.budAngle, petal.bloomAngle, normalizedBloom);
      const wind = Math.sin(elapsedTime * 1.5 + petal.pivot.rotation.y * 2.0) * 0.016 * (petal.layerIdx + 1) * 0.3;

      petal.pivot.rotation.x = targetAngle + wind;
    });

    if (this.flowerGroup) {
      const targetTiltZ = Math.sin(elapsedTime * 0.8) * 0.025 + (this.targetMouse.x * 0.06);
      const targetTiltX = Math.cos(elapsedTime * 0.6) * 0.02 - (this.targetMouse.y * 0.04);
      this.flowerGroup.rotation.z = THREE.MathUtils.lerp(this.flowerGroup.rotation.z, targetTiltZ, 0.05);
      this.flowerGroup.rotation.x = THREE.MathUtils.lerp(this.flowerGroup.rotation.x, targetTiltX, 0.05);
    }

    if (this.particles) {
      const pos = this.particles.geometry.attributes.position.array;
      for (let i = 0; i < this.particleData.length; i++) {
        const pd = this.particleData[i];
        pd.angle += pd.speed * delta;
        const y = pd.yBase + Math.sin(elapsedTime * pd.bobSpeed) * pd.bobAmp;

        pos[i * 3] = Math.cos(pd.angle) * pd.radius;
        pos[i * 3 + 1] = y;
        pos[i * 3 + 2] = Math.sin(pd.angle) * pd.radius;
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }

    for (let i = 0; i < this.fallingPetals.length; i++) {
      const fp = this.fallingPetals[i];
      fp.mesh.position.y -= fp.speedY;
      fp.mesh.position.x = fp.initialX + Math.sin(elapsedTime * fp.swaySpeed + i) * fp.swayAmp * 15.0;

      fp.mesh.rotation.x += fp.rotSpeedX;
      fp.mesh.rotation.y += fp.rotSpeedY;
      fp.mesh.rotation.z += fp.rotSpeedZ;

      if (fp.mesh.position.y < -3.5) {
        fp.mesh.position.y = 4.8;
        fp.initialX = (Math.random() - 0.5) * 8.0;
        fp.mesh.position.x = fp.initialX;
      }
    }

    if (this.isRaining && this.rainParticles) {
      const rainPos = this.rainParticles.geometry.attributes.position.array;
      for (let i = 0; i < rainPos.length; i += 3) {
        rainPos[i + 1] -= 0.18;
        if (rainPos[i + 1] < 0.2) {
          rainPos[i + 1] = 2.5 + Math.random() * 3.0;
          rainPos[i] = (Math.random() - 0.5) * 2.0;
          rainPos[i + 2] = (Math.random() - 0.5) * 2.0;
        }
      }
      this.rainParticles.geometry.attributes.position.needsUpdate = true;
    }

    if (this.coreLight && !this.isRaining) {
      this.coreLight.intensity = 1.8 + Math.sin(elapsedTime * 2.2) * 0.4;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

window.FlowerScene = FlowerScene;
