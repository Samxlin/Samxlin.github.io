export {};

interface TorusPoint {
  u: number;
  v: number;
  seed: number;
  drift: number;
  size: number;
  family: number;
}

interface DustPoint {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

interface ProjectedPoint {
  x: number;
  y: number;
  z: number;
  perspective: number;
  size: number;
  family: number;
  influence: number;
}

interface DensityProfile {
  key: 'desktop' | 'tablet' | 'mobile';
  rings: number;
  perRing: number;
  dust: number;
}

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

const densityForViewport = (): DensityProfile => {
  if (window.innerWidth <= 720) {
    return { key: 'mobile', rings: 12, perRing: 14, dust: 34 };
  }

  if (window.innerWidth <= 980) {
    return { key: 'tablet', rings: 15, perRing: 17, dust: 54 };
  }

  return { key: 'desktop', rings: 20, perRing: 23, dust: 92 };
};

const rotate3D = (
  sourceX: number,
  sourceY: number,
  sourceZ: number,
  angleX: number,
  angleY: number,
  angleZ: number,
) => {
  const cosY = Math.cos(angleX);
  const sinY = Math.sin(angleX);
  let y = sourceY * cosY - sourceZ * sinY;
  let z = sourceY * sinY + sourceZ * cosY;

  const cosX = Math.cos(angleY);
  const sinX = Math.sin(angleY);
  let x = sourceX * cosX + z * sinX;
  z = -sourceX * sinX + z * cosX;

  const cosZ = Math.cos(angleZ);
  const sinZ = Math.sin(angleZ);

  return [x * cosZ - y * sinZ, x * sinZ + y * cosZ, z] as const;
};

const initialiseField = (root: HTMLElement) => {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-field-canvas]');
  const phaseReadout = root.querySelector<HTMLElement>('[data-field-phase]');
  const densityReadout = root.querySelector<HTMLElement>('[data-field-density]');
  const frequencyReadout = root.querySelector<HTMLElement>('[data-field-frequency]');
  const statusReadout = root.querySelector<HTMLElement>('[data-field-status]');
  const context = canvas?.getContext('2d', { alpha: true });

  if (!canvas || !context) return;

  const controller = new AbortController();
  const { signal } = controller;
  const torus: TorusPoint[] = [];
  const dust: DustPoint[] = [];

  let width = 0;
  let height = 0;
  let dpr = 1;
  let rafId: number | null = null;
  let hudTimer: number | null = null;
  let destroyed = false;
  let densityProfile = densityForViewport();
  let pointer = {
    x: window.innerWidth * 0.74,
    y: window.innerHeight * 0.42,
    targetX: window.innerWidth * 0.74,
    targetY: window.innerHeight * 0.42,
  };

  const populate = (profile: DensityProfile) => {
    torus.length = 0;
    dust.length = 0;

    for (let ring = 0; ring < profile.rings; ring += 1) {
      for (let index = 0; index < profile.perRing; index += 1) {
        torus.push({
          u: (index / profile.perRing) * Math.PI * 2 + (ring % 2) * 0.06,
          v: (ring / profile.rings) * Math.PI * 2,
          seed: Math.random() * Math.PI * 2,
          drift: 0.78 + Math.random() * 0.45,
          size: 0.55 + Math.random() * 1.35,
          family: Math.random(),
        });
      }
    }

    for (let index = 0; index < profile.dust; index += 1) {
      dust.push({
        x: Math.random(),
        y: Math.random(),
        z: Math.random(),
        vx: (Math.random() - 0.5) * 0.00008,
        vy: (Math.random() - 0.5) * 0.00006,
        size: 0.35 + Math.random() * 1.1,
        alpha: 0.04 + Math.random() * 0.13,
      });
    }
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const nextProfile = densityForViewport();
    if (nextProfile.key !== densityProfile.key || torus.length === 0) {
      densityProfile = nextProfile;
      populate(densityProfile);
    }

    pointer = {
      x: Math.min(pointer.x, width),
      y: Math.min(pointer.y, height),
      targetX: Math.min(pointer.targetX, width),
      targetY: Math.min(pointer.targetY, height),
    };
  };

