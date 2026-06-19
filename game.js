(() => {
  "use strict";

  const canvas = document.querySelector("#scene");
  const startScreen = document.querySelector("#start-screen");
  const hardcoreRulesScreen = document.querySelector("#hardcore-rules-screen");
  const endScreen = document.querySelector("#end-screen");
  const startButton = document.querySelector("#start-button");
  const hardcoreButton = document.querySelector("#hardcore-button");
  const hardcoreConfirmButton = document.querySelector("#hardcore-confirm-button");
  const restartButton = document.querySelector("#restart-button");
  const scoreEl = document.querySelector("#score");
  const comboEl = document.querySelector("#combo");
  const livesEl = document.querySelector("#lives");
  const feedbackEl = document.querySelector("#feedback");
  const nextFormulaEl = document.querySelector("#next-formula");
  const gromovCharacterEl = document.querySelector("#gromov-character");
  const progressEl = document.querySelector("#progress");
  const resultTitleEl = document.querySelector("#result-title");
  const resultKickerEl = document.querySelector("#result-kicker");
  const resultScoreEl = document.querySelector("#result-score");
  const controlPadEl = document.querySelector(".control-pad");
  const controlButtons = [...document.querySelectorAll(".key-button")];
  const mobilePauseButton = document.querySelector("#mobile-pause-button");

  if (!window.THREE) {
    startScreen.classList.add("active");
    startButton.disabled = true;
    startButton.textContent = "Three.js 未载入";
    return;
  }

  const THREE = window.THREE;
  const BPM = 122;
  const BEAT = 60 / BPM;
  const TRAVEL_TIME = 2.55;
  const HARDCORE_TRAVEL_TIME = TRAVEL_TIME * 1.5;
  const MAX_PIXEL_RATIO = 1.5;
  const START_LEAD = 2;
  const SPAWN_Z = -34;
  const HIT_Z = 1.04;
  const EXIT_Z = 4.6;
  const PLAYER_Y = -0.65;
  const PERFECT_WINDOW = 0.095;
  const GOOD_WINDOW = 0.185;
  const MISS_WINDOW = 0.28;
  const NEXT_FORMULA_ADVANCE = 0.1;
  const WALL_W = 5.4;
  const WALL_H = 3.5;
  const WALL_D = 0.34;
  const HARDCORE_WALL_COLOR = 0x4bd6e7;
  const HARDCORE_WALL_EMISSIVE = 0x0b5d66;
  const characterSources = {
    idle: "Gromov.webp",
    nod: "yesyes.webp",
    throw: "throw.webp",
    nono: "nono.webp"
  };

  const characterPreloadImages = Object.values(characterSources).map((source) => {
    const image = new Image();
    image.decoding = "async";
    image.src = source;
    if (image.decode) image.decode().catch(() => {});
    return image;
  });

  const sq = (variable, sub) => ({ variable, sub, sup: "2" });

  const typeInfo = {
    horizontal: {
      color: 0x4bd6e7,
      emissive: 0x0b5d66,
      freq: 440,
      label: "横",
      formulaTerms: [
        { variable: "x", sub: "1", sup: "2" },
        "+",
        { variable: "x", sub: "2", sup: "2" },
        "<",
        "1"
      ]
    },
    vertical: {
      color: 0x70e08a,
      emissive: 0x145b22,
      freq: 554.37,
      label: "竖",
      formulaTerms: [
        { variable: "x", sub: "1", sup: "2" },
        "+",
        { variable: "y", sub: "2", sup: "2" },
        "<",
        "1"
      ]
    },
    circle: {
      color: 0xf3bc4b,
      emissive: 0x6b4505,
      freq: 659.25,
      label: "碎",
      formulaTerms: [
        { variable: "x", sub: "1", sup: "2" },
        "+",
        { variable: "y", sub: "1", sup: "2" },
        "<",
        "1"
      ]
    },
    hardPass: {
      color: HARDCORE_WALL_COLOR,
      emissive: HARDCORE_WALL_EMISSIVE,
      freq: 739.99,
      label: "W",
      action: "hardPass",
      geometryType: "hardPass",
      modelScale: 0.9,
      formulaTerms: [sq("x", "1"), "+", sq("y", "1"), "<", "1"]
    },
    hardBreak: {
      color: HARDCORE_WALL_COLOR,
      emissive: HARDCORE_WALL_EMISSIVE,
      freq: 830.61,
      label: "S",
      action: "circle",
      geometryType: "hardBreak",
      formulaTerms: [sq("x", "1"), "+", sq("y", "1"), "<", "1"]
    }
  };

  const normalChartSpec = [
    // Intro: wide gaps so players can learn each action.
    [10, "horizontal"],
    [14, "vertical"],
    [18, "circle"],
    [22, "horizontal"],
    [26, "vertical"],
    [30, "circle"],

    // Build: shorter gaps, still no sudden pairs.
    [34, "horizontal"],
    [37, "vertical"],
    [40, "circle"],
    [43, "horizontal"],
    [46, "vertical"],
    [48, "circle"],

    // Main: steady rhythm with occasional quick reads.
    [50, "horizontal"],
    [52, "vertical"],
    [54, "circle"],
    [56, "horizontal"],
    [58, "vertical"],
    [60, "horizontal"],
    [62, "circle"],

    // Finale: densest section after the player has warmed up.
    [64, "vertical"],
    [66, "horizontal"],
    [68, "circle"],
    [70, "vertical"],
    [71, "horizontal"],
    [72, "vertical"],
    [74, "circle"],
    [75, "horizontal"],
    [76, "vertical"],
    [78, "horizontal"],
    [79, "circle"],
    [80, "vertical"]
  ];

  const hardcoreFormulaPool = [
    {
      id: "pass-e-1",
      type: "hardPass",
      formulaText: "E(1.1, 1.2)",
      formulaHtml: "E(1.1, 1.2)"
    },
    {
      id: "pass-cp2",
      type: "hardPass",
      formulaText: "CP²(2)",
      formulaHtml: "<span class=\"roman\">CP</span><sup>2</sup>(2)"
    },
    {
      id: "pass-e-2",
      type: "hardPass",
      formulaText: "E(1.05, 1.5)",
      formulaHtml: "E(1.05, 1.5)"
    },
    {
      id: "pass-t2-t2-1",
      type: "hardPass",
      formulaText: "T²(0.6)×T²(0.9)",
      formulaHtml: "T<sup>2</sup>(0.6)&times;T<sup>2</sup>(0.9)"
    },
    {
      id: "pass-t2-t2-2",
      type: "hardPass",
      formulaText: "T²(0.2)×T²(3)",
      formulaHtml: "T<sup>2</sup>(0.2)&times;T<sup>2</sup>(3)"
    },
    {
      id: "pass-dstar-t2",
      type: "hardPass",
      formulaText: "D*T²(0.6, 0.6)",
      formulaHtml: "D<sup>*</sup>T<sup>2</sup>(0.6,0.6)"
    },
    {
      id: "pass-m",
      type: "hardPass",
      formulaText: "𝓜(0.1,0.1,0.1,0.1,0.1)",
      formulaHtml: "𝓜(0.1,0.1,0.1,0.1,0.1)"
    },
    {
      id: "pass-c",
      type: "hardPass",
      formulaText: "𝓒",
      formulaHtml: "𝓒"
    },
    {
      id: "pass-omega-1",
      type: "hardPass",
      formulaText: "Ω_{2;0.3,0.8;2}",
      formulaHtml: "&Omega;<sub>2;0.3,0.8;2</sub>"
    },
    {
      id: "pass-omega-2",
      type: "hardPass",
      formulaText: "Ω_{1.1;0.6,0.7;1.2}",
      formulaHtml: "&Omega;<sub>1.1;0.6,0.7;1.2</sub>"
    },
    {
      id: "break-b",
      type: "hardBreak",
      formulaText: "B(0.9)",
      formulaHtml: "B(0.9)"
    },
    {
      id: "break-p",
      type: "hardBreak",
      formulaText: "P(0.9, 1.3)",
      formulaHtml: "P(0.9, 1.3)"
    },
    {
      id: "break-cp1-cp1",
      type: "hardBreak",
      formulaText: "CP¹(0.8)×CP¹(1.6)",
      formulaHtml: "<span class=\"roman\">CP</span><sup>1</sup>(0.8)&times;<span class=\"roman\">CP</span><sup>1</sup>(1.6)"
    },
    {
      id: "break-t2-t2",
      type: "hardBreak",
      formulaText: "T²(0.7)×T²(0.7)",
      formulaHtml: "T<sup>2</sup>(0.7)&times;T<sup>2</sup>(0.7)"
    },
    {
      id: "break-dstar-t2",
      type: "hardBreak",
      formulaText: "D*T²(0.4, 10)",
      formulaHtml: "D<sup>*</sup>T<sup>2</sup>(0.4,10)"
    },
    {
      id: "break-m",
      type: "hardBreak",
      formulaText: "𝓜(0.1,0.1,0.2,0.3,0.6)",
      formulaHtml: "𝓜(0.1,0.1,0.2,0.3,0.6)"
    },
    {
      id: "break-t2-d",
      type: "hardBreak",
      formulaText: "T²(5)×D(0.5)",
      formulaHtml: "T<sup>2</sup>(5)&times;D(0.5)"
    },
    {
      id: "break-x",
      type: "hardBreak",
      formulaText: "X_{√2/(5sin(2π/5))}",
      formulaHtml: "X<sub>√2/(5sin(2π/5))</sub>"
    },
    {
      id: "break-omega",
      type: "hardBreak",
      formulaText: "Ω_{2;0.4,0.4;2}",
      formulaHtml: "&Omega;<sub>2;0.4,0.4;2</sub>"
    },
    {
      id: "break-ball-union",
      type: "hardBreak",
      formulaText: "B(0,7)⊔B(0.8)⊔B(0.9)",
      formulaHtml: "B(0,7) ⊔ B(0.8) ⊔ B(0.9)"
    }
  ];

  const hardcoreFormulaById = new Map(hardcoreFormulaPool.map((formula) => [formula.id, formula]));
  const hardcoreBeatPattern = [8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 62, 64, 66, 68, 72, 76];

  const modeConfigs = {
    normal: {
      actions: ["horizontal", "vertical", "circle"],
      chart: normalChartSpec
    },
    hardcore: {
      actions: ["hardPass", "circle"],
      chart: hardcoreBeatPattern
    }
  };

  let activeMode = "normal";
  let trackLength = getTrackLength(normalChartSpec);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070a);
  scene.fog = new THREE.Fog(0x05070a, 18, 45);

  const camera = new THREE.PerspectiveCamera(
    56,
    window.innerWidth / window.innerHeight,
    0.1,
    90
  );
  camera.position.set(0, 1.65, 7.35);
  camera.lookAt(0, PLAYER_Y - 0.08, -18);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(getRendererPixelRatio());
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;

  const hemi = new THREE.HemisphereLight(0xeaf7ff, 0x20242a, 1.2);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.45);
  keyLight.position.set(-4, 6, 5);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight(0x4bd6e7, 2.1, 22);
  rimLight.position.set(3.4, 1.6, 1.8);
  scene.add(rimLight);

  const warmLight = new THREE.PointLight(0xf3bc4b, 1.3, 18);
  warmLight.position.set(-3.4, -0.4, -6);
  scene.add(warmLight);

  const wallGeometryCache = new Map();
  const edgeGeometryCache = new Map();
  const formulaTextureCache = new Map();
  const activeWalls = [];
  const debrisClouds = [];
  const sparkClouds = [];
  let notes = buildNotes();
  let state = "idle";
  let lives = 3;
  let score = 0;
  let combo = 0;
  let audioCtx = null;
  let masterGain = null;
  let hatBuffer = null;
  let snareBuffer = null;
  let audioStartAt = 0;
  let perfStartAt = 0;
  let pausedSongTime = 0;
  let scheduledNodes = [];
  let feedbackTimer = 0;
  let gromovResetTimer = 0;
  let formMode = "sphere";
  let formUntil = 0;
  let shakeAmount = 0;
  let lastFrame = performance.now();
  let nextFormulaNoteId = null;

  const world = new THREE.Group();
  scene.add(world);

  const player = createPlayer();
  scene.add(player.group);

  const environment = createEnvironment();
  scene.add(environment);

  updateHud();
  syncModeUi();
  syncMobilePauseButton();
  requestAnimationFrame(loop);
  warmAssetsDuringIdle();

  startButton.addEventListener("click", () => startGame("normal"));
  if (hardcoreButton) {
    hardcoreButton.addEventListener("click", showHardcoreRules);
  }
  if (hardcoreConfirmButton) {
    hardcoreConfirmButton.addEventListener("click", () => startGame("hardcore"));
  }
  restartButton.addEventListener("click", returnToMainMenu);

  for (const button of controlButtons) {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      handleAction(button.dataset.action);
    });
  }

  if (mobilePauseButton) {
    mobilePauseButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      if (!isMobilePauseAvailable()) return;
      togglePause();
      flashMobilePauseButton();
    });
  }

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (event.repeat) return;
    if (key === " ") {
      event.preventDefault();
      togglePause();
      return;
    }
    if (key === "a") handleAction("horizontal");
    if (key === "d") handleAction("vertical");
    if (key === "w") handleAction("hardPass");
    if (key === "s") handleAction("circle");
    if (key === "enter" && state !== "playing" && state !== "paused") {
      event.preventDefault();
      if (hardcoreRulesScreen && hardcoreRulesScreen.classList.contains("active")) {
        startGame("hardcore");
        return;
      }
      startGame(activeMode);
    }
  });

  window.addEventListener("resize", () => {
    resize();
    syncMobilePauseButton();
  });

  if (new URLSearchParams(window.location.search).has("autostart")) {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode") === "hardcore" ? "hardcore" : "normal";
    window.setTimeout(() => startGame(mode), 250);
  }

  function getModeConfig(mode = activeMode) {
    return modeConfigs[mode] || modeConfigs.normal;
  }

  function getTrackLength(chart) {
    const last = chart.length ? chart[chart.length - 1] : 0;
    const lastBeat = Array.isArray(last) ? last[0] : last;
    return (lastBeat + 6) * BEAT;
  }

  function syncModeUi() {
    const actions = new Set(getModeConfig().actions);
    if (controlPadEl) controlPadEl.dataset.mode = activeMode;
    for (const button of controlButtons) {
      const hidden = !actions.has(button.dataset.action);
      button.hidden = hidden;
      button.disabled = hidden;
      button.setAttribute("aria-hidden", String(hidden));
    }
  }

  function buildNotes(mode = activeMode) {
    const chart = mode === "hardcore" ? buildHardcoreChart() : getModeConfig(mode).chart;
    return chart.map(([beat, type, formulaRef], index) => {
      const base = getBaseTypeInfo(type);
      const formula = mode === "hardcore" ? getHardcoreFormula(formulaRef, index) : null;

      return {
        id: index,
        beat,
        type,
        action: base.action || type,
        geometryType: base.geometryType || type,
        formulaKey: formula ? `${type}-${formula.id}` : type,
        formulaTerms: formula ? formula.formulaTerms : base.formulaTerms,
        formulaText: formula ? formula.formulaText : base.formulaText,
        formulaHtml: formula ? formula.formulaHtml : base.formulaHtml,
        modelScale: base.modelScale || 1,
        travelTime: mode === "hardcore" ? HARDCORE_TRAVEL_TIME : TRAVEL_TIME,
        time: beat * BEAT,
        spawned: false,
        resolved: false,
        success: false,
        group: null,
        judgedAt: 0
      };
    });
  }

  function buildHardcoreChart() {
    const shuffled = shuffle([...hardcoreFormulaPool]);
    while (shuffled.length < hardcoreBeatPattern.length) {
      shuffled.push(hardcoreFormulaPool[Math.floor(Math.random() * hardcoreFormulaPool.length)]);
    }

    return hardcoreBeatPattern.map((beat, index) => {
      const formula = shuffled[index % shuffled.length];
      return [beat, formula.type, formula.id];
    });
  }

  function shuffle(items) {
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  function getHardcoreFormula(reference, index = 0) {
    if (typeof reference === "string" && hardcoreFormulaById.has(reference)) {
      return hardcoreFormulaById.get(reference);
    }
    const slot = Number.isFinite(reference) ? reference : index;
    return hardcoreFormulaPool[slot % hardcoreFormulaPool.length];
  }

  function getBaseTypeInfo(type) {
    return typeInfo[type] || typeInfo.horizontal;
  }

  function getNoteInfo(noteOrType) {
    const type = typeof noteOrType === "string" ? noteOrType : noteOrType.type;
    const base = getBaseTypeInfo(type);
    if (typeof noteOrType === "string") return base;
    return {
      ...base,
      formulaTerms: noteOrType.formulaTerms || noteOrType.formulaText || base.formulaTerms,
      formulaText: noteOrType.formulaText || base.formulaText,
      formulaHtml: noteOrType.formulaHtml || base.formulaHtml
    };
  }

  function warmAssetsDuringIdle() {
    const tasks = [];
    const queueGeometry = (type) => {
      tasks.push(() => {
        getWallGeometry(type);
        getWallEdgeGeometry(type);
      });
    };
    const queueFormula = (noteOrType) => {
      tasks.push(() => {
        warmFormulaTexture(noteOrType);
      });
    };

    for (const type of ["horizontal", "vertical", "circle", "hardPass", "hardBreak"]) {
      queueGeometry(type);
    }
    for (const type of ["horizontal", "vertical", "circle"]) {
      queueFormula(type);
    }
    for (const formula of hardcoreFormulaPool) {
      const base = getBaseTypeInfo(formula.type);
      queueFormula({
        type: formula.type,
        formulaKey: `${formula.type}-${formula.id}`,
        formulaTerms: formula.formulaTerms || formula.formulaText || base.formulaTerms,
        formulaText: formula.formulaText || base.formulaText,
        formulaHtml: formula.formulaHtml || base.formulaHtml
      });
    }

    const run = (deadline) => {
      const startedAt = performance.now();
      while (tasks.length > 0) {
        tasks.shift()();
        const elapsed = performance.now() - startedAt;
        const idleRemaining = deadline && typeof deadline.timeRemaining === "function"
          ? deadline.timeRemaining()
          : 0;
        if (elapsed > 8 || (deadline && idleRemaining < 2)) break;
      }
      if (tasks.length > 0) scheduleIdle(run);
    };

    scheduleIdle(run);
  }

  function prewarmNotes(noteList) {
    const geometryTypes = new Set();
    for (const note of noteList) {
      geometryTypes.add(note.geometryType || getNoteInfo(note).geometryType || note.type);
      warmFormulaTexture(note);
    }
    for (const geometryType of geometryTypes) {
      getWallGeometry(geometryType);
      getWallEdgeGeometry(geometryType);
    }
  }

  function warmFormulaTexture(noteOrType) {
    const texture = getFormulaTexture(noteOrType);
    if (typeof renderer.initTexture === "function") {
      renderer.initTexture(texture);
    }
  }

  function scheduleIdle(callback) {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(callback, { timeout: 900 });
      return;
    }
    window.setTimeout(() => callback(null), 16);
  }

  function getExpectedAction(note) {
    return note.action || getNoteInfo(note).action || note.type;
  }

  function isBreakNote(note) {
    return getExpectedAction(note) === "circle";
  }

  function shouldShowNono(action) {
    return activeMode === "hardcore" || action === "circle";
  }

  function createEnvironment() {
    const group = new THREE.Group();

    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0b1013,
      roughness: 0.74,
      metalness: 0.25,
      transparent: true,
      opacity: 0.82
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 52), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, PLAYER_Y - 0.54, -17.5);
    group.add(floor);

    const grid = new THREE.GridHelper(46, 46, 0x2b8e9a, 0x1d3035);
    grid.position.set(0, PLAYER_Y - 0.525, -17.5);
    grid.material.transparent = true;
    grid.material.opacity = 0.46;
    group.add(grid);

    const railMat = new THREE.MeshStandardMaterial({
      color: 0x25313a,
      emissive: 0x062329,
      roughness: 0.42,
      metalness: 0.32
    });
    for (const x of [-3.15, 3.15]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 42), railMat);
      rail.position.set(x, PLAYER_Y - 0.34, -16.2);
      group.add(rail);
    }

    const hitMat = new THREE.MeshBasicMaterial({
      color: 0xf3bc4b,
      transparent: true,
      opacity: 0.72
    });
    const hitFrame = makeLineFrame(WALL_W * 0.72, WALL_H * 0.72, hitMat);
    hitFrame.position.set(0, PLAYER_Y, HIT_Z);
    group.add(hitFrame);

    const pulseRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.74, 0.018, 8, 64),
      new THREE.MeshBasicMaterial({
        color: 0x4bd6e7,
        transparent: true,
        opacity: 0.56
      })
    );
    pulseRing.position.set(0, PLAYER_Y, HIT_Z + 0.02);
    pulseRing.userData.baseScale = 1;
    group.add(pulseRing);
    group.userData.pulseRing = pulseRing;

    for (let i = 0; i < 42; i += 1) {
      const marker = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.035, 0.035),
        new THREE.MeshBasicMaterial({
          color: i % 3 === 0 ? 0x4bd6e7 : 0xffffff,
          transparent: true,
          opacity: i % 3 === 0 ? 0.56 : 0.26
        })
      );
      const side = i % 2 === 0 ? -1 : 1;
      marker.position.set(
        side * (2.35 + Math.random() * 1.1),
        PLAYER_Y + 0.45 + Math.random() * 2.4,
        -3 - Math.random() * 35
      );
      marker.userData.speed = 4 + Math.random() * 5;
      group.add(marker);
    }

    return group;
  }

  function makeLineFrame(width, height, material) {
    const x = width / 2;
    const y = height / 2;
    const points = [
      new THREE.Vector3(-x, -y, 0),
      new THREE.Vector3(x, -y, 0),
      new THREE.Vector3(x, -y, 0),
      new THREE.Vector3(x, y, 0),
      new THREE.Vector3(x, y, 0),
      new THREE.Vector3(-x, y, 0),
      new THREE.Vector3(-x, y, 0),
      new THREE.Vector3(-x, -y, 0)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return new THREE.LineSegments(geometry, material);
  }

  function createPlayer() {
    const group = new THREE.Group();
    group.position.set(0, PLAYER_Y, HIT_Z + 0.22);

    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xf4f7fb,
      emissive: 0x1a3d42,
      roughness: 0.28,
      metalness: 0.18
    });
    const wideMat = new THREE.MeshStandardMaterial({
      color: 0x4bd6e7,
      emissive: 0x0b5965,
      roughness: 0.24,
      metalness: 0.2
    });
    const tallMat = new THREE.MeshStandardMaterial({
      color: 0x70e08a,
      emissive: 0x165523,
      roughness: 0.28,
      metalness: 0.18
    });

    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.42, 40, 24), coreMat);
    sphere.name = "sphere";
    group.add(sphere);

    const wide = new THREE.Mesh(
      new THREE.CylinderGeometry(0.31, 0.31, 1.96, 36, 1, false),
      wideMat
    );
    wide.rotation.z = Math.PI / 2;
    wide.visible = false;
    wide.name = "horizontal";
    group.add(wide);

    const tall = new THREE.Mesh(
      new THREE.CylinderGeometry(0.31, 0.31, 1.96, 36, 1, false),
      tallMat
    );
    tall.visible = false;
    tall.name = "vertical";
    group.add(tall);

    const glow = new THREE.Mesh(
      new THREE.TorusGeometry(0.58, 0.018, 8, 72),
      new THREE.MeshBasicMaterial({
        color: 0x4bd6e7,
        transparent: true,
        opacity: 0.46
      })
    );
    glow.position.z = -0.03;
    group.add(glow);

    return { group, sphere, wide, tall, glow };
  }

  function setGromovPose(pose, duration = 0) {
    if (!gromovCharacterEl) return;

    const nextPose = characterSources[pose] ? pose : "idle";
    gromovCharacterEl.src = characterSources[nextPose];
    if (nextPose === "nod") {
      gromovCharacterEl.dataset.pose = "idle";
      void gromovCharacterEl.offsetWidth;
    }
    gromovCharacterEl.dataset.pose = nextPose;
    window.clearTimeout(gromovResetTimer);
    gromovResetTimer = 0;

    if (nextPose !== "idle" && duration > 0) {
      gromovResetTimer = window.setTimeout(() => {
        setGromovPose("idle");
      }, duration);
    }
  }

  function showHardcoreRules() {
    activeMode = "hardcore";
    syncModeUi();
    startScreen.classList.remove("active");
    endScreen.classList.remove("active");
    if (hardcoreRulesScreen) {
      hardcoreRulesScreen.classList.add("active");
    }
  }

  function startGame(mode = activeMode) {
    stopAudioNodes();
    clearSceneObjects();

    activeMode = modeConfigs[mode] ? mode : "normal";
    notes = buildNotes(activeMode);
    prewarmNotes(notes);
    trackLength = getTrackLength(getModeConfig().chart);
    state = "playing";
    lives = 3;
    score = 0;
    combo = 0;
    formMode = "sphere";
    formUntil = 0;
    shakeAmount = 0;
    pausedSongTime = 0;
    feedbackEl.className = "feedback";
    feedbackEl.textContent = "";
    nextFormulaNoteId = null;
    setGromovPose("idle");
    syncModeUi();
    startScreen.classList.remove("active");
    if (hardcoreRulesScreen) {
      hardcoreRulesScreen.classList.remove("active");
    }
    endScreen.classList.remove("active");
    updateHud();

    ensureAudio();
    audioStartAt = audioCtx.currentTime + START_LEAD;
    scheduleMusic(audioStartAt);
    perfStartAt = performance.now() + Math.max(0, (audioStartAt - audioCtx.currentTime) * 1000);
    updateNextFormula(false, 0);
  }

  function returnToMainMenu() {
    stopAudioNodes();
    clearSceneObjects();

    activeMode = "normal";
    notes = buildNotes(activeMode);
    trackLength = getTrackLength(getModeConfig().chart);
    state = "idle";
    lives = 3;
    score = 0;
    combo = 0;
    formMode = "sphere";
    formUntil = 0;
    shakeAmount = 0;
    pausedSongTime = 0;
    nextFormulaNoteId = null;
    feedbackEl.className = "feedback";
    feedbackEl.textContent = "";
    progressEl.style.width = "0%";
    player.sphere.visible = true;
    player.wide.visible = false;
    player.tall.visible = false;
    player.glow.material.opacity = 0.42;
    setGromovPose("idle");
    updateNextFormula(true);
    updateHud();
    syncModeUi();
    syncMobilePauseButton();

    endScreen.classList.remove("active");
    if (hardcoreRulesScreen) {
      hardcoreRulesScreen.classList.remove("active");
    }
    startScreen.classList.add("active");
  }

  function clearSceneObjects() {
    for (const wall of activeWalls.splice(0)) {
      if (wall.group) scene.remove(wall.group);
    }
    for (const cloud of debrisClouds.splice(0)) {
      scene.remove(cloud.group);
    }
    for (const cloud of sparkClouds.splice(0)) {
      scene.remove(cloud.group);
    }
  }

  function ensureAudio() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx) {
      audioCtx = new AudioContext();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.82;
      masterGain.connect(audioCtx.destination);
    }
    if (!hatBuffer) hatBuffer = makeNoiseBuffer(0.05);
    if (!snareBuffer) snareBuffer = makeNoiseBuffer(0.18);
    if (audioCtx.state === "suspended") {
      const resumeAttempt = audioCtx.resume();
      if (resumeAttempt && typeof resumeAttempt.catch === "function") {
        resumeAttempt.catch(() => {});
      }
    }
  }

  function makeNoiseBuffer(seconds) {
    const bufferSize = Math.floor(audioCtx.sampleRate * seconds);
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    return buffer;
  }

  function scheduleMusic(startAt, fromSongTime = 0) {
    const lastBeat = notes.length ? notes[notes.length - 1].beat : 0;
    const totalBeats = lastBeat + 8;
    const fromTime = Math.max(0, fromSongTime);
    const bassNotes = [55, 55, 73.42, 65.41, 82.41, 73.42, 65.41, 73.42];
    const chordRoots = [220, 261.63, 196, 246.94];

    for (let beat = 0; beat < totalBeats; beat += 0.5) {
      const songTime = beat * BEAT;
      if (songTime < fromTime - 0.02) continue;
      const t = startAt + songTime - fromTime;
      scheduleHat(t, beat % 1 === 0 ? 0.025 : 0.014);
    }

    for (let beat = 0; beat < totalBeats; beat += 1) {
      const songTime = beat * BEAT;
      if (songTime < fromTime - 0.02) continue;
      const t = startAt + songTime - fromTime;
      if (beat % 4 === 0 || beat % 4 === 3) scheduleKick(t);
      if (beat % 4 === 2) scheduleSnare(t);
      scheduleTone(bassNotes[beat % bassNotes.length], t, BEAT * 0.58, "sawtooth", 0.075);
    }

    for (let beat = 0; beat < totalBeats; beat += 4) {
      const songTime = beat * BEAT;
      if (songTime < fromTime - 0.02) continue;
      const root = chordRoots[(beat / 4) % chordRoots.length];
      const t = startAt + songTime - fromTime;
      scheduleTone(root, t, BEAT * 3.6, "triangle", 0.035);
      scheduleTone(root * 1.25, t, BEAT * 3.6, "triangle", 0.025);
      scheduleTone(root * 1.5, t, BEAT * 3.6, "triangle", 0.025);
    }

    for (const note of notes) {
      if (note.time < fromTime - 0.02) continue;
      const t = startAt + note.time - fromTime;
      const interval = note.id % 5 === 0 ? 1.5 : note.id % 4 === 0 ? 1.25 : 1;
      scheduleTone(getNoteInfo(note).freq * interval, t, BEAT * 0.36, "square", 0.11);
      if (isBreakNote(note)) scheduleSnare(t + BEAT * 0.08, 0.35);
    }
  }

  function scheduleTone(freq, startAt, duration, type, volume) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0002), startAt + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + Math.max(duration, 0.04));
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.08);
    scheduledNodes.push(osc);
  }

  function scheduleKick(startAt) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(118, startAt);
    osc.frequency.exponentialRampToValueAtTime(42, startAt + 0.16);
    gain.gain.setValueAtTime(0.34, startAt);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.19);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(startAt);
    osc.stop(startAt + 0.22);
    scheduledNodes.push(osc);
  }

  function scheduleSnare(startAt, volume = 0.28) {
    const noise = audioCtx.createBufferSource();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();
    noise.buffer = snareBuffer;
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1650, startAt);
    gain.gain.setValueAtTime(volume, startAt);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.14);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    noise.start(startAt);
    noise.stop(startAt + 0.16);
    scheduledNodes.push(noise);
  }

  function scheduleHat(startAt, volume) {
    const noise = audioCtx.createBufferSource();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();
    noise.buffer = hatBuffer;
    filter.type = "highpass";
    filter.frequency.setValueAtTime(5400, startAt);
    gain.gain.setValueAtTime(volume, startAt);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.045);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    noise.start(startAt);
    noise.stop(startAt + 0.055);
    scheduledNodes.push(noise);
  }

  function stopAudioNodes() {
    for (const node of scheduledNodes) {
      try {
        node.stop(0);
      } catch {
        // Already stopped.
      }
    }
    scheduledNodes = [];
  }

  function togglePause() {
    if (state === "playing") {
      pausedSongTime = getSongTime();
      state = "paused";
      stopAudioNodes();
      window.clearTimeout(feedbackTimer);
      feedbackEl.textContent = "暂停";
      feedbackEl.className = "feedback show good";
      updateNextFormula(false, pausedSongTime);
      return;
    }

    if (state === "paused") {
      const resumeAt = pausedSongTime;
      const resumeDelay = 0.04;
      ensureAudio();
      audioStartAt = audioCtx.currentTime + resumeDelay;
      scheduleMusic(audioStartAt, resumeAt);
      perfStartAt = performance.now() + resumeDelay * 1000 - resumeAt * 1000;
      state = "playing";
      showFeedback("继续", "good");
    }
  }

  function isMobilePauseAvailable() {
    const touchCapable = navigator.maxTouchPoints > 0;
    const coarsePointer = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const mobileViewport = Math.min(window.innerWidth, window.innerHeight) <= 900;
    return coarsePointer || ((touchCapable || mobileUserAgent) && mobileViewport);
  }

  function syncMobilePauseButton() {
    if (!mobilePauseButton) return;
    const enabled = isMobilePauseAvailable();
    mobilePauseButton.classList.toggle("is-visible", enabled);
    mobilePauseButton.setAttribute("aria-hidden", String(!enabled));
  }

  function flashMobilePauseButton() {
    if (!mobilePauseButton) return;
    mobilePauseButton.classList.add("active");
    window.setTimeout(() => {
      mobilePauseButton.classList.remove("active");
    }, 120);
  }

  function getSongTime() {
    if (state === "paused") return pausedSongTime;
    if (state !== "playing") return 0;
    return Math.max(0, (performance.now() - perfStartAt) / 1000);
  }

  function handleAction(action) {
    if (!getModeConfig().actions.includes(action)) return;
    if (state !== "playing") return;
    triggerButton(action);
    morphPlayer(action);

    const time = getSongTime();
    const candidates = notes
      .filter((note) => note.spawned && !note.resolved)
      .map((note) => ({ note, delta: note.time - time, abs: Math.abs(note.time - time) }))
      .sort((a, b) => a.abs - b.abs);

    const candidate = candidates[0];
    if (!candidate || candidate.abs > MISS_WINDOW) {
      if (shouldShowNono(action)) {
        setGromovPose("nono", 620);
      }
      showFeedback("空拍", "miss");
      return;
    }

    if (getExpectedAction(candidate.note) !== action) {
      if (shouldShowNono(action)) {
        setGromovPose("nono", 620);
      }
      resolveNote(candidate.note, false, "错位");
      return;
    }

    if (candidate.abs <= PERFECT_WINDOW) {
      resolveNote(candidate.note, true, "Perfect");
    } else if (candidate.abs <= GOOD_WINDOW) {
      resolveNote(candidate.note, true, "Good");
    } else {
      resolveNote(candidate.note, true, "OK");
    }
  }

  function triggerButton(action) {
    const button = controlButtons.find((item) => item.dataset.action === action);
    if (!button) return;
    button.classList.add("active");
    window.setTimeout(() => button.classList.remove("active"), 120);
  }

  function morphPlayer(action) {
    formMode = action === "vertical" || action === "horizontal" ? action : "sphere";
    formUntil = performance.now() + 360;
    player.sphere.visible = formMode === "sphere";
    player.wide.visible = formMode === "horizontal";
    player.tall.visible = formMode === "vertical";

    const info = action === "circle" && activeMode === "hardcore"
      ? typeInfo.hardBreak
      : getBaseTypeInfo(action);
    player.glow.material.color.setHex(info.color);
    player.glow.material.opacity = 0.78;
  }

  function resolveNote(note, success, rating) {
    if (note.resolved) return;
    note.resolved = true;
    note.success = success;
    note.judgedAt = getSongTime();
    const info = getNoteInfo(note);

    if (success) {
      score += 1;
      combo += 1;
      showFeedback(rating, rating === "Perfect" ? "perfect" : "good");
      createSparks(0, PLAYER_Y, HIT_Z, info.color, 20);
      if (isBreakNote(note)) {
        setGromovPose("throw", 560);
        shatterWall(note);
      } else {
        if (activeMode === "hardcore" && getExpectedAction(note) === "hardPass") {
          setGromovPose("nod", 520);
        }
        passWall(note);
      }
    } else {
      lives -= 1;
      combo = 0;
      shakeAmount = 0.22;
      showFeedback(rating || "Miss", "miss");
      createSparks(0, PLAYER_Y, HIT_Z, 0xff5d6c, 28);
      if (activeMode === "hardcore") {
        setGromovPose("nono", 620);
      }
      missWall(note);
      if (lives <= 0) {
        endGame(false);
      }
    }
    updateHud();
  }

  function passWall(note) {
    if (!note.group) return;
    note.group.userData.state = "pass";
    note.group.userData.fadeStart = getSongTime();
    for (const child of note.group.children) {
      if (child.material) {
        child.material.transparent = true;
      }
    }
  }

  function missWall(note) {
    if (!note.group) return;
    note.group.userData.state = "miss";
    note.group.userData.fadeStart = getSongTime();
    for (const child of note.group.children) {
      if (child.material && child.material.color) {
        child.material.color.setHex(0xff5d6c);
        child.material.transparent = true;
      }
    }
  }

  function shatterWall(note) {
    if (!note.group) return;
    createDebris(note.group, getNoteInfo(note).color);
    scene.remove(note.group);
    note.group = null;
  }

  function endGame(completed) {
    if (state !== "playing") return;
    state = "ended";
    stopAudioNodes();
    endScreen.classList.add("active");
    resultKickerEl.textContent = completed ? "Cleared" : "Game Over";
    resultTitleEl.textContent = completed ? "关卡完成" : "游戏结束";
    resultScoreEl.textContent = `得分 ${score}`;
    updateNextFormula(true);
  }

  function updateHud() {
    scoreEl.textContent = String(score);
    comboEl.textContent = String(combo);
    livesEl.innerHTML = "";
    for (let i = 0; i < 3; i += 1) {
      const pip = document.createElement("span");
      pip.className = `life-pip${i >= lives ? " empty" : ""}`;
      livesEl.append(pip);
    }
  }

  function updateNextFormula(forceHide = false, songTime = getSongTime()) {
    if (!nextFormulaEl) return;

    const canShowFormula = state === "playing" || state === "paused";
    const nextNote = forceHide || !canShowFormula
      ? null
      : getFormulaCueNote(songTime);

    if (!nextNote) {
      if (nextFormulaNoteId !== null) {
        nextFormulaNoteId = null;
        nextFormulaEl.className = "next-formula";
        nextFormulaEl.replaceChildren();
      }
      return;
    }

    if (nextFormulaNoteId === nextNote.id) return;

    nextFormulaNoteId = nextNote.id;
    const info = getNoteInfo(nextNote);
    nextFormulaEl.className = `next-formula show ${nextNote.type}`;
    nextFormulaEl.replaceChildren(makeFormulaDom(info));
  }

  function getFormulaCueNote(songTime) {
    const cueTime = songTime + NEXT_FORMULA_ADVANCE;
    return (
      notes.find((note) => !note.resolved && note.time > cueTime) ||
      notes.find((note) => !note.resolved) ||
      null
    );
  }

  function makeFormulaDom(input) {
    const terms = input && typeof input === "object" && !Array.isArray(input)
      ? input.formulaTerms
      : input;
    const formula = document.createElement("span");
    formula.className = "formula";

    if (input && typeof input === "object" && !Array.isArray(input) && input.formulaHtml) {
      formula.className = "formula formula-plain";
      formula.innerHTML = input.formulaHtml;
      return formula;
    }

    if (typeof terms === "string") {
      formula.className = "formula formula-plain";
      formula.textContent = terms;
      return formula;
    }

    for (const term of terms) {
      if (typeof term === "string") {
        const token = document.createElement("span");
        token.className = "formula-op";
        token.textContent = term;
        formula.append(token);
      } else {
        const variable = document.createElement("span");
        variable.className = "formula-var";

        const main = document.createElement("span");
        main.className = "formula-main";
        main.textContent = term.variable;
        variable.append(main);

        if (term.sub) {
          const sub = document.createElement("span");
          sub.className = "formula-sub";
          sub.textContent = term.sub;
          variable.append(sub);
        }

        if (term.sup) {
          const sup = document.createElement("span");
          sup.className = "formula-sup";
          sup.textContent = term.sup;
          variable.append(sup);
        }

        formula.append(variable);
      }
    }

    return formula;
  }

  function showFeedback(text, tone) {
    feedbackEl.textContent = text;
    feedbackEl.className = `feedback show ${tone}`;
    window.clearTimeout(feedbackTimer);
    feedbackTimer = window.setTimeout(() => {
      feedbackEl.className = "feedback";
    }, 330);
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    const songTime = getSongTime();

    updatePlayer(now, songTime);
    updateEnvironment(dt, songTime);
    if (state === "playing") {
      spawnNotes(songTime);
      updateWalls(dt, songTime);
      updateProgress(songTime);
      updateNextFormula(false, songTime);
      if (notes.every((note) => note.resolved) && activeWalls.length === 0) {
        endGame(true);
      }
    }
    updateDebris(dt, songTime);
    updateSparks(dt, songTime);
    updateCameraShake(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  function updatePlayer(now, songTime) {
    if (performance.now() > formUntil && formMode !== "sphere") {
      formMode = "sphere";
      player.sphere.visible = true;
      player.wide.visible = false;
      player.tall.visible = false;
    }

    const beatPulse = state === "playing" ? beatWave(songTime) : 0.5 + Math.sin(now * 0.003) * 0.15;
    const scale = 1 + beatPulse * 0.06;
    player.group.scale.setScalar(scale);
    player.group.rotation.y += 0.9 * (1 / 60);
    player.glow.scale.setScalar(1.05 + beatPulse * 0.18);
    player.glow.material.opacity = THREE.MathUtils.lerp(player.glow.material.opacity, 0.42, 0.08);
  }

  function updateEnvironment(dt, songTime) {
    const ring = environment.userData.pulseRing;
    if (ring) {
      const pulse = state === "playing" ? beatWave(songTime) : 0.15;
      ring.scale.setScalar(1 + pulse * 0.32);
      ring.material.opacity = 0.32 + pulse * 0.38;
    }

    for (const child of environment.children) {
      if (child.userData && child.userData.speed) {
        child.position.z += child.userData.speed * dt;
        if (child.position.z > 5) child.position.z = -38;
      }
    }
  }

  function beatWave(songTime) {
    const phase = (songTime / BEAT) % 1;
    return Math.pow(1 - phase, 3);
  }

  function spawnNotes(songTime) {
    for (const note of notes) {
      const travelTime = note.travelTime || TRAVEL_TIME;
      if (!note.spawned && songTime >= note.time - travelTime) {
        note.spawned = true;
        const group = createWall(note);
        note.group = group;
        activeWalls.push({ note, group });
        scene.add(group);
      }
    }
  }

  function updateWalls(dt, songTime) {
    for (let i = activeWalls.length - 1; i >= 0; i -= 1) {
      const wall = activeWalls[i];
      const { note, group } = wall;
      if (!group) {
        activeWalls.splice(i, 1);
        continue;
      }

      if (!note.resolved) {
        const travelTime = note.travelTime || TRAVEL_TIME;
        const phase = THREE.MathUtils.clamp(
          (songTime - (note.time - travelTime)) / travelTime,
          0,
          1.18
        );
        group.position.z = THREE.MathUtils.lerp(SPAWN_Z, HIT_Z, phase);
        group.scale.setScalar((0.96 + phase * 0.04) * (group.userData.baseScale || 1));
        group.rotation.z = Math.sin((note.id + songTime) * 1.6) * 0.012;

        const abs = Math.abs(note.time - songTime);
        const glow = abs < 0.45 ? 1 - abs / 0.45 : 0;
        setWallGlow(group, glow);

        if (songTime > note.time + MISS_WINDOW) {
          resolveNote(note, false, "Miss");
        }
      } else {
        const age = songTime - note.judgedAt;
        const stateName = group.userData.state;
        const fade = THREE.MathUtils.clamp(age / (stateName === "miss" ? 0.45 : 0.72), 0, 1);
        if (stateName === "pass") {
          group.position.z = THREE.MathUtils.lerp(HIT_Z, EXIT_Z, fade);
          group.rotation.z += dt * 0.26;
        }
        fadeWall(group, 1 - fade);
        if (fade >= 1) {
          scene.remove(group);
          note.group = null;
          activeWalls.splice(i, 1);
        }
      }
    }
  }

  function setWallGlow(group, amount) {
    const mesh = group.userData.mesh;
    if (mesh && mesh.material) {
      mesh.material.emissiveIntensity = 0.2 + amount * 1.25;
    }
    const edge = group.userData.edge;
    if (edge && edge.material) {
      edge.material.opacity = 0.48 + amount * 0.42;
    }
  }

  function fadeWall(group, opacity) {
    for (const child of group.children) {
      if (child.material) {
        child.material.opacity = Math.max(0, opacity);
      }
    }
  }

  function createWall(note) {
    const info = getNoteInfo(note);
    const geometryType = note.geometryType || info.geometryType || note.type;
    const group = new THREE.Group();
    group.position.set(0, PLAYER_Y, SPAWN_Z);
    group.userData.state = "approach";
    group.userData.baseScale = note.modelScale || info.modelScale || 1;

    const mesh = new THREE.Mesh(getWallGeometry(geometryType), makeWallMaterial(info));
    mesh.renderOrder = 1;
    group.add(mesh);

    const edge = new THREE.LineSegments(
      getWallEdgeGeometry(geometryType),
      new THREE.LineBasicMaterial({
        color: info.color,
        transparent: true,
        opacity: 0.5
      })
    );
    group.add(edge);

    const formula = makeFormulaLabel(note);
    formula.position.set(0, WALL_H / 2 - 0.5, WALL_D / 2 + 0.035);
    group.add(formula);

    group.userData.mesh = mesh;
    group.userData.edge = edge;
    return group;
  }

  function getWallGeometry(type) {
    if (wallGeometryCache.has(type)) return wallGeometryCache.get(type);
    const shape = new THREE.Shape();
    shape.moveTo(-WALL_W / 2, -WALL_H / 2);
    shape.lineTo(WALL_W / 2, -WALL_H / 2);
    shape.lineTo(WALL_W / 2, WALL_H / 2);
    shape.lineTo(-WALL_W / 2, WALL_H / 2);
    shape.lineTo(-WALL_W / 2, -WALL_H / 2);

    if (type === "horizontal") {
      shape.holes.push(makeRectHole(3.35, 0.92));
    } else if (type === "vertical") {
      shape.holes.push(makeRectHole(0.94, 2.65));
    } else {
      const hole = new THREE.Path();
      const radius = type === "hardPass" ? 0.58 : 0.68;
      hole.absarc(0, 0, radius, 0, Math.PI * 2, true);
      shape.holes.push(hole);
    }

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: WALL_D,
      bevelEnabled: false,
      steps: 1
    });
    geometry.translate(0, 0, -WALL_D / 2);
    wallGeometryCache.set(type, geometry);
    return geometry;
  }

  function getWallEdgeGeometry(type) {
    if (edgeGeometryCache.has(type)) return edgeGeometryCache.get(type);
    const geometry = new THREE.EdgesGeometry(getWallGeometry(type), 18);
    edgeGeometryCache.set(type, geometry);
    return geometry;
  }

  function makeRectHole(width, height) {
    const path = new THREE.Path();
    const x = width / 2;
    const y = height / 2;
    path.moveTo(-x, -y);
    path.lineTo(-x, y);
    path.lineTo(x, y);
    path.lineTo(x, -y);
    path.lineTo(-x, -y);
    return path;
  }

  function makeWallMaterial(info) {
    return new THREE.MeshStandardMaterial({
      color: info.color,
      emissive: info.emissive,
      emissiveIntensity: 0.35,
      roughness: 0.32,
      metalness: 0.18,
      transparent: true,
      opacity: 0.98,
      side: THREE.DoubleSide
    });
  }

  function makeFormulaLabel(noteOrType) {
    const info = getNoteInfo(noteOrType);
    const material = new THREE.SpriteMaterial({
      map: getFormulaTexture(noteOrType),
      color: 0xffffff,
      transparent: true,
      opacity: 0.96,
      depthTest: false,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3.68, 0.72, 1);
    sprite.renderOrder = 4;
    sprite.userData.formulaTerms = info.formulaTerms;
    return sprite;
  }

  function getFormulaTexture(noteOrType) {
    const key = typeof noteOrType === "string"
      ? noteOrType
      : noteOrType.formulaKey || noteOrType.type;
    if (formulaTextureCache.has(key)) return formulaTextureCache.get(key);

    const info = getNoteInfo(noteOrType);
    const color = `#${info.color.toString(16).padStart(6, "0")}`;
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(5, 8, 10, 0.72)";
    roundRect(ctx, 26, 30, canvas.width - 52, canvas.height - 60, 30);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    roundRect(ctx, 26, 30, canvas.width - 52, canvas.height - 60, 30);
    ctx.stroke();

    ctx.shadowColor = color;
    ctx.shadowBlur = 27;
    ctx.fillStyle = "#f8fbff";
    drawCompiledFormula(ctx, info.formulaText || info.formulaTerms, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    texture.needsUpdate = true;
    formulaTextureCache.set(key, texture);
    return texture;
  }

  function drawCompiledFormula(ctx, terms, centerX, centerY) {
    if (typeof terms === "string") {
      drawPlainFormula(ctx, terms, centerX, centerY);
      return;
    }

    const width = measureCompiledFormula(ctx, terms);
    let x = centerX - width / 2;
    const baseline = centerY + 27;

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    for (const term of terms) {
      if (typeof term === "string") {
        x = drawFormulaToken(ctx, term, x, baseline);
      } else {
        x = drawFormulaTerm(ctx, term, x, baseline);
      }
    }
  }

  function drawPlainFormula(ctx, text, centerX, centerY) {
    const maxWidth = 870;
    let size = 86;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    do {
      ctx.font = `italic 800 ${size}px 'Times New Roman', Georgia, serif`;
      if (ctx.measureText(text).width <= maxWidth || size <= 36) break;
      size -= 4;
    } while (size > 36);

    ctx.fillText(text, centerX, centerY + 8);
  }

  function measureCompiledFormula(ctx, terms) {
    return terms.reduce((width, term) => {
      if (typeof term === "string") return width + measureFormulaToken(ctx, term);
      return width + measureFormulaTerm(ctx, term);
    }, 0);
  }

  function drawFormulaTerm(ctx, term, x, baseline) {
    setFormulaMainFont(ctx);
    ctx.fillText(term.variable, x, baseline);
    const variableWidth = ctx.measureText(term.variable).width;
    const scriptX = x + variableWidth + 5;

    setFormulaScriptFont(ctx);
    if (term.sup) ctx.fillText(term.sup, scriptX, baseline - 54);
    if (term.sub) ctx.fillText(term.sub, scriptX, baseline + 27);

    return x + measureFormulaTerm(ctx, term);
  }

  function measureFormulaTerm(ctx, term) {
    setFormulaMainFont(ctx);
    const variableWidth = ctx.measureText(term.variable).width;
    setFormulaScriptFont(ctx);
    const scriptWidth = Math.max(
      term.sub ? ctx.measureText(term.sub).width : 0,
      term.sup ? ctx.measureText(term.sup).width : 0
    );
    return variableWidth + scriptWidth + 24;
  }

  function drawFormulaToken(ctx, token, x, baseline) {
    if (token === "+" || token === "<") {
      setFormulaOperatorFont(ctx);
      ctx.fillText(token, x + 21, baseline - 6);
    } else {
      setFormulaNumberFont(ctx);
      ctx.fillText(token, x + 6, baseline);
    }
    return x + measureFormulaToken(ctx, token);
  }

  function measureFormulaToken(ctx, token) {
    if (token === "+" || token === "<") {
      setFormulaOperatorFont(ctx);
      return ctx.measureText(token).width + 45;
    }
    setFormulaNumberFont(ctx);
    return ctx.measureText(token).width + 27;
  }

  function setFormulaMainFont(ctx) {
    ctx.font = "italic 700 96px 'Times New Roman', Georgia, serif";
  }

  function setFormulaScriptFont(ctx) {
    ctx.font = "700 45px 'Times New Roman', Georgia, serif";
  }

  function setFormulaOperatorFont(ctx) {
    ctx.font = "700 72px 'Times New Roman', Georgia, serif";
  }

  function setFormulaNumberFont(ctx) {
    ctx.font = "700 87px 'Times New Roman', Georgia, serif";
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function createDebris(sourceGroup, color) {
    const group = new THREE.Group();
    group.position.copy(sourceGroup.position);
    group.rotation.copy(sourceGroup.rotation);
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.35,
      roughness: 0.5,
      transparent: true,
      opacity: 0.95
    });
    const pieces = [];
    for (let i = 0; i < 28; i += 1) {
      const size = 0.12 + Math.random() * 0.2;
      const piece = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), material);
      piece.position.set(
        (Math.random() - 0.5) * WALL_W * 0.82,
        (Math.random() - 0.5) * WALL_H * 0.82,
        (Math.random() - 0.5) * 0.34
      );
      piece.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      group.add(piece);
      pieces.push({
        mesh: piece,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 4.2,
          (Math.random() - 0.15) * 3.6,
          2.2 + Math.random() * 4.2
        ),
        spin: new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8
        )
      });
    }
    scene.add(group);
    debrisClouds.push({ group, pieces, material, age: 0 });
  }

  function updateDebris(dt) {
    for (let i = debrisClouds.length - 1; i >= 0; i -= 1) {
      const cloud = debrisClouds[i];
      cloud.age += dt;
      for (const piece of cloud.pieces) {
        piece.velocity.y -= 3.4 * dt;
        piece.mesh.position.addScaledVector(piece.velocity, dt);
        piece.mesh.rotation.x += piece.spin.x * dt;
        piece.mesh.rotation.y += piece.spin.y * dt;
        piece.mesh.rotation.z += piece.spin.z * dt;
      }
      cloud.material.opacity = THREE.MathUtils.clamp(1 - cloud.age / 0.85, 0, 1);
      if (cloud.age > 0.95) {
        scene.remove(cloud.group);
        debrisClouds.splice(i, 1);
      }
    }
  }

  function createSparks(x, y, z, color, count) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1
    });
    const sparks = [];
    for (let i = 0; i < count; i += 1) {
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.025 + Math.random() * 0.025, 8, 6), material);
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.6 + Math.random() * 3.1;
      spark.position.set(0, 0, 0);
      sparks.push({
        mesh: spark,
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          (Math.random() - 0.2) * speed
        )
      });
      group.add(spark);
    }
    scene.add(group);
    sparkClouds.push({ group, sparks, material, age: 0 });
  }

  function updateSparks(dt) {
    for (let i = sparkClouds.length - 1; i >= 0; i -= 1) {
      const cloud = sparkClouds[i];
      cloud.age += dt;
      for (const spark of cloud.sparks) {
        spark.mesh.position.addScaledVector(spark.velocity, dt);
        spark.velocity.multiplyScalar(0.96);
      }
      cloud.material.opacity = THREE.MathUtils.clamp(1 - cloud.age / 0.34, 0, 1);
      if (cloud.age > 0.38) {
        scene.remove(cloud.group);
        sparkClouds.splice(i, 1);
      }
    }
  }

  function updateCameraShake(dt) {
    if (shakeAmount <= 0) {
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, 0, 0.18);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, 1.65, 0.18);
      camera.lookAt(0, PLAYER_Y - 0.08, -18);
      return;
    }
    shakeAmount = Math.max(0, shakeAmount - dt);
    const strength = shakeAmount * 0.18;
    camera.position.x = (Math.random() - 0.5) * strength;
    camera.position.y = 1.65 + (Math.random() - 0.5) * strength;
    camera.lookAt(0, PLAYER_Y - 0.08, -18);
  }

  function updateProgress(songTime) {
    const pct = THREE.MathUtils.clamp((songTime / trackLength) * 100, 0, 100);
    progressEl.style.width = `${pct}%`;
  }

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(getRendererPixelRatio());
    renderer.setSize(width, height);
  }

  function getRendererPixelRatio() {
    return Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
  }
})();
