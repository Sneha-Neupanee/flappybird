// Flappy Burst - vanilla JS Canvas clone (no Tailwind)
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // HiDPI scaling
  function resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;
    canvas.width = Math.floor(cssWidth * ratio);
    canvas.height = Math.floor(cssHeight * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Game state
  let running = false;
  let paused = false;
  let started = false;
  let gameOver = false;
  let score = 0;
  let best = Number(localStorage.getItem('flappy_best') || 0);
  let time = 0;

  // Controls
  const overlay = document.getElementById('overlay');
  const btnPlay = document.getElementById('btnPlay');
  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');
  const btnReset = document.getElementById('btnReset');
  const uiScore = document.getElementById('score');
  const uiBest = document.getElementById('best');
  const uiTitle = document.getElementById('title');
  const uiSubtitle = document.getElementById('subtitle');

  // Audio (simple beeps)
  let muted = false;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const actx = new AudioCtx();
  function beep(freq=600, dur=0.07, type='sine', vol=0.04){
    if(muted) return;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.frequency.value = freq;
    osc.type = type;
    gain.gain.value = vol;
    osc.connect(gain); gain.connect(actx.destination);
    osc.start();
    setTimeout(()=>{ osc.stop(); }, dur*1000);
  }

  // World config
  const W = () => canvas.clientWidth;
  const H = () => canvas.clientHeight;
  const GRAVITY = 980; // px/s^2
  const FLAP_VELOCITY = -340; // px/s
  let pipeSpeed = 140; // px/s
  let spawnInterval = 1500; // ms
  const GAP_MIN = 150;
  const GAP_MAX = 190;

  // Entities
  const bird = {
    x: 120,
    y: H()/2,
    vy: 0,
    r: 16,
    rot: 0,
    flap(){
      bird.vy = FLAP_VELOCITY;
      beep(880, .06, 'triangle', .05);
    },
    update(dt){
      bird.vy += GRAVITY * dt;
      bird.y += bird.vy * dt;
      bird.rot = Math.atan2(bird.vy, 300);
    },
    draw(){
      // Body
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.rotate(bird.rot);
      // vibrant gradient body
      const g = ctx.createLinearGradient(-20,-20,20,20);
      g.addColorStop(0, '#ffe259');
      g.addColorStop(1, '#ff3cac');
      ctx.fillStyle = g;
      roundedRect(-18,-14,36,28,14);
      // Eye
      ctx.fillStyle = 'white';
      ctx.beginPath(); ctx.arc(4,-4,6,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(6,-4,3,0,Math.PI*2); ctx.fill();
      // Beak
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.moveTo(18,-2); ctx.lineTo(30,0); ctx.lineTo(18,2); ctx.closePath(); ctx.fill();
      // Wing
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      roundedRect(-10,0,18,10,5);
      ctx.restore();
    }
  };

  function roundedRect(x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y, x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x, y+h, r);
    ctx.arcTo(x, y+h, x, y, r);
    ctx.arcTo(x, y, x+w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  // Pipes
  let pipes = [];
  let spawnTimer = 0;

  function reset(){
    score = 0;
    pipeSpeed = 150;
    spawnInterval = 1500;
    started = false;
    gameOver = false;
    paused = false;
    bird.y = H()/2; bird.vy = 0; bird.rot = 0;
    pipes = [];
    spawnTimer = 0;
    uiScore.textContent = '0';
    uiBest.textContent = String(best);
    overlay.classList.remove('hidden');
    uiTitle.textContent = 'Get Ready';
    uiSubtitle.textContent = 'Tap or press Space to start';
  }

  function start(){
    overlay.classList.add('hidden');
    started = true;
    running = true;
  }

  function setGameOver(){
    gameOver = true;
    running = false;
    best = Math.max(best, score);
    localStorage.setItem('flappy_best', String(best));
    uiScore.textContent = String(score);
    uiBest.textContent = String(best);
    uiTitle.textContent = 'Game Over';
    uiSubtitle.textContent = 'Press Reset or Play Again';
    overlay.classList.remove('hidden');
    beep(160, .2, 'sawtooth', .06);
  }

  // Input
  function onFlap(){
    if(!started && !gameOver){
      start();
      bird.flap();
      return;
    }
    if(!gameOver) bird.flap();
  }

  canvas.addEventListener('pointerdown', onFlap);
  window.addEventListener('keydown', (e)=>{
    if(e.code === 'Space'){ e.preventDefault(); onFlap(); }
    if(e.code === 'KeyP'){ togglePause(); }
    if(e.code === 'KeyM'){ muted = !muted; }
  });

  btnPlay.addEventListener('click', ()=>{
    if(gameOver) reset();
    start();
    beep(700,.08,'square',.05);
  });
  btnStart.addEventListener('click', ()=>{
    if(gameOver) reset();
    start();
  });
  btnPause.addEventListener('click', ()=> togglePause());
  btnReset.addEventListener('click', ()=> reset());

  function togglePause(){
    if(!started || gameOver) return;
    paused = !paused;
    if(paused){
      uiTitle.textContent = 'Paused';
      uiSubtitle.textContent = 'Press P or Pause to resume';
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
    }
  }

  // Utils
  function rand(min,max){ return Math.random()*(max-min)+min; }

  function spawnPipe(){
    const gap = rand(GAP_MIN,GAP_MAX);
    const center = rand(140, H()-160);
    const topH = Math.max(40, center - gap/2);
    const bottomY = center + gap/2;
    const bottomH = Math.max(40, H() - bottomY);

    pipes.push({
      x: W()+40,
      w: 68,
      top: { y: 0, h: topH },
      bottom: { y: bottomY, h: bottomH },
      passed: false
    });
  }

  function update(dt){
    if(!started || paused || gameOver) return;
    time += dt;
    spawnTimer += dt*1000;

    // difficulty curve
    pipeSpeed += 0.2 * dt; // slowly ramp speed
    if(spawnInterval > 950) spawnInterval -= 20 * dt*60;

    // bird
    bird.update(dt);

    // spawn pipes
    if(spawnTimer >= spawnInterval){
      spawnTimer = 0;
      spawnPipe();
    }

    // move pipes
    for(const p of pipes){
      p.x -= pipeSpeed * dt;
    }
    // remove offscreen
    pipes = pipes.filter(p => p.x + p.w > -80);

    // collisions + score
    const b = { x: bird.x, y: bird.y, r: bird.r };
    for(const p of pipes){
      // score when center crossed
      if(!p.passed && p.x + p.w < b.x){
        p.passed = true;
        score += 1;
        uiScore.textContent = String(score);
        beep(520, .06, 'square', .05);
      }
      // collision with top rect
      if(circleRectOverlap(b.x, b.y, b.r, p.x, p.top.y, p.w, p.top.h) ||
         circleRectOverlap(b.x, b.y, b.r, p.x, p.bottom.y, p.w, p.bottom.h)){
        setGameOver();
      }
    }
    // ground/sky bounds
    if(bird.y - bird.r < 0 || bird.y + bird.r > H()){
      setGameOver();
    }
  }

  function circleRectOverlap(cx, cy, cr, rx, ry, rw, rh){
    const nearestX = Math.max(rx, Math.min(cx, rx+rw));
    const nearestY = Math.max(ry, Math.min(cy, ry+rh));
    const dx = cx - nearestX;
    const dy = cy - nearestY;
    return (dx*dx + dy*dy) < (cr*cr);
  }

  // Drawing
  function drawBackground(){
    // sky gradient already from CSS; draw layers (clouds, hills) for parallax
    const w = canvas.clientWidth, h = canvas.clientHeight;
    // clouds
    const t = time * 0.2;
    drawCloud( (w*0.1 + (time*30)% (w+200)) - 200, h*0.18, 60);
    drawCloud( (w*0.5 + (time*50)% (w+220)) - 220, h*0.28, 50);
    drawCloud( (w*0.8 + (time*40)% (w+240)) - 240, h*0.22, 55);
    // ground band
    ctx.fillStyle = '#00c16a';
    ctx.fillRect(0, h-60, w, 60);
    // dirt stripe
    ctx.fillStyle = '#ffce6d';
    ctx.fillRect(0, h-40, w, 20);
  }

  function drawCloud(x,y,s){
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.beginPath();
    ctx.arc(x, y, s*0.6, 0, Math.PI*2);
    ctx.arc(x+s*0.4, y-10, s*0.5, 0, Math.PI*2);
    ctx.arc(x+s*0.9, y, s*0.6, 0, Math.PI*2);
    ctx.arc(x+s*0.5, y+10, s*0.55, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  function drawPipes(){
    for(const p of pipes){
      drawPipe(p.x, p.top.y, p.w, p.top.h, true);
      drawPipe(p.x, p.bottom.y, p.w, p.bottom.h, false);
    }
  }

  function drawPipe(x,y,w,h,isTop){
    ctx.save();
    const grad = ctx.createLinearGradient(x, y, x+w, y+h);
    grad.addColorStop(0, '#38ef7d');
    grad.addColorStop(1, '#11998e');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    // lip
    const lipH = 18;
    ctx.fillStyle = 'rgba(0,0,0,.15)';
    if(isTop){
      ctx.fillRect(x-4, y+h-2, w+8, lipH);
    } else {
      ctx.fillRect(x-4, y- lipH + 2, w+8, lipH);
    }
    // stripes
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    for(let i=0;i<4;i++){
      ctx.fillRect(x+6+i*14, y+4, 6, h-8);
    }
    ctx.restore();
  }

  function drawUI(){
    // live score at center top
    if(started && !gameOver){
      ctx.save();
      ctx.font = 'bold 28px system-ui, -apple-system, Segoe UI, Roboto, Arial';
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.textAlign = 'center';
      ctx.fillText(String(score), canvas.clientWidth/2 + 2, 52+2);
      ctx.fillStyle = '#fff';
      ctx.fillText(String(score), canvas.clientWidth/2, 52);
      ctx.restore();
    }
  }

  // Main loop
  let last = performance.now();
  function loop(now){
    const dt = Math.min(0.033, (now-last)/1000);
    last = now;
    if(!paused){
      ctx.clearRect(0,0,canvas.clientWidth, canvas.clientHeight);
      drawBackground();
      drawPipes();
      bird.draw();
      drawUI();
      update(dt);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Start state
  reset();

})();