  const updateHud = () => {
    if (destroyed || document.hidden || motionQuery.matches) return;

    const time = Date.now() / 1000;
    if (phaseReadout) phaseReadout.textContent = `${(34 + Math.sin(time * 0.42) * 4.3).toFixed(1)}°`;
    if (densityReadout) densityReadout.textContent = (0.83 + Math.sin(time * 0.31) * 0.035).toFixed(2);
    if (frequencyReadout) frequencyReadout.textContent = `${(1 + Math.sin(time * 0.18) * 0.0008).toFixed(3)} MHz`;
  };

  const render = (timestamp: number) => {
    if (destroyed || document.hidden || motionQuery.matches) {
      rafId = null;
      return;
    }

    const time = timestamp * 0.001;
    const quietMode = document.body.classList.contains('moonlight');
    context.clearRect(0, 0, width, height);

    pointer.x += (pointer.targetX - pointer.x) * 0.055;
    pointer.y += (pointer.targetY - pointer.y) * 0.055;

    for (const point of dust) {
      point.x += point.vx * (quietMode ? 0.4 : 1);
      point.y += point.vy * (quietMode ? 0.4 : 1);

      if (point.x < -0.03) point.x = 1.03;
      if (point.x > 1.03) point.x = -0.03;
      if (point.y < -0.03) point.y = 1.03;
      if (point.y > 1.03) point.y = -0.03;

      const x = point.x * width + Math.sin(time * 0.12 + point.z * 8) * 7;
      const y = point.y * height + Math.cos(time * 0.1 + point.z * 9) * 5;

      context.beginPath();
      context.arc(x, y, point.size, 0, Math.PI * 2);
      context.fillStyle = `rgba(66,82,108,${point.alpha})`;
      context.fill();
    }

    const compact = width < 980;
    const centerX = compact ? width * 0.53 : width * 0.745;
    const centerY = compact ? height * 0.62 : height * 0.46;
    const base = Math.min(width, height) * (compact ? 0.31 : 0.285);
    const majorRadius = base * 0.76;
    const minorRadius = base * 0.32;
    const scrollPhase = Math.min(window.scrollY / Math.max(height, 1), 2.4);
    const rotationY = time * (quietMode ? 0.035 : 0.065) + scrollPhase * 0.1;
    const rotationX = -0.44 + Math.sin(time * 0.12) * 0.055 + scrollPhase * 0.04;
    const rotationZ = 0.22 + Math.cos(time * 0.08) * 0.045;
    const fieldAlpha = compact ? 0.56 : 0.72;
    const projected: ProjectedPoint[] = [];

    for (const point of torus) {
      const pulse = 1 + Math.sin(time * 0.72 + point.seed) * 0.028;
      const wobble = Math.sin(point.u * 3 + time * 0.28 + point.seed) * base * 0.018;
      const phase = point.v + time * 0.055 * point.drift;
      const radial = majorRadius * pulse + minorRadius * Math.cos(phase);
      const sourceX = radial * Math.cos(point.u) + wobble;
      const sourceY = minorRadius * Math.sin(phase);
      const sourceZ = radial * Math.sin(point.u);
      const [rotatedX, rotatedY, rotatedZ] = rotate3D(
        sourceX,
        sourceY,
        sourceZ,
        rotationX,
        rotationY,
        rotationZ,
      );
      const perspective = 1 / (1 + rotatedZ / (base * 4.1));
      let x = centerX + rotatedX * perspective;
      let y = centerY + rotatedY * perspective;

      const deltaX = x - pointer.x;
      const deltaY = y - pointer.y;
      const distanceSquared = deltaX * deltaX + deltaY * deltaY;
      const influence = Math.max(0, 1 - distanceSquared / 36000);
      const distance = Math.sqrt(distanceSquared) || 1;
      x += (deltaX / distance) * influence * 16;
      y += (deltaY / distance) * influence * 16;

      projected.push({
        x,
        y,
        z: rotatedZ,
        perspective,
        size: point.size,
        family: point.family,
        influence,
      });
    }

    projected.sort((left, right) => left.z - right.z);

    context.lineWidth = 0.55;
    const stride = Math.max(densityProfile.perRing, 12);
    const connectionOffset = Math.max(3, Math.round(densityProfile.perRing * 0.22));
    for (let index = 0; index < projected.length; index += stride) {
      const start = projected[index];
      const end = projected[(index + connectionOffset) % projected.length];
      if (!start || !end) continue;

      const gradient = context.createLinearGradient(start.x, start.y, end.x, end.y);
      gradient.addColorStop(0, 'rgba(80,97,126,.035)');
      gradient.addColorStop(0.5, 'rgba(105,101,137,.12)');
      gradient.addColorStop(1, 'rgba(91,126,127,.025)');
      context.strokeStyle = gradient;
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.quadraticCurveTo(
        (start.x + end.x) / 2 + 12,
        (start.y + end.y) / 2 - 10,
        end.x,
        end.y,
      );
      context.stroke();
    }

    for (const point of projected) {
      const depth = Math.max(0.18, Math.min(1, 0.58 - point.z / (base * 2.5)));
      const alpha = fieldAlpha * depth * (quietMode ? 0.72 : 1) + point.influence * 0.15;
      const radius = point.size * point.perspective * (1 + point.influence * 0.45);

      if (point.family < 0.28) {
        context.fillStyle = `rgba(92,119,122,${alpha * 0.75})`;
      } else if (point.family < 0.63) {
        context.fillStyle = `rgba(77,94,122,${alpha})`;
      } else {
        context.fillStyle = `rgba(105,96,132,${alpha * 0.82})`;
      }

      context.beginPath();
      context.arc(point.x, point.y, radius, 0, Math.PI * 2);
      context.fill();
    }

    const core = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, base * 0.48);
    core.addColorStop(0, 'rgba(255,255,252,.43)');
    core.addColorStop(0.2, 'rgba(166,177,194,.08)');
    core.addColorStop(1, 'rgba(166,177,194,0)');
    context.fillStyle = core;
    context.beginPath();
    context.arc(centerX, centerY, base * 0.48, 0, Math.PI * 2);
    context.fill();

