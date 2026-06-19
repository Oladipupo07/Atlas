// ATLAS AI HUD - CORE LOGIC ENGINE (v4.0.9)

// ----------------------------------------------------
// 1. SOUND GENERATION SYSTEM (Web Audio API Synthesizer)
// ----------------------------------------------------
let audioCtx = null;

function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playHUDsfx(type) {
  try {
    initAudioContext();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;

    switch (type) {
      case 'click': {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1000, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }
      case 'keypress': {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      }
      case 'success': {
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(600, now);
        osc1.frequency.setValueAtTime(900, now + 0.08);
        osc1.frequency.setValueAtTime(1200, now + 0.16);
        
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0.005, now + 0.3);
        
        osc1.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc1.start(now);
        osc1.stop(now + 0.3);
        break;
      }
      case 'diagnostic': {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(2000, now + 1.2);
        
        // Lowpass filter for sci-fi sweep sound
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.Q.setValueAtTime(10, now);

        gain.gain.setValueAtTime(0.03, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 1.2);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start(now);
        osc.stop(now + 1.2);
        break;
      }
      case 'warning': {
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc1.type = 'sawtooth';
        osc2.type = 'sine';
        
        osc1.frequency.setValueAtTime(180, now);
        osc1.frequency.linearRampToValueAtTime(150, now + 0.5);
        osc2.frequency.setValueAtTime(183, now);
        osc2.frequency.linearRampToValueAtTime(153, now + 0.5);
        
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.5);
        osc2.stop(now + 0.5);
        break;
      }
      case 'hum': {
        // Subtle computer hum
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(60, now);
        gain.gain.setValueAtTime(0.015, now);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        // Returns the oscillator so we can stop it later
        return osc;
      }
    }
  } catch (e) {
    console.error('Audio synthesis failed', e);
  }
}

// ----------------------------------------------------
// 2. STATE MANAGEMENT & WIDGET CONFIGURATION
// ----------------------------------------------------
const state = {
  activeProtocol: 'STANDBY',
  uptime: 252, // initial uptime in seconds
  cpu: 24,
  mem: 48,
  net: 12,
  coreTemp: 42,
  coreMode: 'safe', // safe, overdrive, critical
  shieldIntegrity: 100,
  activeModules: {
    weapons: true,
    navigation: true,
    environment: true,
    holography: true
  },
  selectedArmorPart: 'helmet',
  armorStatus: {
    helmet: { name: 'NANO-COMPASS TACTICAL MASK', integrity: 100, status: 'OPTIMAL', weapon: 'HUD TARGET LOCK' },
    chest: { name: 'MARK VIII ARC REACTOR CASING', integrity: 100, status: 'OPTIMAL', weapon: 'UNIBEAM CANNON' },
    'left-arm': { name: 'LEFT VIBRANIUM repulsor SLEEVE', integrity: 100, status: 'OPTIMAL', weapon: 'REPULSOR RAY' },
    'right-arm': { name: 'RIGHT VIBRANIUM repulsor SLEEVE', integrity: 100, status: 'OPTIMAL', weapon: 'REPULSOR RAY / MISSILE' },
    'left-leg': { name: 'LEFT REINFORCED FLIGHT STABILIZER', integrity: 100, status: 'OPTIMAL', weapon: 'THRUSTER STABILIZER' },
    'right-leg': { name: 'RIGHT REINFORCED FLIGHT STABILIZER', integrity: 100, status: 'OPTIMAL', weapon: 'THRUSTER STABILIZER' }
  },
  isListening: false,
  isSpeaking: false,
  weatherQuery: 'Malibu, CA'
};

// ----------------------------------------------------
// 3. VOICE ENGINE (Speech Recognition & Speech Synthesis)
// ----------------------------------------------------
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let synthesisUtterance = null;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    state.isListening = true;
    updateMicUI();
    writeConsoleLine('Synaptic audio receptor active. Awaiting voice telemetry...', 'cmd-highlight');
  };

  recognition.onresult = (event) => {
    const speechToText = event.results[0][0].transcript;
    document.getElementById('voice-caption-output').innerText = `"${speechToText}"`;
    writeConsoleLine(`Voice Payload: "${speechToText}"`, 'cmd-highlight');
    processInputDirective(speechToText);
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error', event);
    writeConsoleLine(`Receptor malfunction: ${event.error}`, 'cmd-error');
    state.isListening = false;
    updateMicUI();
  };

  recognition.onend = () => {
    state.isListening = false;
    updateMicUI();
  };
} else {
  console.warn('Speech Recognition API not supported in this browser.');
}

function speakAsAtlas(text) {
  if ('speechSynthesis' in window) {
    // Cancel any current speaking
    window.speechSynthesis.cancel();

    synthesisUtterance = new SpeechSynthesisUtterance(text);
    
    // Choose appropriate voice
    const voices = window.speechSynthesis.getVoices();
    // Prefer English male voice if possible to match Jarvis style
    let voice = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('male'));
    if (!voice) {
      voice = voices.find(v => v.lang.startsWith('en'));
    }
    if (voice) synthesisUtterance.voice = voice;

    synthesisUtterance.rate = 1.05; // Slightly rapid, smart tone
    synthesisUtterance.pitch = 0.95; // Deep resonance

    synthesisUtterance.onstart = () => {
      state.isSpeaking = true;
      updateMicUI();
    };

    synthesisUtterance.onend = () => {
      state.isSpeaking = false;
      updateMicUI();
    };

    synthesisUtterance.onerror = () => {
      state.isSpeaking = false;
      updateMicUI();
    };

    window.speechSynthesis.speak(synthesisUtterance);
  } else {
    // Fallback if no TTS
    console.warn('Speech Synthesis not supported.');
  }

  // Display Atlas's response caption
  document.getElementById('voice-caption-output').innerText = `"Atlas: ${text}"`;
  writeConsoleLine(`Atlas: ${text}`);
}

