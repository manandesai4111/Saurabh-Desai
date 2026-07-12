const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const navToggle = document.querySelector("[data-nav-toggle]");
const form = document.querySelector("[data-enquiry-form]");
const formStatus = document.querySelector("[data-form-status]");
const tourVideo = document.querySelector("[data-tour-video]");

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

if (header) {
  const setHeaderState = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 16);
  };

  setHeaderState();
  window.addEventListener("scroll", setHeaderState, { passive: true });
}

if (nav && navToggle && header) {
  navToggle.addEventListener("click", () => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!isOpen));
    nav.classList.toggle("is-open", !isOpen);
    header.classList.toggle("nav-active", !isOpen);
    document.body.classList.toggle("nav-open", !isOpen);
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navToggle.setAttribute("aria-expanded", "false");
      nav.classList.remove("is-open");
      header.classList.remove("nav-active");
      document.body.classList.remove("nav-open");
    });
  });
}

if (form && formStatus) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    formStatus.textContent = "Thank you. Your Raj Villa booking enquiry is ready for follow-up.";
    form.reset();
  });
}

if (tourVideo && "IntersectionObserver" in window) {
  const videoObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          tourVideo.play().catch(() => {});
        } else {
          tourVideo.pause();
        }
      });
    },
    { threshold: 0.45 },
  );

  videoObserver.observe(tourVideo);
}

const initModelStory = () => {
  const stage = document.querySelector("[data-model-stage]");
  const canvas = document.querySelector("[data-model-canvas]");
  const status = document.querySelector("[data-model-status]");
  const progressBar = document.querySelector("[data-progress-bar]");
  const phaseLabel = document.querySelector("[data-phase-label]");
  const viewport = canvas?.closest(".model-viewport");

  if (!stage || !canvas || !viewport) {
    return;
  }

  let progress = 0;

  const updateProgress = () => {
    const rect = stage.getBoundingClientRect();
    const scrollable = Math.max(stage.offsetHeight - window.innerHeight, 1);
    const stickyProgress = clamp(-rect.top / scrollable, 0, 1);
    const inlineProgress = clamp((window.innerHeight * 0.65 - rect.top) / Math.max(rect.height, 1), 0, 1);
    progress = stage.offsetHeight > window.innerHeight * 1.4 ? stickyProgress : inlineProgress;

    stage.style.setProperty("--scene-progress", progress.toFixed(3));

    if (progressBar) {
      progressBar.style.transform = `scaleX(${progress})`;
    }

    if (phaseLabel) {
      if (progress < 0.34) {
        phaseLabel.textContent = "3D Blueprint";
      } else if (progress < 0.7) {
        phaseLabel.textContent = "Material Reveal";
      } else {
        phaseLabel.textContent = "Realistic Elevation";
      }
    }
  };

  updateProgress();
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);

  const showFallback = (message) => {
    stage.classList.add("model-failed");
    if (status) {
      status.textContent = message;
    }
  };

  const setStatusHidden = () => {
    if (status) {
      status.classList.add("is-hidden");
    }
  };

  const loadModel = async () => {
    if (!window.WebGLRenderingContext) {
      showFallback("3D preview is unavailable on this device. Showing render preview.");
      return;
    }

    const THREE = await import("three");
    const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0.25, 1.15, 5.2);

    const group = new THREE.Group();
    scene.add(group);

    const grid = new THREE.GridHelper(6, 30, 0x79d7ff, 0x18384b);
    grid.position.y = -1.05;
    grid.material.transparent = true;
    grid.material.opacity = 0.36;
    scene.add(grid);

    scene.add(new THREE.HemisphereLight(0xdcecff, 0x15110d, 2.1));

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
    keyLight.position.set(3.5, 5, 4);
    scene.add(keyLight);

    const warmLight = new THREE.PointLight(0xffc77a, 1.4, 10);
    warmLight.position.set(-2.4, 1.2, 2.4);
    scene.add(warmLight);

    const loader = new GLTFLoader();
    const meshes = [];
    let modelReady = false;

    const normalizeModel = (model) => {
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      model.position.sub(center);
      const maxAxis = Math.max(size.x, size.y, size.z) || 1;
      model.scale.setScalar(1.7 / maxAxis);
      model.position.y -= 0.16;
    };

    const asArray = (material) => (Array.isArray(material) ? material : [material]);
    const restoreMaterialShape = (source, materials) => (Array.isArray(source) ? materials : materials[0]);

    const prepareMesh = (mesh) => {
      const original = mesh.material;
      const realMaterials = asArray(original).map((material) => {
        const next = material.clone();
        next.transparent = false;
        next.opacity = 1;
        return next;
      });

      const blueprintMaterials = asArray(original).map(() => {
        const blueprint = new THREE.MeshStandardMaterial({
          color: 0x83dfff,
          emissive: 0x12384a,
          emissiveIntensity: 0.7,
          metalness: 0.18,
          roughness: 0.42,
          transparent: true,
          opacity: 0.9,
          wireframe: true,
        });
        return blueprint;
      });

      mesh.userData.originalMaterialShape = original;
      mesh.userData.realMaterials = realMaterials;
      mesh.userData.blueprintMaterials = blueprintMaterials;
      mesh.userData.mode = "";
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      meshes.push(mesh);
    };

    await new Promise((resolve, reject) => {
      loader.load(
        "assets/raj-villa-house.glb",
        (gltf) => {
          const model = gltf.scene;
          normalizeModel(model);
          model.traverse((child) => {
            if (child.isMesh) {
              prepareMesh(child);
            }
          });
          group.add(model);
          modelReady = true;
          setStatusHidden();
          resolve();
        },
        undefined,
        reject,
      );
    });

    const resize = () => {
      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };

    resize();
    window.addEventListener("resize", resize);

    const updateMaterials = () => {
      const blueprintStrength = clamp(1 - progress / 0.58, 0, 1);
      const useBlueprint = blueprintStrength > 0.08;

      meshes.forEach((mesh) => {
        const mode = useBlueprint ? "blueprint" : "real";
        if (mesh.userData.mode !== mode) {
          const materials = useBlueprint ? mesh.userData.blueprintMaterials : mesh.userData.realMaterials;
          mesh.material = restoreMaterialShape(mesh.userData.originalMaterialShape, materials);
          mesh.userData.mode = mode;
        }

        if (useBlueprint) {
          mesh.userData.blueprintMaterials.forEach((material) => {
            material.opacity = 0.22 + blueprintStrength * 0.72;
          });
        }
      });

      grid.material.opacity = 0.06 + blueprintStrength * 0.32;
    };

    const animate = (time) => {
      updateMaterials();

      const float = Math.sin(time * 0.001) * 0.035;
      group.rotation.y = THREE.MathUtils.lerp(-0.38, 0.34, progress) + Math.sin(time * 0.00045) * 0.035;
      group.rotation.x = THREE.MathUtils.lerp(0.12, -0.04, progress);
      group.position.y = float;
      group.position.x = THREE.MathUtils.lerp(0.16, -0.1, progress);

      camera.position.z = THREE.MathUtils.lerp(5.8, 4.9, progress);
      camera.position.y = THREE.MathUtils.lerp(1.12, 0.88, progress);
      camera.lookAt(0, 0, 0);

      if (modelReady) {
        renderer.render(scene, camera);
      }

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  };

  loadModel().catch(() => {
    showFallback("3D preview could not load here. Showing render preview.");
  });
};

initModelStory();
