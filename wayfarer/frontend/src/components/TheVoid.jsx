import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Mission choreography
 * --------------------
 * The station sits at the origin. Every research round owns one planet on its
 * own orbit ring. When a round begins the explorer craft undocks from the
 * station, flies out to that round's planet and lands on it. While landed it
 * scans the round's sources one by one (each source becomes a small node in
 * orbit around the planet, linked by a scan beam). Once the round's scans are
 * done the craft lifts off and flies home to dock again, ready for the next
 * round.
 *
 *   docked -> outbound -> landed (scan, scan, scan...) -> inbound -> docked
 */

const MAX_PLANETS = 5;
const ORBIT_RADII = [7.0, 10.8, 14.6, 18.4, 22.2];
const PLANET_R = 0.8;
const NODE_RING_R = 1.65;
const HOVER_OFFSET = 0.34;
const TRAVEL_SECONDS = 3.2;
const SCAN_SECONDS = 0.85;
const TRAIL_POINTS = 48;

const DOCK_OFFSET = new THREE.Vector3(2.6, 0.9, 2.4);

const NODE_IDLE = 0x475569;
const NODE_OK = 0x22d3ee;
const NODE_DEAD = 0xef4444;

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Quadratic bezier arc between two points, lifted at the midpoint so the craft
// sweeps rather than sliding along a straight line.
function arcPoint(a, b, t, lift, out) {
  const mt = 1 - t;
  out.set(0, 0, 0);
  out.addScaledVector(a, mt * mt);
  out.x += 2 * mt * t * ((a.x + b.x) * 0.5);
  out.y += 2 * mt * t * ((a.y + b.y) * 0.5 + lift);
  out.z += 2 * mt * t * ((a.z + b.z) * 0.5);
  out.addScaledVector(b, t * t);
  return out;
}