// ----------------------------------------------------
// 4. COMMAND TELEMETRY PROCESSING (Direct Console / Voice)
// ----------------------------------------------------
function processInputDirective(input) {
  const clean = input.trim().toLowerCase();
  
  if (clean.startsWith('/') || clean.startsWith('atlas')) {
    // Normalize command prefix
    let cmd = clean;
    if (clean.startsWith('atlas ')) {
      cmd = '/' + clean.replace('atlas ', '');
    } else if (!clean.startsWith('/')) {
      cmd = '/' + clean;
    }

    const args = cmd.split(' ');
    const primary = args[0];

    writeLogEntry(`Executing directive: ${primary}`, 'sys-msg');

    switch (primary) {
      case '/help':
        speakAsAtlas("Commands registered: help, status, diagnose, power, shield, weather, activate, deactivate, notepad, calc, screenshot, lock, volume, torch, vibrate, toast, specs, clear.");
        writeConsoleLine("Available commands:");
        writeConsoleLine("  <span class='cmd-highlight'>/status</span> - Request full dashboard metrics review.");
        writeConsoleLine("  <span class='cmd-highlight'>/diagnose</span> - Launch general sub-system sweep sequence.");
        writeConsoleLine("  <span class='cmd-highlight'>/power [stable/overdrive/critical]</span> - Modulate Arc Core outlet.");
        writeConsoleLine("  <span class='cmd-highlight'>/shield [value]</span> - Adjust defense matrices.");
        writeConsoleLine("  <span class='cmd-highlight'>/weather [query]</span> - Request weather scanners targeting location.");
        writeConsoleLine("  <span class='cmd-highlight'>/activate [module]</span> - Toggle system registry module.");
        writeConsoleLine("  <span class='cmd-highlight'>/notepad</span> - Launch host system Notepad application.");
        writeConsoleLine("  <span class='cmd-highlight'>/calc</span> - Launch host system Calculator.");
        writeConsoleLine("  <span class='cmd-highlight'>/screenshot</span> - Trigger and render a desktop screenshot.");
        writeConsoleLine("  <span class='cmd-highlight'>/lock</span> - Lock the Windows host workstation.");
        writeConsoleLine("  <span class='cmd-highlight'>/volume [up/down/mute]</span> - Modulate host audio levels.");
        writeConsoleLine("  <span class='cmd-highlight'>/torch</span> - Toggle mobile device camera flashlight.");
        writeConsoleLine("  <span class='cmd-highlight'>/vibrate</span> - Trigger native tactile haptic feedback pulse.");
        writeConsoleLine("  <span class='cmd-highlight'>/toast</span> - Broadcast mobile screen banner notification.");
        writeConsoleLine("  <span class='cmd-highlight'>/specs</span> - Fetch native hardware device parameters.");
        writeConsoleLine("  <span class='cmd-highlight'>/clear</span> - Flush visual HUD terminal logs.");
        break;

      case '/status':
        speakAsAtlas(`System status nominal. CPU core running at ${state.cpu} percent, temperature stable at ${state.coreTemp} degrees Celsius, Reactor power core running on protocol ${state.coreMode.toUpperCase()}.`);
        break;

      case '/diagnose':
        runSubsystemDiagnostics();
        break;

      case '/power': {
        const mode = args[1] ? args[1] : 'stable';
        if (['stable', 'overdrive', 'critical', 'safe'].includes(mode)) {
          const finalMode = mode === 'stable' ? 'safe' : mode;
          const matchingBtn = document.querySelector(`.core-btn.btn-${finalMode === 'safe' ? 'cyan' : finalMode === 'overdrive' ? 'orange' : 'danger'}`);
          setCoreProtocol(finalMode, matchingBtn);
        } else {
          speakAsAtlas("Invalid core modulation request. Choose stable, overdrive, or critical.");
        }
        break;
      }

      case '/shield': {
        const val = parseInt(args[1]);
        if (!isNaN(val) && val >= 0 && val <= 100) {
          state.shieldIntegrity = val;
          document.getElementById('shield-integrity-display').innerText = `${val}%`;
          speakAsAtlas(`Adjusting shields to ${val} percent capacity.`);
          writeLogEntry(`Shield regulation output set to ${val}%`, 'ok-msg');
        } else {
          speakAsAtlas("Shield range must be specified between zero and one hundred percent.");
        }
        break;
      }

      case '/weather': {
        const q = args.slice(1).join(' ') || 'Malibu';
        state.weatherQuery = q;
        fetchWeather();
        break;
      }

      case '/activate': {
        const mod = args[1];
        if (state.activeModules.hasOwnProperty(mod)) {
          state.activeModules[mod] = true;
          const btn = document.getElementById(`btn-${mod}`);
          if (btn) btn.classList.add('active');
          speakAsAtlas(`Registry module ${mod} is now online.`);
          writeLogEntry(`Module online: ${mod.toUpperCase()}`, 'ok-msg');
        } else {
          speakAsAtlas("Requested registry module not found in system manifest.");
        }
        break;
      }

      case '/deactivate': {
        const mod = args[1];
        if (state.activeModules.hasOwnProperty(mod)) {
          state.activeModules[mod] = false;
          const btn = document.getElementById(`btn-${mod}`);
          if (btn) btn.classList.remove('active');
          speakAsAtlas(`Shutting down matrix module ${mod}.`);
          writeLogEntry(`Module offline: ${mod.toUpperCase()}`, 'warn-msg');
        } else {
          speakAsAtlas("Requested registry module not found.");
        }
        break;
      }

      case '/notepad':
        triggerHostAction('open:notepad');
        break;

      case '/calc':
      case '/calculator':
        triggerHostAction('open:calc');
        break;

      case '/screenshot':
        triggerHostAction('sys:screenshot');
        break;

      case '/lock':
        triggerHostAction('sys:lock');
        break;

      case '/volume': {
        const dir = args[1];
        if (dir === 'up') triggerHostAction('media:volup');
        else if (dir === 'down') triggerHostAction('media:voldown');
        else if (dir === 'mute') triggerHostAction('media:mute');
        else speakAsAtlas("Volume directive parameter must be specified as up, down, or mute.");
        break;
      }

      case '/torch':
      case '/flashlight':
        triggerMobileAction('torch');
        break;

      case '/vibrate':
      case '/haptic':
        triggerMobileAction('haptic');
        break;

      case '/toast':
        triggerMobileAction('toast');
        break;

      case '/specs':
      case '/device':
        triggerMobileAction('specs');
        break;

      case '/clear':
        clearSecureLogs();
        const logsContainer = document.getElementById('console-logs-container');
        logsContainer.innerHTML = `<div class="console-line">Atlas Matrix Operational. Type <span class="cmd-highlight">/help</span> for instruction manifest.</div>`;
        playHUDsfx('click');
        break;

      default:
        speakAsAtlas(`Unknown directive ${primary}. Please consult the instruction matrix by typing help.`);
    }
  } else {
    // Natural language triggers
    if (clean.includes('who are you') || clean.includes('introduce')) {
      speakAsAtlas("I am ATLAS, your tactical command and integrated intelligence matrix. Ready for instructions.");
    } else if (clean.includes('status') || clean.includes('how are you')) {
      speakAsAtlas(`Current telemetry: Uptime ${formatUptime(state.uptime)}, computational integrity optimized. Reactor Core stability at ${100 - (state.coreMode === 'critical' ? 30 : 0)} percent.`);
    } else if (clean.includes('diagnose') || clean.includes('diagnostic')) {
      runSubsystemDiagnostics();
    } else if (clean.includes('weather') || clean.includes('temperature outside')) {
      fetchWeather();
    } else if (clean.includes('protocol overdrive') || clean.includes('activate overdrive')) {
      const overdriveBtn = document.querySelector('.btn-orange');
      setCoreProtocol('overdrive', overdriveBtn);
    } else if (clean.includes('open notepad') || clean.includes('launch notepad')) {
      triggerHostAction('open:notepad');
    } else if (clean.includes('open calculator') || clean.includes('launch calculator')) {
      triggerHostAction('open:calc');
    } else if (clean.includes('take screenshot') || clean.includes('capture screen') || clean.includes('screenscan')) {
      triggerHostAction('sys:screenshot');
    } else if (clean.includes('lock screen') || clean.includes('lock windows') || clean.includes('lock computer')) {
      triggerHostAction('sys:lock');
    } else if (clean.includes('toggle torch') || clean.includes('flashlight')) {
      triggerMobileAction('torch');
    } else if (clean.includes('vibrate phone') || clean.includes('trigger vibration') || clean.includes('tactile')) {
      triggerMobileAction('haptic');
    } else if (clean.includes('show specs') || clean.includes('device diagnostic')) {
      triggerMobileAction('specs');
    } else if (clean.includes('show toast') || clean.includes('toast notification')) {
      triggerMobileAction('toast');
    } else if (clean.includes('weapons offline') || clean.includes('disable weapons')) {
      toggleSystemModule('weapons');
    } else if (clean.includes('red alert') || clean.includes('critical warning') || clean.includes('self destruct')) {
      triggerCriticalEmergency();
    } else {
      speakAsAtlas(`Received auditory command packet. Transmitting to console shell: "${input}"`);
    }
  }
}