    rafId = window.requestAnimationFrame(render);
  };

  const stop = () => {
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }

    if (hudTimer !== null) {
      window.clearInterval(hudTimer);
      hudTimer = null;
    }
  };

  const start = () => {
    if (destroyed || document.hidden || motionQuery.matches) return;
    if (rafId === null) rafId = window.requestAnimationFrame(render);
    if (hudTimer === null) hudTimer = window.setInterval(updateHud, 460);
  };

  const handleVisibility = () => {
    if (document.hidden) {
      stop();
      if (statusReadout) statusReadout.textContent = 'paused';
      return;
    }

    if (statusReadout) statusReadout.textContent = 'stable';
    start();
  };

  const handleMotionPreference = () => {
    if (motionQuery.matches) {
      stop();
      context.clearRect(0, 0, width, height);
      if (statusReadout) statusReadout.textContent = 'quiet';
      return;
    }

    resize();
    if (statusReadout) statusReadout.textContent = 'stable';
    start();
  };

  const handlePointer = (event: PointerEvent) => {
    if (event.pointerType === 'touch' || motionQuery.matches) return;
    pointer.targetX = event.clientX;
    pointer.targetY = event.clientY;
  };

  const cleanup = () => {
    if (destroyed) return;
    destroyed = true;
    stop();
    controller.abort();
    removalObserver.disconnect();
    torus.length = 0;
    dust.length = 0;
    context.clearRect(0, 0, width, height);
  };

  const removalObserver = new MutationObserver(() => {
    if (!root.isConnected) cleanup();
  });

  populate(densityProfile);
  resize();

  window.addEventListener('pointermove', handlePointer, { passive: true, signal });
  window.addEventListener('resize', resize, { passive: true, signal });
  window.addEventListener('pagehide', cleanup, { once: true, signal });
  document.addEventListener('visibilitychange', handleVisibility, { signal });
  document.addEventListener('astro:before-swap', cleanup, { once: true, signal });
  motionQuery.addEventListener('change', handleMotionPreference, { signal });
  removalObserver.observe(document.body, { childList: true, subtree: true });

  if (motionQuery.matches) {
    if (statusReadout) statusReadout.textContent = 'quiet';
  } else {
    start();
  }
};

document.querySelectorAll<HTMLElement>('[data-particle-field]').forEach(initialiseField);
