'use strict';
(() => {
  const story = document.querySelector('.story');
  const stage = document.querySelector('.stage');
  const portal = document.querySelector('.portal');
  const photograph = document.querySelector('.photo-layer');
  const intro = document.querySelector('.intro-title');
  const copy = document.querySelector('.scene-copy');
  const closing = document.querySelector('.closing-copy');
  const word = document.querySelector('.scene-word');
  const lines = document.querySelector('.frame-lines');
  const toggle = document.querySelector('#motion-toggle');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const particleCanvas = document.querySelector('#particles');
  const particleContext = particleCanvas.getContext('2d');
  const particleBackdrop = document.querySelector('.particle-backdrop');
  let particleData = [], particleWidth = 0, particleHeight = 0;
  const sceneButtons = [...document.querySelectorAll('[data-scene]')];
  let paused = false, progress = 0, target = 0, raf = 0, previousTime = 0;
  let pointerX = 0, pointerY = 0, active = true;
  const clamp = n => Math.max(0, Math.min(1, n));
  const ease = n => { n = clamp(n); return n * n * (3 - 2 * n); };
  const phase = (p, a, b) => ease((p - a) / (b - a));
  // A single normalized scroll timeline controls all visual layers.
  // No frame sequence, animation library, video or scroll interception.
  function paint(p) {
    const mobile = stage.clientWidth < 760;
    const opening = phase(p, .02, .31);
    const journey = phase(p, .30, .79);
    const ending = phase(p, .77, .98);
    const still = reduced.matches;
    const cloud = (still || !particleData.length) ? 0 : phase(p,.34,.45) * (1-phase(p,.75,.86));
    particleCanvas.style.opacity = cloud;
    particleBackdrop.style.opacity = cloud;
    photograph.style.opacity = 1-cloud;
    if (cloud > .001) drawParticles(p); 
    const top = (mobile ? 43 : 41) * (1 - opening);
    const side = (mobile ? 6 : 24) * (1 - opening);
    const bottom = (mobile ? 15 : 11) * (1 - opening);
    portal.style.clipPath = `inset(${top}% ${side}% ${bottom}% round ${22 * (1 - opening)}px)`;
    photograph.style.transform = `translate3d(${(still ? 0 : pointerX * 7) - journey * 3}%,${still ? 0 : pointerY * 2}%,0) scale(${1.04 + journey * .22})`;
    photograph.style.filter = `brightness(${1 - ending * .35}) saturate(${1 - ending * .2})`;
    intro.style.opacity = 1 - phase(p, .01, .20);
    intro.style.transform = `translate3d(0,${-phase(p, 0, .27) * 130}px,0) scale(${1 + opening * .16})`;
    lines.style.opacity = (1 - opening) * .5;
    lines.style.transform = `scale(${1 + opening * .7}) rotate(${opening * 4}deg)`;
    const copyOpacity = phase(p, .39, .46) * (1 - phase(p, .69, .77));
    copy.style.opacity = copyOpacity;
    copy.style.transform = `translate3d(${(1 - phase(p,.30,.46)) * -70}px,0,0)`;
    word.style.opacity = phase(p, .46, .56) * (1 - phase(p,.72,.81)) * .22;
    word.style.transform = `translate3d(${16 - journey * 31}%,0,0)`;
    closing.style.opacity = ending;
    closing.style.transform = `translate3d(0,${(1 - ending) * 65}px,0)`;
    closing.style.visibility = ending > .01 ? 'visible' : 'hidden';
    closing.querySelector('a').tabIndex = ending > .8 ? 0 : -1;
    stage.style.setProperty('--progress', p);
    stage.classList.toggle('immersed', p > .24);
    sceneButtons.forEach((button, i) => {
      const selected = i === (p < .32 ? 0 : p < .77 ? 1 : 2);
      if (selected) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    });
    stage.dataset.progress = p.toFixed(3);
  }
  // Sample our original architectural image into a 3D colored point field.
  // Depth is an artistic luminance mapping, not a measured building model.
  function prepareParticles() {
    const source = document.querySelector('#hero-image');
    if (!source.complete || !source.naturalWidth || !particleContext) return;
    const sampling = document.createElement('canvas');
    const sw = stage.clientWidth < 760 ? 104 : 168;
    const sh = Math.round(sw * source.naturalHeight / source.naturalWidth);
    sampling.width = sw; sampling.height = sh;
    const context = sampling.getContext('2d', { willReadFrequently: true });
    context.drawImage(source, 0, 0, sw, sh);
    let pixels;
    try { pixels = context.getImageData(0, 0, sw, sh).data; }
    catch { particleData=[]; return; }
    particleData = [];
    for (let y=0; y<sh; y++) for (let x=0; x<sw; x++) {
      const i=(y*sw+x)*4;
      const light=(pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722)/255;
      particleData.push({ x:(x/sw-.5)*1.5, y:y/sh-.5, z:(light-.4)*.24,
        noise:Math.sin(x*12.9898+y*78.233)*43758.5453%1,
        color:`rgb(${pixels[i]},${pixels[i+1]},${pixels[i+2]})` });
    }
    resizeParticles();
    if (!paused && !reduced.matches) paint(progress);
  }
  function resizeParticles() {
    particleWidth=stage.clientWidth; particleHeight=stage.clientHeight;
    const dpr=Math.min(devicePixelRatio||1,1.5);
    particleCanvas.width=Math.round(particleWidth*dpr);
    particleCanvas.height=Math.round(particleHeight*dpr);
    if (particleContext) particleContext.setTransform(dpr,0,0,dpr,0,0);
  }
  function drawParticles(p) {
    if (!particleContext || !particleData.length) return;
    const ctx=particleContext,w=particleWidth,h=particleHeight;
    ctx.clearRect(0,0,w,h);
    const mobile=w<760;
    const enter=phase(p,.35,.49),exit=phase(p,.68,.84);
    const rotation=Math.sin(phase(p,.40,.80)*Math.PI)*.65;
    const expansion=Math.sin(phase(p,.43,.79)*Math.PI);
    const scale=(mobile?w*.79:w*.44)*(1+exit*.45);
    const centerX=w*(mobile?.5:.64),centerY=h*(mobile?.64:.54);
    const cos=Math.cos(rotation),sin=Math.sin(rotation);
    const pointSize=mobile?1.55:1.85;
    for(const point of particleData){
      const spread=expansion*point.noise*.11;
      const x=point.x*(1+expansion*.12)+spread;
      const y=point.y+spread*.35;
      const z=point.z*enter+Math.sin(point.x*6+p*10)*expansion*.08;
      const rx=x*cos+z*sin,rz=-x*sin+z*cos;
      const perspective=2.8/(2.8+rz);
      const px=centerX+rx*scale*perspective;
      const py=centerY+(y*Math.cos(rotation*.35)-rz*Math.sin(rotation*.35))*scale*perspective;
      ctx.fillStyle=point.color;
      ctx.globalAlpha=.72+Math.max(0,point.z)*.9;
      const size=pointSize*perspective*(1+exit*.4);
      ctx.fillRect(px,py,size,size);
    }
    ctx.globalAlpha=1;
  }
  function tick(time) {
    raf = 0;
    if (paused || reduced.matches || !active) return;
    const dt = Math.min(time - (previousTime || time - 16), 64); previousTime = time;
    progress += (target - progress) * (1 - Math.exp(-dt / 95));
    if (Math.abs(progress - target) < .00015) progress = target;
    paint(progress);
    if (progress !== target) raf = requestAnimationFrame(tick);
  }
  function schedule() {
    if (!raf && !paused && !reduced.matches && active) { previousTime = 0; raf = requestAnimationFrame(tick); }
  }
  function scrollUpdate() {
    const distance = story.offsetHeight - stage.offsetHeight;
    target = distance > 0 ? clamp(-story.getBoundingClientRect().top / distance) : 0;
    schedule();
  }
  function applyPreference() {
    cancelAnimationFrame(raf); raf = 0;
    document.documentElement.classList.toggle('reduced-motion', reduced.matches);
    toggle.hidden = reduced.matches;
    if (reduced.matches) { progress = target = 0; pointerX = pointerY = 0; paint(0); }
    else scrollUpdate();
  }
  toggle.addEventListener('click', () => {
    paused = !paused;
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.textContent = paused ? 'Retomar movimento' : 'Pausar movimento';
    if (paused) { cancelAnimationFrame(raf); raf = 0; } else scrollUpdate();
  });
  sceneButtons.forEach(button => button.addEventListener('click', () => {
    if (paused) toggle.click();
    const top = scrollY + story.getBoundingClientRect().top;
    scrollTo({ top: top + Number(button.dataset.scene) * (story.offsetHeight - stage.offsetHeight), behavior: reduced.matches ? 'instant' : 'smooth' });
  }));
  // Fine-pointer parallax only; touch scrolling remains completely native.
  if (matchMedia('(pointer:fine)').matches) {
    stage.addEventListener('pointermove', event => {
      if (paused || reduced.matches || !active) return;
      pointerX = (event.clientX / stage.clientWidth - .5) * .12;
      pointerY = (event.clientY / stage.clientHeight - .5) * .12;
      schedule();
    }, { passive: true });
    stage.addEventListener('pointerleave', () => { pointerX = pointerY = 0; schedule(); });
  }
  addEventListener('scroll', scrollUpdate, { passive: true });
  new ResizeObserver(() => { resizeParticles(); paint(progress); scrollUpdate(); }).observe(stage);
  new IntersectionObserver(entries => {
    active = entries[0].isIntersecting;
    if (active) scrollUpdate(); else { cancelAnimationFrame(raf); raf = 0; }
  }).observe(story);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else scrollUpdate();
  });
  reduced.addEventListener('change', applyPreference);
  const sourceImage=document.querySelector('#hero-image');
  sourceImage.addEventListener('load',prepareParticles,{once:true});
  sourceImage.addEventListener('error',()=>{document.querySelector('.portal').classList.add('image-unavailable');},{once:true});
  prepareParticles();
  applyPreference(); paint(0);
  const form = document.querySelector('#brief-form');
  document.querySelectorAll('[data-interest]').forEach(link => link.addEventListener('click', () => {
    form.querySelector(`input[value="${link.dataset.interest}"]`).checked = true;
    document.querySelector('#brief-result').hidden = true;
  }));
  let brief = '';
  form.addEventListener('input', () => { document.querySelector('#brief-result').hidden = true; });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(form), region = data.get('region').trim();
    if (!region) { document.querySelector('#region').setCustomValidity('Informe uma cidade ou bairro.'); form.reportValidity(); return; }
    brief = `Meu próximo passo com a Morada\n\nObjetivo: ${data.get('interest')}\nRegião: ${region}\nPreferências: ${data.get('details').trim() || 'Quero conhecer as possibilidades.'}`;
    document.querySelector('#brief-text').textContent = brief;
    document.querySelector('#brief-result').hidden = false;
    document.querySelector('#brief-status').textContent = 'Resumo pronto. Nenhuma informação foi enviada.';
  });
  document.querySelector('#region').addEventListener('input', event => event.target.setCustomValidity(''));
  document.querySelector('#download-brief').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([brief], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'meu-resumo-morada.txt'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  document.querySelector('#year').textContent = new Date().getFullYear();
})();