// ----------------------------------------------------
// 5. HUD CORE CONTROLLERS & INTERACTIVE WIDGETS
// ----------------------------------------------------

// System Core Pulse
function triggerCorePulse() {
  playHUDsfx('click');
  const node = document.getElementById('atlas-core-node');
  node.style.transform = 'scale(1.2)';
  setTimeout(() => {
    node.style.transform = '';
  }, 200);

  speakAsAtlas("Arc core telemetry updated. Core flow remains fully synchronized.");
  writeLogEntry("Reactor core manually pulsed. Flux densities normal.", "ok-msg");
}

// Core Protocol Settings
function setCoreProtocol(mode, buttonElement) {
  playHUDsfx('click');
  
  // Remove active styling on other buttons
  document.querySelectorAll('.core-btn').forEach(btn => btn.classList.remove('active'));
  if (buttonElement) buttonElement.classList.add('active');

  const cardCore = document.getElementById('card-atlas-core');
  cardCore.classList.remove('core-overdrive', 'core-critical');

  const statusDot = document.querySelector('.hud-header .status-dot');
  statusDot.className = 'status-dot'; // clear

  const systemProtocolDisplay = document.getElementById('system-protocol-display');

  if (mode === 'safe') {
    state.coreMode = 'safe';
    state.coreTemp = 42;
    state.cpu = 24;
    statusDot.classList.add('pulsing-green');
    systemProtocolDisplay.innerText = "PROTOCOL: STANDBY";
    speakAsAtlas("Arc Core regulated to stable mode. Ambient thermal output forty-two degrees.");
    writeLogEntry("Arc Reactor modulated to Safe State. Thermal stabilization complete.", "ok-msg");
  } 
  else if (mode === 'overdrive') {
    state.coreMode = 'overdrive';
    state.coreTemp = 68;
    state.cpu = 72;
    cardCore.classList.add('core-overdrive');
    statusDot.classList.add('pulsing-orange');
    systemProtocolDisplay.innerText = "PROTOCOL: OVERDRIVE";
    speakAsAtlas("Warning. Core outlet modulated to maximum bandwidth. Temperature rising.");
    writeLogEntry("Arc Reactor modulated to Overdrive State. Warning: Increased thermal flux.", "warn-msg");
  } 
  else if (mode === 'critical') {
    state.coreMode = 'critical';
    state.coreTemp = 99;
    state.cpu = 95;
    cardCore.classList.add('core-critical');
    statusDot.classList.add('pulsing-red');
    systemProtocolDisplay.innerText = "PROTOCOL: CRITICAL THRESHOLD";
    speakAsAtlas("Alert! Core reactor thermal output exceeding critical tolerance levels. Acknowledgment required.");
    writeLogEntry("CRITICAL ARC INTRUSION. THERMAL OUTFLOW EXCEEDS MAXIMUM THRESHOLD.", "err-msg");
    triggerCriticalEmergency();
  }

  // Update HUD displays
  document.getElementById('core-temp-display').innerText = `${state.coreTemp}°C`;
  document.getElementById('cpu-percent').innerText = `${state.cpu}%`;
  document.getElementById('cpu-bar').style.width = `${state.cpu}%`;
}