export function TheVoid({ currentRound, maxRounds, sources, isRunning, activeNode, onMission }) {
  const mountRef = useRef(null);
  const containerRef = useRef(null);

  // Props mirrored into a ref so the persistent render loop can read them.
  const propsRef = useRef({ currentRound, maxRounds, sources, isRunning, activeNode });
  useEffect(() => {
    propsRef.current = { currentRound, maxRounds, sources, isRunning, activeNode };
  }, [currentRound, maxRounds, sources, isRunning, activeNode]);

  const onMissionRef = useRef(onMission);
  useEffect(() => {
    onMissionRef.current = onMission;
  }, [onMission]);

  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const planetsRef = useRef([]);
  const goldLinesRef = useRef([]);

  // Mission state machine. Lives in a ref: the render loop drives it, the prop
  // sync effect only pushes intent into it.
  const missionRef = useRef({
    phase: 'docked',
    round: 0,
    t: 0,
    landingNormal: new THREE.Vector3(0, 1, 0),
    pendingRounds: [],
    roundClosed: false,
    scanQueue: [],
    activeScan: null,
    // How many sector planets have been charted so far. Planets materialise one
    // per round as the run progresses rather than all appearing up front.
    revealed: 0,
    handledRounds: new Set()
  });

  const nodesMapRef = useRef(new Map()); // source id -> node record
  const processedSourcesRef = useRef(new Set());

  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current = {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((e.clientY - rect.top) / rect.height) * 2 + 1
      };
    };
    const container = containerRef.current;
    if (container) container.addEventListener('mousemove', handleMouseMove);
    return () => {
      if (container) container.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // ---------------------------------------------------------------- scene ---
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth || window.innerWidth;
    const height = mountRef.current.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 9, 30);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.6);
    dirLight.position.set(5, 12, 10);
    scene.add(dirLight);

    const stationLight = new THREE.PointLight(0x6366f1, 2.4, 60);
    scene.add(stationLight);

    // --- Deep star field ---
    const starFieldGeo = new THREE.BufferGeometry();
    const starFieldCount = 520;
    const starFieldPositions = new Float32Array(starFieldCount * 3);
    const starFieldColors = new Float32Array(starFieldCount * 3);
    for (let i = 0; i < starFieldCount; i++) {
      const theta = Math.random() * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * Math.random() - 1.0);
      const r = 34 + Math.random() * 28;
      starFieldPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starFieldPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starFieldPositions[i * 3 + 2] = r * Math.cos(phi);
      starFieldColors[i * 3] = 0.2 + Math.random() * 0.3;
      starFieldColors[i * 3 + 1] = 0.3 + Math.random() * 0.4;
      starFieldColors[i * 3 + 2] = 0.7 + Math.random() * 0.3;
    }
    starFieldGeo.setAttribute('position', new THREE.BufferAttribute(starFieldPositions, 3));
    starFieldGeo.setAttribute('color', new THREE.BufferAttribute(starFieldColors, 3));
    const starFieldMat = new THREE.PointsMaterial({
      size: 0.14,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    const starField = new THREE.Points(starFieldGeo, starFieldMat);
    scene.add(starField);

    // --- Nebula haze around the station ---
    const nebulaCount = 220;
    const nebulaPositions = new Float32Array(nebulaCount * 3);
    const nebulaSpeeds = [];
    const nebulaRadii = [];
    for (let i = 0; i < nebulaCount; i++) {
      const radius = 3 + Math.random() * 12;
      const angle = Math.random() * Math.PI * 2;
      nebulaRadii.push(radius);
      nebulaSpeeds.push(0.02 + Math.random() * 0.03);
      nebulaPositions[i * 3] = radius * Math.cos(angle);
      nebulaPositions[i * 3 + 1] = (Math.random() - 0.5) * 1.5;
      nebulaPositions[i * 3 + 2] = radius * Math.sin(angle);
    }
    const nebulaGeo = new THREE.BufferGeometry();
    nebulaGeo.setAttribute('position', new THREE.BufferAttribute(nebulaPositions, 3));
    // Kept dim and fine-grained: at 0.18/0.45 these read as scattered confetti
    // across the whole scene rather than haze.
    const nebulaMat = new THREE.PointsMaterial({
      color: 0x6366f1,
      size: 0.11,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending
    });
    const nebulaParticles = new THREE.Points(nebulaGeo, nebulaMat);
    scene.add(nebulaParticles);

    // ------------------------------------------------------------ station ---
    const station = new THREE.Group();
    const metalMat = new THREE.MeshPhongMaterial({ color: 0xdddde5, shininess: 80, specular: 0xffffff });

    const centralModule = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 2.2, 12), metalMat);
    centralModule.rotation.x = Math.PI / 2;
    station.add(centralModule);

    const crossModuleGeo = new THREE.CylinderGeometry(0.28, 0.28, 1.8, 10);
    const crossModuleX = new THREE.Mesh(crossModuleGeo, metalMat);
    crossModuleX.rotation.z = Math.PI / 2;
    station.add(crossModuleX);
    station.add(new THREE.Mesh(crossModuleGeo, metalMat));

    const trussMat = new THREE.MeshPhongMaterial({ color: 0x475569 });
    const truss = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.2, 8), trussMat);
    truss.rotation.z = Math.PI / 2;
    station.add(truss);

    const panelGeo = new THREE.BoxGeometry(0.8, 0.02, 2.2);
    const panelMat = new THREE.MeshPhongMaterial({ color: 0x1e3a8a, shininess: 90 });
    [[-1.8, 0.6], [-1.8, -0.6], [1.8, 0.6], [1.8, -0.6]].forEach(([x, z]) => {
      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.position.set(x, 0, z);
      station.add(panel);
    });

    // Docking bay beacon — pulses while the craft is home, dims once it leaves.
    const dockBeaconMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 });
    const dockBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), dockBeaconMat);
    dockBeacon.position.copy(DOCK_OFFSET).multiplyScalar(0.62);
    station.add(dockBeacon);

    // Docking collar. Kept small and fixed to the station's dock axis — when it
    // was large and camera-facing it read as a stray hoop floating in space
    // rather than part of the station.
    const dockRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    });
    const dockRing = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.42, 24), dockRingMat);
    dockRing.position.copy(DOCK_OFFSET).multiplyScalar(0.62);
    dockRing.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      DOCK_OFFSET.clone().normalize()
    );
    station.add(dockRing);

    // Energy aura around the station
    const auraGeo = new THREE.BufferGeometry();
    const auraCount = 220;
    const auraPositions = new Float32Array(auraCount * 3);
    for (let i = 0; i < auraCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const dist = 2.0 + Math.random() * 1.6;
      auraPositions[i * 3] = dist * Math.sin(phi) * Math.cos(theta);
      auraPositions[i * 3 + 1] = dist * Math.sin(phi) * Math.sin(theta);
      auraPositions[i * 3 + 2] = dist * Math.cos(phi);
    }
    auraGeo.setAttribute('position', new THREE.BufferAttribute(auraPositions, 3));
    const auraMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.1,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    const aura = new THREE.Points(auraGeo, auraMat);
    scene.add(aura);

    scene.add(station);

    // ------------------------------------------------------- explorer ship ---
    // Built nose-forward along +Z so Object3D.lookAt() orients it correctly.
    const ship = new THREE.Group();
    const hullMat = new THREE.MeshPhongMaterial({ color: 0xe2e8f0, shininess: 110, specular: 0xffffff });
    const accentMat = new THREE.MeshPhongMaterial({ color: 0x0ea5e9, shininess: 90, emissive: 0x0c4a6e });

    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.8, 12), hullMat);
    fuselage.rotation.x = Math.PI / 2;
    ship.add(fuselage);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.42, 12), hullMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 0.6;
    ship.add(nose);

    const cockpit = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 10, 10),
      new THREE.MeshPhongMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.85, emissive: 0x0e7490 })
    );
    cockpit.position.set(0, 0.09, 0.24);
    ship.add(cockpit);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.035, 0.3), accentMat);
    wing.position.z = -0.1;
    ship.add(wing);

    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.24), accentMat);
    fin.position.set(0, 0.16, -0.32);
    ship.add(fin);

    // Landing gear — only extended while landed.
    const legMat = new THREE.MeshPhongMaterial({ color: 0x94a3b8 });
    const legs = new THREE.Group();
    [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].forEach((angle) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.34, 6), legMat);
      leg.position.set(Math.cos(angle) * 0.19, -0.19, Math.sin(angle) * 0.19);
      leg.rotation.z = -Math.cos(angle) * 0.4;
      leg.rotation.x = Math.sin(angle) * 0.4;
      legs.add(leg);
    });
    legs.visible = false;
    ship.add(legs);

    const thrusterMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.9 });
    const thruster = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 10), thrusterMat);
    thruster.rotation.x = Math.PI / 2;
    thruster.position.z = -0.7;
    ship.add(thruster);

    ship.scale.setScalar(0.85);
    scene.add(ship);

    // Engine trail ribbon
    const trailPositions = new Float32Array(TRAIL_POINTS * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending
    });
    const trail = new THREE.Line(trailGeo, trailMat);
    trail.frustumCulled = false;
    scene.add(trail);
    let trailFilled = false;

    // --------------------------------------------------- orbits & planets ---
    const ringsGroup = new THREE.Group();
    scene.add(ringsGroup);

    const planetsGroup = new THREE.Group();
    scene.add(planetsGroup);

    const planets = [];
    for (let i = 0; i < MAX_PLANETS; i++) {
      const radius = ORBIT_RADII[i];

      // Dotted orbit ring
      const ringCount = 220;
      const ringPositions = new Float32Array(ringCount * 3);
      for (let j = 0; j < ringCount; j++) {
        const angle = (j / ringCount) * Math.PI * 2;
        ringPositions[j * 3] = radius * Math.cos(angle);
        ringPositions[j * 3 + 1] = 0;
        ringPositions[j * 3 + 2] = radius * Math.sin(angle);
      }
      const ringGeo = new THREE.BufferGeometry();
      ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3));
      const ringMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.05,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending
      });
      const ringPoints = new THREE.Points(ringGeo, ringMat);
      ringsGroup.add(ringPoints);

      // Planet pivot sits on the ring; children inherit the slow orbit spin.
      const angle = i * (Math.PI * 0.72) + 0.5;
      const pivot = new THREE.Group();
      pivot.position.set(radius * Math.cos(angle), Math.sin(i) * 0.3, radius * Math.sin(angle));
      planetsGroup.add(pivot);

      const planetMat = new THREE.MeshPhongMaterial({
        color: 0x3b82f6,
        emissive: 0x1d4ed8,
        emissiveIntensity: 0.25,
        shininess: 40
      });
      const planetMesh = new THREE.Mesh(new THREE.SphereGeometry(PLANET_R, 24, 24), planetMat);
      pivot.add(planetMesh);

      const glowMat = new THREE.MeshBasicMaterial({
        color: 0x3b82f6,
        transparent: true,
        opacity: 0.22,
        wireframe: true
      });
      const glowMesh = new THREE.Mesh(new THREE.SphereGeometry(PLANET_R * 1.42, 12, 12), glowMat);
      pivot.add(glowMesh);

      // Survey ring that lights up while the craft is landed here.
      const surveyMat = new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide
      });
      const surveyRing = new THREE.Mesh(new THREE.RingGeometry(PLANET_R * 1.7, PLANET_R * 1.9, 40), surveyMat);
      surveyRing.rotation.x = -Math.PI / 2;
      pivot.add(surveyRing);

      // Source nodes orbit inside their own counter-rotating group.
      const nodesGroup = new THREE.Group();
      pivot.add(nodesGroup);

      planets.push({
        pivot,
        mesh: planetMesh,
        glowMesh,
        surveyRing,
        nodesGroup,
        ringPoints,
        round: i + 1,
        nodeCount: 0,
        spawnT: 0 // 0..1 reveal progress, driven in the render loop
      });
    }
    planetsRef.current = planets;

    // ------------------------------------------------------- scan visuals ---
    const scanBeamMat = new THREE.LineBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    const scanBeamGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const scanBeam = new THREE.Line(scanBeamGeo, scanBeamMat);
    scanBeam.frustumCulled = false;
    scanBeam.visible = false;
    scene.add(scanBeam);

    const packetMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.95 });
    const packet = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), packetMat);
    packet.visible = false;
    scene.add(packet);

    // ---------------------------------------------------------- main loop ---
    const clock = new THREE.Clock();
    let time = 0;
    let animationFrameId;

    // Scratch vectors reused every frame to avoid per-frame allocation.
    const vDock = new THREE.Vector3();
    const vTarget = new THREE.Vector3();
    const vPos = new THREE.Vector3();
    const vPrev = new THREE.Vector3();
    const vNormal = new THREE.Vector3();
    const vUp = new THREE.Vector3();
    const vRight = new THREE.Vector3();
    const vNose = new THREE.Vector3();
    const vNodeWorld = new THREE.Vector3();
    const qPlanet = new THREE.Quaternion();
    const mBasis = new THREE.Matrix4();
    const lookTarget = new THREE.Vector3(0, 0, 0);
    const desiredLook = new THREE.Vector3();
    const NEBULA_BASE = new THREE.Color(0x6366f1);
    const moodColor = new THREE.Color();

    const setPhase = (next) => {
      const m = missionRef.current;
      if (m.phase === next) return;
      m.phase = next;
      if (onMissionRef.current) onMissionRef.current({ phase: next, round: m.round });
    };

    // Dock pad rides the station's spin, so the parked craft orbits with it.
    const dockWorldPos = (out) => station.localToWorld(out.copy(DOCK_OFFSET));

    const landingWorldPos = (planet, normal, out) => {
      planet.pivot.getWorldPosition(out);
      planet.pivot.getWorldQuaternion(qPlanet);
      vNormal.copy(normal).applyQuaternion(qPlanet);
      return out.addScaledVector(vNormal, PLANET_R + HOVER_OFFSET);
    };

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      time += dt;

      const {
        activeNode: rawNode,
        sources: currentSources,
        maxRounds: rounds,
        isRunning: running
      } = propsRef.current;
      // The backend labels log entries "Planner"/"Researcher"/... — normalise so
      // the comparisons below can't silently miss on casing.
      const node = (rawNode || '').toLowerCase();
      const m = missionRef.current;

      // Never more planets than the run has rounds. During a run only the
      // sectors charted so far are visible; idle, the whole system is shown.
      const shown = Math.min(Math.max(rounds || 3, 1), MAX_PLANETS);
      const revealCount = running ? Math.min(m.revealed, shown) : shown;

      planets.forEach((p, i) => {
        // Ease each planet in as its round opens instead of popping it on.
        const target = i < revealCount ? 1 : 0;
        p.spawnT += (target - p.spawnT) * Math.min(1, dt * 3.2);
        const s = p.spawnT;
        const visible = s > 0.012;
        p.pivot.visible = visible;
        p.pivot.scale.setScalar(Math.max(0.001, s));
        p.ringPoints.visible = visible;
        p.ringPoints.material.opacity = 0.12 * s;
      });

      // -- station idle motion --
      station.position.y = Math.sin(time * 0.8) * 0.18;
      station.rotation.y += dt * 0.12;
      station.rotation.z = Math.sin(time * 0.5) * 0.05;
      stationLight.position.copy(station.position);
      aura.position.copy(station.position);
      aura.rotation.y -= dt * 0.15;

      // Collar is lit while the craft is home and only faintly pulsing while it
      // is away (it used to be the other way round, so an empty pad glowed
      // brightest). No billboarding — it stays fixed to the station's dock axis.
      const beaconPulse = 0.5 + Math.sin(time * 3.2) * 0.35;
      dockBeaconMat.opacity = m.phase === 'docked' ? 0.95 : beaconPulse * 0.45;
      dockRingMat.opacity = m.phase === 'docked' ? 0.4 : 0.08 + beaconPulse * 0.08;

      // Mood colour follows the agent currently holding the graph. The station's
      // own aura takes it fully; the nebula only leans that way, otherwise the
      // critic's amber floods the entire scene.
      let mood = 0x6366f1;
      if (node === 'critic') mood = 0xf59e0b;
      else if (node === 'writer') mood = 0x10b981;
      else if (node === 'researcher') mood = 0x06b6d4;
      moodColor.setHex(mood);
      auraMat.color.copy(moodColor);
      nebulaMat.color.copy(NEBULA_BASE).lerp(moodColor, 0.35);
      stationLight.color.copy(moodColor);

      planetsGroup.rotation.y = time * 0.015;
      starField.rotation.y = -time * 0.002;

      planets.forEach((p, i) => {
        p.mesh.rotation.y += dt * 0.25;
        p.nodesGroup.rotation.y -= dt * 0.18;
        const isTarget = m.round === i + 1 && (m.phase === 'landed' || m.phase === 'outbound');
        const targetOpacity = isTarget ? 0.35 + Math.sin(time * 4) * 0.2 : 0;
        p.surveyRing.material.opacity += (targetOpacity - p.surveyRing.material.opacity) * 0.1;
        p.glowMesh.material.opacity = isTarget ? 0.34 + Math.sin(time * 3) * 0.08 : 0.22;
      });

      // Nebula swirl
      const nebulaPosAttr = nebulaParticles.geometry.attributes.position;
      for (let i = 0; i < nebulaCount; i++) {
        const r = nebulaRadii[i];
        const a = time * nebulaSpeeds[i] * 6.0 + i * 0.1;
        nebulaPosAttr.setX(i, r * Math.cos(a));
        nebulaPosAttr.setZ(i, r * Math.sin(a));
        nebulaPosAttr.setY(i, Math.sin(time + i) * 0.3);
      }
      nebulaPosAttr.needsUpdate = true;

      // World matrices must be current before we sample planet/dock positions,
      // otherwise the craft chases where things were one frame ago.
      scene.updateMatrixWorld(true);

      // ------------------------------------------------ mission state machine
      const targetPlanet = planets[m.round - 1];
      vPrev.copy(ship.position);

      // Falling behind the graph? Fly proportionally faster to catch up.
      const urgency = 1 + m.pendingRounds.length * 0.7;

      if (m.phase === 'docked') {
        dockWorldPos(vDock);
        vDock.y += Math.sin(time * 1.6) * 0.12;
        ship.position.lerp(vDock, 1 - Math.pow(0.001, dt));
        vTarget.copy(station.position).sub(ship.position);
        if (vTarget.lengthSq() > 1e-6) {
          ship.lookAt(station.position.x, station.position.y, station.position.z);
        }
        legs.visible = false;
        thrusterMat.opacity = 0.3 + Math.sin(time * 12) * 0.1;
        thruster.scale.setScalar(0.45);

        // Next round queued up? Undock and head out.
        if (m.pendingRounds.length > 0) {
          const nextRound = m.pendingRounds.shift();
          const planet = planets[nextRound - 1];
          if (planet) {
            m.round = nextRound;
            m.t = 0;
            m.roundClosed = false;
            // Pick a landing site facing roughly back toward the station so the
            // craft stays visible after touchdown.
            const lat = (Math.random() - 0.3) * 0.9;
            const lon = Math.random() * Math.PI * 2;
            m.landingNormal.set(
              Math.cos(lat) * Math.cos(lon),
              Math.sin(lat),
              Math.cos(lat) * Math.sin(lon)
            ).normalize();
            setPhase('outbound');
          }
        }
      } else if (m.phase === 'outbound' && targetPlanet) {
        m.t = Math.min(1, m.t + (dt / TRAVEL_SECONDS) * urgency);
        dockWorldPos(vDock);
        landingWorldPos(targetPlanet, m.landingNormal, vTarget);
        arcPoint(vDock, vTarget, easeInOut(m.t), 3.2, vPos);
        ship.position.copy(vPos);
        ship.lookAt(vTarget);
        legs.visible = m.t > 0.82;
        thrusterMat.opacity = 0.85 + Math.sin(time * 22) * 0.15;
        thruster.scale.set(1, 1.3 + Math.sin(time * 22) * 0.3, 1);
        if (m.t >= 1) setPhase('landed');
      } else if (m.phase === 'landed' && targetPlanet) {
        landingWorldPos(targetPlanet, m.landingNormal, vTarget);
        ship.position.copy(vTarget);
        ship.position.y += Math.sin(time * 2.4) * 0.03;

        // Stand upright on the surface: +Y along the outward normal.
        targetPlanet.pivot.getWorldQuaternion(qPlanet);
        vUp.copy(m.landingNormal).applyQuaternion(qPlanet).normalize();
        vNose.set(0, 1, 0).cross(vUp);
        if (vNose.lengthSq() < 1e-4) vNose.set(1, 0, 0);
        vNose.normalize();
        vRight.copy(vUp).cross(vNose).normalize();
        mBasis.makeBasis(vRight, vUp, vNose);
        ship.quaternion.setFromRotationMatrix(mBasis);

        legs.visible = true;
        thrusterMat.opacity = 0.25 + Math.sin(time * 8) * 0.1;
        thruster.scale.setScalar(0.4);

        // Work through this round's sources one at a time. Sites belonging to a
        // later round stay queued until the craft actually flies out there.
        if (!m.activeScan) {
          const next = m.scanQueue.findIndex((rec) => rec.round === m.round);
          if (next !== -1) {
            m.activeScan = { record: m.scanQueue.splice(next, 1)[0], t: 0 };
          }
        }
        if (m.activeScan) {
          m.activeScan.t += dt / SCAN_SECONDS;
          const rec = m.activeScan.record;
          rec.mesh.getWorldPosition(vNodeWorld);

          scanBeam.visible = true;
          scanBeam.geometry.setFromPoints([ship.position.clone(), vNodeWorld.clone()]);
          scanBeamMat.opacity = 0.35 + Math.sin(time * 18) * 0.3;

          // Harvested data flows back from the site to the craft.
          packet.visible = true;
          packet.position.lerpVectors(vNodeWorld, ship.position, Math.min(1, m.activeScan.t));

          const grow = 1 + Math.sin(Math.min(1, m.activeScan.t) * Math.PI) * 0.8;
          rec.mesh.scale.setScalar(grow);

          if (m.activeScan.t >= 1) {
            rec.mesh.scale.setScalar(1);
            rec.mesh.material.color.setHex(rec.dead ? NODE_DEAD : NODE_OK);
            rec.mesh.material.emissive.setHex(rec.dead ? 0x7f1d1d : 0x0e7490);
            rec.scanned = true;
            m.activeScan = null;
            scanBeam.visible = false;
            packet.visible = false;
          }
        } else {
          scanBeam.visible = false;
          packet.visible = false;
          // Every site here is surveyed. Head home once the backend has closed
          // this round, or as soon as a later round is waiting to be flown.
          if (m.roundClosed || m.pendingRounds.length > 0) {
            m.t = 0;
            setPhase('inbound');
          }
        }
      } else if (m.phase === 'inbound' && targetPlanet) {
        m.t = Math.min(1, m.t + (dt / TRAVEL_SECONDS) * urgency);
        landingWorldPos(targetPlanet, m.landingNormal, vDock);
        dockWorldPos(vTarget);
        arcPoint(vDock, vTarget, easeInOut(m.t), 3.2, vPos);
        ship.position.copy(vPos);
        ship.lookAt(vTarget);
        legs.visible = m.t < 0.18;
        thrusterMat.opacity = 0.85 + Math.sin(time * 22) * 0.15;
        thruster.scale.set(1, 1.3 + Math.sin(time * 22) * 0.3, 1);
        if (m.t >= 1) {
          m.round = 0;
          setPhase('docked');
        }
      } else if (m.phase !== 'docked') {
        // Target planet vanished (round count changed mid-run) — recover.
        setPhase('docked');
      }

      // -- engine trail --
      const trailAttr = trail.geometry.attributes.position;
      if (!trailFilled) {
        for (let i = 0; i < TRAIL_POINTS; i++) {
          trailAttr.setXYZ(i, ship.position.x, ship.position.y, ship.position.z);
        }
        trailFilled = true;
      } else {
        for (let i = TRAIL_POINTS - 1; i > 0; i--) {
          trailAttr.setXYZ(
            i,
            trailAttr.getX(i - 1),
            trailAttr.getY(i - 1),
            trailAttr.getZ(i - 1)
          );
        }
        trailAttr.setXYZ(0, ship.position.x, ship.position.y, ship.position.z);
      }
      trailAttr.needsUpdate = true;
      trailMat.color.setHex(mood);
      trailMat.opacity = m.phase === 'outbound' || m.phase === 'inbound' ? 0.55 : 0.12;

      // -- unavailable sources keep flickering --
      currentSources.forEach((source) => {
        if (source.status === 'Unavailable') {
          const rec = nodesMapRef.current.get(source.id);
          if (rec && rec.scanned) rec.mesh.material.opacity = 0.25 + Math.random() * 0.7;
        }
      });

      // -- synthesis streams back to the station --
      goldLinesRef.current.forEach((entry) => {
        entry.planet.pivot.getWorldPosition(vNodeWorld);
        entry.mesh.geometry.setFromPoints([station.position.clone(), vNodeWorld.clone()]);
        entry.mesh.material.opacity = 0.3 + Math.sin(time * 5 + entry.offset) * 0.2;
      });

      // -- camera: parallax plus a gentle pull toward the active mission --
      const camDist = 24 + shown * 2.4;
      const targetCamX = mouseRef.current.x * 5;
      const targetCamY = 9 + mouseRef.current.y * 4;
      camera.position.x += (targetCamX - camera.position.x) * 0.06;
      camera.position.y += (targetCamY - camera.position.y) * 0.06;
      camera.position.z += (camDist - camera.position.z) * 0.03;

      desiredLook.set(0, 0, 0);
      if (m.phase !== 'docked') desiredLook.copy(ship.position).multiplyScalar(0.45);
      lookTarget.lerp(desiredLook, 0.04);
      camera.lookAt(lookTarget);

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((mat) => mat.dispose());
          else obj.material.dispose();
        }
      });
      renderer.dispose();
      nodesMapRef.current.clear();
      goldLinesRef.current = [];
    };
  }, []);

  // ------------------------------------------------- prop -> mission intent ---
  useEffect(() => {
    const scene = sceneRef.current;
    const planets = planetsRef.current;
    const m = missionRef.current;
    if (!scene || planets.length === 0) return;

    // Backend log entries are capitalised ("Planner", "Researcher", ...).
    const node = (activeNode || '').toLowerCase();

    // New run: clear every site node and park the craft.
    if (sources.length === 0) {
      nodesMapRef.current.forEach((rec) => {
        rec.mesh.parent?.remove(rec.mesh);
        rec.mesh.geometry.dispose();
        rec.mesh.material.dispose();
      });
      nodesMapRef.current.clear();
      processedSourcesRef.current.clear();
      planets.forEach((p) => {
        p.nodeCount = 0;
        p.mesh.material.color.setHex(0x3b82f6);
        p.mesh.material.emissive.setHex(0x1d4ed8);
        p.glowMesh.material.color.setHex(0x3b82f6);
      });
      m.scanQueue = [];
      m.activeScan = null;
      m.pendingRounds = [];
      m.handledRounds.clear();
      // Uncharted again: sectors reappear one at a time as rounds open.
      if (isRunning) m.revealed = 0;
      // A craft still out from a cancelled run flies home before redeploying.
      m.roundClosed = true;
    }

    // Register newly discovered sites as nodes orbiting their round's planet.
    sources.forEach((source) => {
      if (processedSourcesRef.current.has(source.id)) return;
      processedSourcesRef.current.add(source.id);

      const round = Math.min(source.round || 1, planets.length);
      const planet = planets[round - 1];
      if (!planet) return;

      const idx = planet.nodeCount++;
      const angle = idx * 2.399; // golden-angle spread keeps nodes from stacking
      const nodeMesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.13, 0),
        new THREE.MeshPhongMaterial({
          color: NODE_IDLE,
          emissive: 0x1e293b,
          transparent: true,
          opacity: 0.95,
          shininess: 60
        })
      );
      nodeMesh.position.set(
        NODE_RING_R * Math.cos(angle),
        ((idx % 3) - 1) * 0.32,
        NODE_RING_R * Math.sin(angle)
      );
      planet.nodesGroup.add(nodeMesh);

      const record = {
        id: source.id,
        round,
        mesh: nodeMesh,
        dead: source.status === 'Unavailable',
        scanned: false
      };
      nodesMapRef.current.set(source.id, record);
      m.scanQueue.push(record);
    });

    // Chart a sector and send the craft out to it.
    const queueRound = (round) => {
      if (!isRunning || round < 1 || round > planets.length) return;
      if (m.handledRounds.has(round)) return;
      m.handledRounds.add(round);
      m.pendingRounds.push(round);
      m.revealed = Math.max(m.revealed, round);
    };

    // A round *starts* when the planner finishes (round 1) or when the critic
    // asks for another lap — the critic emits the already-incremented round.
    // Waiting for the researcher instead would launch the craft only after that
    // round's searching and scraping had already finished, which is why it sat
    // docked through the whole run.
    if (node === 'planner') queueRound(1);
    else if (node === 'critic') queueRound(currentRound);

    // Once the round's sources are in (researcher) or the graph has moved on,
    // the craft heads home as soon as it has surveyed what it found.
    if (node === 'researcher' || node === 'critic' || node === 'writer' || !isRunning) {
      m.roundClosed = true;
    }

    // Synthesis: stream every visited planet's findings back to the station.
    const clearGoldLines = () => {
      goldLinesRef.current.forEach((entry) => {
        scene.remove(entry.mesh);
        entry.mesh.geometry.dispose();
        entry.mesh.material.dispose();
      });
      goldLinesRef.current = [];
    };

    if (node === 'writer') {
      clearGoldLines();
      planets.slice(0, Math.min(maxRounds || 3, planets.length)).forEach((planet, i) => {
        const mesh = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
          new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.5 })
        );
        mesh.frustumCulled = false;
        scene.add(mesh);
        goldLinesRef.current.push({ mesh, planet, offset: i * 0.8 });
      });
    } else if (goldLinesRef.current.length > 0) {
      clearGoldLines();
    }
  }, [sources, activeNode, currentRound, maxRounds, isRunning]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
