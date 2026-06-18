import { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function ThreeBackground() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
    camera.position.z = 35;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const palette = [
      new THREE.Color(0xa855f7),
      new THREE.Color(0xec4899),
      new THREE.Color(0xf97316),
      new THREE.Color(0x6366f1),
      new THREE.Color(0x06b6d4),
    ];

    // ─── Spiral Galaxy Particles ───
    const particleCount = 1200;
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const randoms = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const t = i / particleCount;
      const angle = t * Math.PI * 8;
      const radius = 2 + t * 18 + (Math.random() - 0.5) * 2;
      const height = (Math.random() - 0.5) * 12;
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = height;
      pos[i * 3 + 2] = Math.sin(angle) * radius;

      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
      sizes[i] = 0.1 + Math.random() * 0.4;
      randoms[i] = Math.random() * Math.PI * 2;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    particleGeo.setAttribute('random', new THREE.BufferAttribute(randoms, 1));

    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = 64;
    spriteCanvas.height = 64;
    const sCtx = spriteCanvas.getContext('2d');
    const grad = sCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.2, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.5)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 64, 64);
    const spriteTexture = new THREE.CanvasTexture(spriteCanvas);

    const particleMat = new THREE.PointsMaterial({
      size: 0.4,
      map: spriteTexture,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ─── Center Glowing Torus (Instagram-like) ───
    const ringGeo = new THREE.TorusGeometry(1.8, 0.15, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.6,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 3;
    scene.add(ring);

    const ring2Geo = new THREE.TorusGeometry(2.5, 0.08, 12, 64);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0xec4899,
      transparent: true,
      opacity: 0.4,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = -Math.PI / 4;
    ring2.rotation.z = Math.PI / 6;
    scene.add(ring2);

    // Inner glow sphere
    const glowGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.3,
    });
    const glowSphere = new THREE.Mesh(glowGeo, glowMat);
    scene.add(glowSphere);

    // ─── Floating geometric shapes ───
    const shapes = [];
    const shapeTypes = [
      () => new THREE.OctahedronGeometry(0.6 + Math.random() * 0.8),
      () => new THREE.TetrahedronGeometry(0.6 + Math.random() * 0.8),
      () => new THREE.IcosahedronGeometry(0.5 + Math.random() * 0.7),
      () => new THREE.BoxGeometry(0.6 + Math.random() * 0.6, 0.6 + Math.random() * 0.6, 0.6 + Math.random() * 0.6),
    ];

    for (let i = 0; i < 16; i++) {
      const geo = shapeTypes[Math.floor(Math.random() * shapeTypes.length)]();
      const mat = new THREE.MeshBasicMaterial({
        color: palette[i % palette.length],
        wireframe: true,
        transparent: true,
        opacity: 0.12 + Math.random() * 0.18,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const angle = (i / 16) * Math.PI * 2;
      const dist = 5 + Math.random() * 7;
      mesh.position.set(
        Math.cos(angle) * dist,
        (Math.random() - 0.5) * 10,
        Math.sin(angle) * dist
      );
      mesh.scale.setScalar(0.8 + Math.random() * 1.2);
      mesh.userData = {
        rotSpeed: { x: (Math.random() - 0.5) * 0.008, y: (Math.random() - 0.5) * 0.008 },
        floatAmp: 0.3 + Math.random() * 0.6,
        floatFreq: 0.2 + Math.random() * 0.4,
        initY: mesh.position.y,
        angle,
        dist,
      };
      scene.add(mesh);
      shapes.push(mesh);
    }

    // ─── Shooting stars ───
    const stars = [];
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(6 * 3);
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.3,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    for (let i = 0; i < 6; i++) {
      stars.push({
        active: false,
        delay: Math.random() * 20,
        progress: 0,
        startX: (Math.random() - 0.5) * 60,
        startY: (Math.random() - 0.5) * 40,
        startZ: (Math.random() - 0.5) * 40,
        endX: 0,
        endY: 0,
        endZ: 0,
      });
    }

    // ─── Mouse ───
    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;
    const onMove = (e) => {
      targetX = (e.clientX / window.innerWidth) * 2 - 1;
      targetY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', onMove);

    const onResize = () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
      renderer.setSize(cw, ch);
    };
    window.addEventListener('resize', onResize);

    // ─── Animation ───
    let time = 0;

    const animate = () => {
      requestAnimationFrame(animate);
      time += 0.004;

      // Smooth mouse
      currentX += (targetX - currentX) * 0.03;
      currentY += (targetY - currentY) * 0.03;

      // Rotate galaxy
      particles.rotation.y += 0.001;
      particles.rotation.x = Math.sin(time * 0.1) * 0.03;
      particles.rotation.z = Math.cos(time * 0.08) * 0.02;

      // Pulse particle sizes
      const sizeAttr = particleGeo.attributes.size;
      const sizes = sizeAttr.array;
      const randAttr = particleGeo.attributes.random;
      for (let i = 0; i < particleCount; i++) {
        sizes[i] = 0.15 + Math.sin(time * 2 + randAttr.array[i]) * 0.25;
      }
      sizeAttr.needsUpdate = true;

      // Center rings
      ring.rotation.z += 0.005;
      ring.rotation.y += 0.003;
      ring2.rotation.z += 0.003;
      ring2.rotation.y -= 0.004;

      // Pulse opacity on rings
      ringMat.opacity = 0.4 + Math.sin(time * 0.8) * 0.2;
      ring2Mat.opacity = 0.25 + Math.sin(time * 0.6 + 1) * 0.15;

      // Glow sphere pulse
      glowSphere.scale.setScalar(1 + Math.sin(time * 1.2) * 0.2);

      // Shapes float + orbit
      shapes.forEach((mesh) => {
        const { rotSpeed, floatAmp, floatFreq, initY, angle, dist } = mesh.userData;
        mesh.rotation.x += rotSpeed.x;
        mesh.rotation.y += rotSpeed.y;
        const floatOffset = Math.sin(time * floatFreq) * floatAmp;
        mesh.position.y = initY + floatOffset;
        // Slow orbit
        const orbitAngle = angle + time * 0.05;
        mesh.position.x = Math.cos(orbitAngle) * dist;
        mesh.position.z = Math.sin(orbitAngle) * dist;
      });

      // Shooting stars
      const positions = starGeo.attributes.position.array;
      stars.forEach((star) => {
        if (!star.active) {
          star.delay -= 0.016;
          if (star.delay <= 0) {
            star.active = true;
            star.progress = 0;
            star.startX = (Math.random() - 0.5) * 50;
            star.startY = 15 + Math.random() * 15;
            star.startZ = (Math.random() - 0.5) * 30 - 10;
            const dx = (Math.random() - 0.5) * 30;
            const dy = -(20 + Math.random() * 15);
            const dz = (Math.random() - 0.5) * 20;
            star.endX = star.startX + dx;
            star.endY = star.startY + dy;
            star.endZ = star.startZ + dz;
          }
        } else {
          star.progress += 0.012;
          if (star.progress >= 1) {
            star.active = false;
            star.delay = 3 + Math.random() * 8;
          }
        }
      });

      // Update shooting star positions
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        if (star.active) {
          const p = star.progress;
          const easeP = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
          positions[i * 3] = star.startX + (star.endX - star.startX) * easeP;
          positions[i * 3 + 1] = star.startY + (star.endY - star.startY) * easeP;
          positions[i * 3 + 2] = star.startZ + (star.endZ - star.startZ) * easeP;
        } else {
          positions[i * 3] = 999;
          positions[i * 3 + 1] = 999;
          positions[i * 3 + 2] = 999;
        }
      }
      starGeo.attributes.position.needsUpdate = true;
      starMat.opacity = stars.some(s => s.active) ? 0.8 : 0;

      // Camera parallax
      camera.position.x += (currentX * 3 - camera.position.x) * 0.02;
      camera.position.y += (-currentY * 2 - camera.position.y) * 0.02;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      spriteTexture.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      glowGeo.dispose();
      glowMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      shapes.forEach((mesh) => {
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