// Sub-System Diagnostic Sequence
function runSubsystemDiagnostics() {
  playHUDsfx('diagnostic');
  speakAsAtlas("Initializing full matrix sub-system sweep. Diagnostic telemetry mapping active.");
  writeLogEntry("Diagnostic sweep initialized...", "sys-msg");

  let progress = 0;
  const originalProtocol = state.activeProtocol;
  document.getElementById('system-protocol-display').innerText = "PROTOCOL: DIAGNOSTICS ACTIVE";

  const interval = setInterval(() => {
    progress += 25;
    writeLogEntry(`Sweep verification: ${progress}% complete.`, 'sys-msg');
    
    // Simulate metrics spikes during diagnostic
    document.getElementById('cpu-percent').innerText = `${Math.floor(Math.random() * 40) + 50}%`;
    document.getElementById('mem-percent').innerText = `${Math.floor(Math.random() * 20) + 60}%`;

    if (progress >= 100) {
      clearInterval(interval);
      playHUDsfx('success');
      speakAsAtlas("Sub-system sweep complete. All operational nodes reporting normal status matrix.");
      writeLogEntry("Diagnostic sweep complete. Status: OPTIMAL.", "ok-msg");
      document.getElementById('system-protocol-display').innerText = `PROTOCOL: ${state.coreMode.toUpperCase()}`;
      
      // Reset diagnostic bars to target values
      document.getElementById('cpu-percent').innerText = `${state.cpu}%`;
      document.getElementById('cpu-bar').style.width = `${state.cpu}%`;
      document.getElementById('mem-percent').innerText = `${state.mem}%`;
      document.getElementById('mem-bar').style.width = `${state.mem}%`;
    }
  }, 400);
}

// Module toggles
function toggleSystemModule(moduleName) {
  playHUDsfx('click');
  const active = !state.activeModules[moduleName];
  state.activeModules[moduleName] = active;
  
  const btn = document.getElementById(`btn-${moduleName}`);
  if (btn) {
    if (active) {
      btn.classList.add('active');
      btn.innerText = "ONLINE";
      speakAsAtlas(`${moduleName} module coupled.`);
      writeLogEntry(`Module decoupled: ${moduleName.toUpperCase()} is ONLINE`, 'ok-msg');
    } else {
      btn.classList.remove('active');
      btn.innerText = "OFFLINE";
      speakAsAtlas(`Warning. De-coupling ${moduleName} matrix.`);
      writeLogEntry(`Module offline warning: ${moduleName.toUpperCase()}`, 'warn-msg');
    }
  }
}

// Armor suite section interactions
function selectArmorPart(part) {
  playHUDsfx('click');
  state.selectedArmorPart = part;
  
  // Highlight visually in SVG
  document.querySelectorAll('.armor-part').forEach(p => p.classList.remove('selected'));
  const targetSvgNode = document.getElementById(`suit-${part}`);
  if (targetSvgNode) targetSvgNode.classList.add('selected');

  // Load stats
  const info = state.armorStatus[part];
  document.getElementById('armor-part-title').innerText = info.name;
  document.getElementById('armor-plating-val').innerText = `${info.integrity}%`;
  
  const statusEl = document.getElementById('armor-thermal-val');
  statusEl.innerText = info.status;
  if (info.status === 'OPTIMAL') {
    statusEl.className = 'value text-cyan';
  } else {
    statusEl.className = 'value text-danger';
  }

  document.getElementById('armor-weapons-val').innerText = info.weapon;
}

function toggleArmorPart() {
  playHUDsfx('warning');
  const part = state.selectedArmorPart;
  const current = state.armorStatus[part];
  
  const targetSvgNode = document.getElementById(`suit-${part}`);
  
  if (current.status === 'OPTIMAL') {
    current.status = 'OFFLINE';
    current.integrity = 0;
    if (targetSvgNode) {
      targetSvgNode.classList.remove('part-active');
      targetSvgNode.classList.add('part-inactive');
    }
    speakAsAtlas(`Warning. Decoupled armor component: ${current.name}.`);
    writeLogEntry(`Armor suite warning: component ${part.toUpperCase()} offline`, 'warn-msg');
  } else {
    current.status = 'OPTIMAL';
    current.integrity = 100;
    if (targetSvgNode) {
      targetSvgNode.classList.remove('part-inactive');
      targetSvgNode.classList.add('part-active');
    }
    speakAsAtlas(`Coupled armor component: ${current.name}. Stabilization complete.`);
    writeLogEntry(`Armor component ${part.toUpperCase()} re-stabilized.`, 'ok-msg');
  }

  // Reload pane UI
  selectArmorPart(part);
}

function diagnoseArmor() {
  playHUDsfx('diagnostic');
  const part = state.selectedArmorPart;
  const info = state.armorStatus[part];
  speakAsAtlas(`Calibrating shield vectors and structural integrity for ${info.name}.`);
  writeLogEntry(`Calibrating armor matrix telemetry for ${part.toUpperCase()}...`, 'sys-msg');
  
  setTimeout(() => {
    playHUDsfx('success');
    info.integrity = 100;
    info.status = 'OPTIMAL';
    const targetSvgNode = document.getElementById(`suit-${part}`);
    if (targetSvgNode) {
      targetSvgNode.classList.remove('part-inactive');
      targetSvgNode.classList.add('part-active');
    }
    selectArmorPart(part);
    speakAsAtlas(`Armor calibration completed. Integrity is stable.`);
    writeLogEntry(`Armor calibration completed for ${part.toUpperCase()}. Status verified.`, 'ok-msg');
  }, 1000);
}

// Weather fetch simulation with high-tech details
function fetchWeather() {
  playHUDsfx('click');
  const city = state.weatherQuery;
  speakAsAtlas(`Scanning tropospheric data logs for ${city}.`);
  writeLogEntry(`Accessing atmospheric database scan for ${city.toUpperCase()}...`, 'sys-msg');
  
  // High-tech weather simulation
  setTimeout(() => {
    let temp = "72°F";
    let cond = "CLEAR PROTOCOL SCAN";
    let wind = "6.4 mph NW";
    let hum = "48%";
    
    const lower = city.toLowerCase();
    if (lower.includes('london')) {
      temp = "14°C";
      cond = "DRIZZLE OVERLAY SCAN";
      wind = "12.8 mph SW";
      hum = "82%";
    } else if (lower.includes('tokyo')) {
      temp = "22°C";
      cond = "CLOUDY SCANNERS NORMAL";
      wind = "5.1 mph NE";
      hum = "60%";
    } else if (lower.includes('new york')) {
      temp = "68°F";
      cond = "OVERCAST INTRUSION";
      wind = "10.0 mph E";
      hum = "55%";
    } else if (lower.includes('critical') || lower.includes('alert')) {
      temp = "999°F";
      cond = "THERMONUCLEAR OUTFLOW DETECTED";
      wind = "250.0 mph RADIATION STORM";
      hum = "0%";
    }

    document.getElementById('weather-temp').innerText = temp;
    document.getElementById('weather-condition').innerText = `${city.toUpperCase()} - ${cond}`;
    document.getElementById('weather-wind').innerText = wind;
    document.getElementById('weather-humidity').innerText = hum;
    
    playHUDsfx('success');
    speakAsAtlas(`Scanning complete. Temperature is ${temp}, weather condition is ${cond.toLowerCase()}.`);
    writeLogEntry(`Weather telemetry updated for ${city.toUpperCase()}.`, 'ok-msg');
  }, 800);
}

// Console and secure logs helpers
function writeConsoleLine(htmlContent, className = '') {
  const container = document.getElementById('console-logs-container');
  const line = document.createElement('div');
  line.className = `console-line ${className}`;
  line.innerHTML = htmlContent;
  container.appendChild(line);
  container.scrollTop = container.scrollHeight;
}

function writeLogEntry(msg, type = 'sys-msg') {
  const logEntries = document.getElementById('secure-log-entries');
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  
  const time = new Date();
  const timeStr = `[${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}:${String(time.getSeconds()).padStart(2, '0')}]`;
  
  entry.innerHTML = `<span class="timestamp">${timeStr}</span> <span class="msg">${msg}</span>`;
  logEntries.appendChild(entry);
  logEntries.scrollTop = logEntries.scrollHeight;
}

function clearSecureLogs() {
  document.getElementById('secure-log-entries').innerHTML = '';
}

function triggerLoreLog() {
  playHUDsfx('click');
  speakAsAtlas("Decrypting tactical files. Overview logged to secure matrix.");
  writeLogEntry("--- DECLASSIFIED TACTICAL FILE OVERVIEW ---", "sys-msg text-cyan");
  writeLogEntry("PROJECT ATLAS: Mark LXXXV Synaptic Intelligence Interface.", "sys-msg");
  writeLogEntry("PRIMARY CORE: Stabilized Arc Reactor coupling (Malibu Cluster).", "sys-msg");
  writeLogEntry("DESIGN SPEC: Cybernetic speech compiler, sub-orbital navigation radar.", "sys-msg");
  writeLogEntry("DEFENSE MATRIX: Multi-spectrum nano-composite shielding.", "sys-msg");
  writeLogEntry("STATUS: Ready for orbital or atmospheric deployments.", "ok-msg");
}

// Listening status triggers
function toggleVoiceCommand() {
  if (state.isListening) {
    if (recognition) recognition.stop();
  } else {
    initAudioContext();
    if (recognition) {
      recognition.start();
    } else {
      speakAsAtlas("Voice receptor not supported. Please type instructions in the CLI console below.");
    }
  }
}

function updateMicUI() {
  const btn = document.getElementById('btn-mic');
  const bubble = document.getElementById('mic-status-bubble');
  const text = document.getElementById('mic-status-text');

  bubble.className = "listening-status";
  btn.classList.remove('listening');

  if (state.isListening) {
    btn.classList.add('listening');
    bubble.classList.add('status-listening');
    text.innerText = "ATLAS LISTENING MATRIX ACTIVE";
    playHUDsfx('click');
  } else if (state.isSpeaking) {
    bubble.classList.add('status-speaking');
    text.innerText = "ATLAS SPEECH CHIRPING";
  } else {
    text.innerText = "ATLAS COMPILER STANDBY";
  }
}

// Emergency Overlay
function triggerCriticalEmergency() {
  playHUDsfx('warning');
  document.getElementById('alert-overlay').classList.remove('hidden');
}

function dismissAlert() {
  playHUDsfx('click');
  document.getElementById('alert-overlay').classList.add('hidden');
  
  // Return reactor core back to stable
  const stableBtn = document.querySelector('.btn-cyan');
  setCoreProtocol('safe', stableBtn);
  speakAsAtlas("Emergency status overridden. Core temperature nominal.");
  writeLogEntry("Critical emergency overridden manually. Reactor stabilization active.", "ok-msg");
}

// ----------------------------------------------------
// 6. VISUAL RENDERING ENGINES (HTML5 Canvas Animations)
// ----------------------------------------------------

// Canvas Voice Visualizer
function initVoiceVisualizer() {
  const canvas = document.getElementById('voice-visualizer');
  const ctx = canvas.getContext('2d');
  
  function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
  }
  
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  let phase = 0;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;

    ctx.lineWidth = 2;
    
    // Draw grid background lines in visualizer
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Determine visualizer state amplitudes
    let linesCount = 3;
    let amplitude = 6;
    let frequency = 0.02;
    let speed = 0.08;
    let strokeColor = 'rgba(0, 240, 255, 0.5)';
    
    if (state.isSpeaking) {
      amplitude = 22;
      speed = 0.25;
      frequency = 0.04;
      linesCount = 5;
      strokeColor = 'rgba(0, 240, 255, 0.8)';
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(0, 240, 255, 0.7)';
    } else if (state.isListening) {
      amplitude = 15;
      speed = 0.18;
      frequency = 0.09;
      linesCount = 4;
      strokeColor = 'rgba(255, 0, 85, 0.7)';
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(255, 0, 85, 0.7)';
    } else {
      ctx.shadowBlur = 0;
    }

    for (let i = 0; i < linesCount; i++) {
      ctx.strokeStyle = i === 0 ? strokeColor : strokeColor.replace('0.8', '0.2').replace('0.7', '0.15').replace('0.5', '0.1');
      ctx.beginPath();
      
      const linePhase = phase + (i * Math.PI / 4);
      
      for (let x = 0; x < width; x++) {
        // Apply envelope so wave fades at edges
        const envelope = Math.sin((x / width) * Math.PI);
        const y = centerY + Math.sin(x * frequency + linePhase) * amplitude * envelope * (1 - (i * 0.2));
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
    
    // Reset shadow blur
    ctx.shadowBlur = 0;

    phase += speed;
    requestAnimationFrame(draw);
  }

  draw();
}

// Canvas Orbital Radar scanner
function initRadarMap() {
  const canvas = document.getElementById('radar-canvas');
  const ctx = canvas.getContext('2d');
  
  let radarAngle = 0;
  const blips = [
    { x: 140, y: 80, size: 4, label: 'MALIBU MATRIX', pulse: 0 },
    { x: 80, y: 120, size: 3, label: 'ORBITAL-3', pulse: 1 },
    { x: 200, y: 50, size: 2, label: 'DEF MATRIX UNVEIL', pulse: 2 }
  ];

  function drawRadar() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const maxRadius = Math.min(cx, cy) - 10;

    // Draw grid circle overlays
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.lineWidth = 1;
    
    // Draw concentric circles
    for (let r = 20; r <= maxRadius; r += 25) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw grid crosshairs
    ctx.beginPath();
    ctx.moveTo(cx - maxRadius, cy);
    ctx.lineTo(cx + maxRadius, cy);
    ctx.moveTo(cx, cy - maxRadius);
    ctx.lineTo(cx, cy + maxRadius);
    ctx.stroke();

    // Draw Sweep scanner line
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    const endX = cx + Math.cos(radarAngle) * maxRadius;
    const endY = cy + Math.sin(radarAngle) * maxRadius;
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Draw sweep gradient trail
    ctx.fillStyle = 'rgba(0, 240, 255, 0.03)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, maxRadius, radarAngle - 0.25, radarAngle);
    ctx.fill();

    // Draw targets (blips)
    blips.forEach(blip => {
      // Draw blip core
      ctx.fillStyle = 'var(--cyan)';
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'var(--cyan)';
      ctx.beginPath();
      ctx.arc(blip.x, blip.y, blip.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw pulse ring around blip
      blip.pulse += 0.05;
      if (blip.pulse > 8) blip.pulse = 0;
      
      ctx.strokeStyle = `rgba(0, 240, 255, ${1 - (blip.pulse / 8)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(blip.x, blip.y, blip.size + blip.pulse, 0, Math.PI * 2);
      ctx.stroke();

      // Render mini labels
      ctx.fillStyle = 'var(--text-muted)';
      ctx.font = '6px "Share Tech Mono"';
      ctx.fillText(blip.label, blip.x + 8, blip.y + 2);
    });

    radarAngle += 0.015;
    requestAnimationFrame(drawRadar);
  }

  drawRadar();
}

// ----------------------------------------------------
// 7. BOOTSTRAP INITIALIZATION
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Setup clock & date HUD indicators
  setInterval(() => {
    const d = new Date();
    const pad = (v) => String(v).padStart(2, '0');
    
    // Header clock
    const clockText = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} UTC`;
    document.getElementById('hud-clock').innerText = clockText;
    
    // Header date
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const dateText = `${pad(d.getDate())}.${months[d.getMonth()]}.${d.getFullYear()}`;
    document.getElementById('hud-date').innerText = dateText;

    // Increment simulated uptime
    state.uptime++;
    document.getElementById('uptime-display').innerText = formatUptime(state.uptime);

    // Read actual system metrics from backend API
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        // Link statuses
        const linkBadge = document.getElementById('host-link-status');
        linkBadge.className = 'status-badge status-coupled';
        linkBadge.innerText = 'COUPLED';
        
        // Update stats
        state.cpu = data.cpu;
        state.mem = data.mem;
        state.net = data.disk;
        
        if (state.coreMode !== 'critical') {
          document.getElementById('cpu-percent').innerText = `${data.cpu}%`;
          document.getElementById('cpu-bar').style.width = `${data.cpu}%`;
          
          document.getElementById('mem-percent').innerText = `${data.mem}%`;
          document.getElementById('mem-bar').style.width = `${data.mem}%`;
          
          document.getElementById('net-percent').innerText = `${data.disk}%`;
          document.getElementById('net-bar').style.width = `${data.disk}%`;
        }
      })
      .catch(err => {
        // Link server is down or static hosting
        const linkBadge = document.getElementById('host-link-status');
        if (linkBadge) {
          linkBadge.className = 'status-badge status-uncoupled';
          linkBadge.innerText = 'UNCOUPLED';
        }
        
        // Fallback simulate stats when backend server isn't running
        if (state.coreMode !== 'critical') {
          const targetCpu = state.coreMode === 'overdrive' ? 72 : 24;
          const fluxCpu = Math.max(5, Math.min(100, Math.round(targetCpu + (Math.random() * 8 - 4))));
          const fluxMem = Math.max(10, Math.min(100, Math.round(state.mem + (Math.random() * 4 - 2))));
          const fluxNet = Math.max(5, Math.min(100, Math.round(state.net + (Math.random() * 6 - 3))));

          document.getElementById('cpu-percent').innerText = `${fluxCpu}%`;
          document.getElementById('cpu-bar').style.width = `${fluxCpu}%`;
          
          document.getElementById('mem-percent').innerText = `${fluxMem}%`;
          document.getElementById('mem-bar').style.width = `${fluxMem}%`;
          
          document.getElementById('net-percent').innerText = `${fluxNet}%`;
          document.getElementById('net-bar').style.width = `${fluxNet}%`;
        }
      });
  }, 1000);

  // Terminal enter listener
  const inputElement = document.getElementById('console-input');
  inputElement.addEventListener('keydown', (e) => {
    playHUDsfx('keypress');
    
    if (e.key === 'Enter') {
      const query = inputElement.value;
      if (query.trim() !== '') {
        writeConsoleLine(`<span class="console-prompt">ATLAS &gt;</span> ${query}`);
        processInputDirective(query);
        inputElement.value = '';
      }
    }
  });

  // Select first armor part (Helmet) on load
  selectArmorPart('helmet');

  // Trigger visual visualizer loop & radars
  initVoiceVisualizer();
  initRadarMap();

  // Check and initialize Capacitor Mobile layouts
  if (typeof window.Capacitor !== 'undefined') {
    const mobPanel = document.getElementById('mobile-controls-panel');
    if (mobPanel) mobPanel.classList.remove('hidden');
    
    // Poll battery immediately
    const plugins = window.Capacitor.Plugins;
    if (plugins.Device) {
      plugins.Device.getBatteryInfo().then(info => {
        const batteryPercent = Math.round(info.batteryLevel * 100);
        const sourceDisplay = document.getElementById('energy-source-display');
        if (sourceDisplay) sourceDisplay.innerText = `MOBILE BATTERY - ${batteryPercent}%`;
      });
    }
    writeLogEntry("Capacitor core coupled. Native mobile bridges loaded.", "ok-msg");
  }

  // Greeting speech delay to let user load screen
  setTimeout(() => {
    speakAsAtlas("ATLAS online. Matrix networks coupled successfully.");
    writeLogEntry("ATLAS Tactical Shell online. Awaiting directive parameters.", "ok-msg");
  }, 1200);
});

function triggerHostAction(action) {
  playHUDsfx('click');
  writeLogEntry(`Transmitting host control action: ${action.toUpperCase()}`, 'sys-msg');
  
  fetch(`/api/control?action=${action}`)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        playHUDsfx('success');
        speakAsAtlas(data.message);
        writeLogEntry(`Host execution successful: ${data.message}`, 'ok-msg');
        
        // Special case: screenshot display
        if (action === 'sys:screenshot' && data.imageUrl) {
          const area = document.getElementById('screenshot-display-area');
          const thumb = document.getElementById('screenshot-thumbnail');
          // Cache bust URL to reload the image
          thumb.src = data.imageUrl + '?t=' + Date.now();
          area.classList.remove('hidden');
        }
      } else {
        playHUDsfx('warning');
        speakAsAtlas(`Host rejected request: ${data.message}`);
        writeLogEntry(`Host execution rejected: ${data.message}`, 'warn-msg');
      }
    })
    .catch(err => {
      playHUDsfx('warning');
      speakAsAtlas("Failed to communicate with local host system controller.");
      writeLogEntry(`Host connection error. Check server.py status.`, 'err-msg');
    });
}

let torchTrack = null; // WebRTC camera track fallback for light source

function triggerMobileAction(action) {
  playHUDsfx('click');
  writeLogEntry(`Triggering mobile action: ${action.toUpperCase()}`, 'sys-msg');

  if (typeof window.Capacitor !== 'undefined') {
    const plugins = window.Capacitor.Plugins;

    if (action === 'haptic') {
      if (plugins.Haptics) {
        plugins.Haptics.vibrate({ duration: 200 });
        writeLogEntry("Haptic vibration pulse dispatched.", "ok-msg");
      } else if (navigator.vibrate) {
        navigator.vibrate(200);
        writeLogEntry("Browser fallback vibration dispatched.", "ok-msg");
      } else {
        writeLogEntry("Haptic hardware interface unavailable.", "warn-msg");
      }
    } 
    else if (action === 'torch') {
      toggleFlashlight();
    } 
    else if (action === 'toast') {
      if (plugins.Toast) {
        plugins.Toast.show({ text: 'ATLAS: Mobile synaptic coupling secure.' });
      } else {
        alert("ATLAS: Mobile synaptic coupling secure.");
      }
      writeLogEntry("Mobile Toast notification overlay triggered.", "ok-msg");
    } 
    else if (action === 'specs') {
      if (plugins.Device) {
        plugins.Device.getInfo().then(info => {
          speakAsAtlas(`Running on ${info.platform} version ${info.osVersion}. Manufacturer: ${info.manufacturer}.`);
          writeLogEntry(`DEVICE DIAG: ${info.model} | Platform: ${info.platform} | OS: ${info.osVersion}`, 'ok-msg');
        });
      } else {
        speakAsAtlas("Device hardware spec metrics unavailable.");
      }
    }
  } else {
    // Web Fallback actions if not running inside Capacitor
    if (action === 'haptic') {
      if (navigator.vibrate) {
        navigator.vibrate(100);
        writeLogEntry("Vibration triggered via Web API.", "ok-msg");
      } else {
        writeLogEntry("Haptics not supported in this browser environment.", "warn-msg");
      }
    } 
    else if (action === 'torch') {
      toggleFlashlight();
    } 
    else if (action === 'toast') {
      writeLogEntry("Toast notification simulation: Coupling Secure.", "ok-msg");
      speakAsAtlas("Toast notification simulation complete.");
    } 
    else if (action === 'specs') {
      speakAsAtlas(`Web agent browser platform: ${navigator.platform}. User Agent: ${navigator.appName}.`);
      writeLogEntry(`BROWSER DIAG: Platform: ${navigator.platform} | Vendor: ${navigator.vendor}`, 'ok-msg');
    }
  }
}

function toggleFlashlight() {
  if (torchTrack) {
    torchTrack.stop();
    torchTrack = null;
    speakAsAtlas("Torch deactivated.");
    writeLogEntry("Flashlight decoupled.", "warn-msg");
  } else {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          const track = stream.getVideoTracks()[0];
          // Check for torch capability
          const capabilities = track.getCapabilities();
          if (capabilities.torch) {
            track.applyConstraints({ advanced: [{ torch: true }] })
              .then(() => {
                torchTrack = track;
                speakAsAtlas("Torch activated.");
                writeLogEntry("Flashlight coupled and activated.", "ok-msg");
              });
          } else {
            speakAsAtlas("Flashlight hardware interface unavailable on this camera.");
            writeLogEntry("Sensor capability mapping returned no torch option.", "warn-msg");
            track.stop();
          }
        })
        .catch(err => {
          speakAsAtlas("Failed to couple flashlight sensor.");
          writeLogEntry(`Flashlight initialization error: ${err.message}`, "err-msg");
        });
    } else {
      speakAsAtlas("Camera hardware interface unavailable in this secure context.");
    }
  }
}

function toggleScreenshotZoom() {
  playHUDsfx('click');
  const thumb = document.getElementById('screenshot-thumbnail');
  if (thumb.style.maxHeight === 'none') {
    thumb.style.maxHeight = '120px';
  } else {
    thumb.style.maxHeight = 'none';
  }
}

function formatUptime(secs) {
  const pad = (v) => String(v).padStart(2, '0');
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
