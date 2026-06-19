// ATLAS AI ASSISTANT & SMART DEVICE CONTROLLER - CORE LOGIC ENGINE

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
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(60, now);
        gain.gain.setValueAtTime(0.015, now);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        return osc;
      }
    }
  } catch (e) {
    console.error('Audio synthesis failed', e);
  }
}

// ----------------------------------------------------
// 2. STATE MANAGEMENT
// ----------------------------------------------------
const state = {
  uptime: 252, // initial uptime in seconds
  cpu: 24,
  mem: 48,
  net: 12,
  isListening: false,
  isSpeaking: false,
  weatherQuery: 'Malibu, CA',
  hostIP: localStorage.getItem('atlas_host_ip') || 'localhost:2026',
  devices: {
    'living-light': { name: 'Living Room Light', isOn: true },
    'bedroom-light': { name: 'Bedroom Light', isOn: false },
    'thermostat': { name: 'Thermostat', value: 72 },
    'lock': { name: 'Front Door Lock', isOn: true },
    'speaker': { name: 'Smart Speaker', value: 50 },
    'camera': { name: 'Security Camera', isOn: true }
  }
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
    writeLogEntry('Auditory sensor receptor active. Listening...', 'sys-msg');
  };

  recognition.onresult = (event) => {
    const speechToText = event.results[0][0].transcript;
    const voiceCaption = document.getElementById('voice-caption-output');
    if (voiceCaption) voiceCaption.innerText = `"${speechToText}"`;
    addChatMessage('user', speechToText);
    processInputDirective(speechToText);
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error', event);
    writeLogEntry(`Voice receptor error: ${event.error}`, 'err-msg');
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
    window.speechSynthesis.cancel();
    synthesisUtterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    let voice = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('male'));
    if (!voice) {
      voice = voices.find(v => v.lang.startsWith('en'));
    }
    if (voice) synthesisUtterance.voice = voice;

    synthesisUtterance.rate = 1.05;
    synthesisUtterance.pitch = 0.95;

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
  }

  const voiceCaption = document.getElementById('voice-caption-output');
  if (voiceCaption) voiceCaption.innerText = `"${text}"`;
  addChatMessage('atlas', text);
}

function getHostUrl(path) {
  const host = state.hostIP || 'localhost:2026';
  if (host.startsWith('http://') || host.startsWith('https://')) {
    return `${host}${path}`;
  }
  return `http://${host}${path}`;
}

function saveHostIP(val) {
  let cleaned = val.trim();
  if (!cleaned) cleaned = 'localhost:2026';
  state.hostIP = cleaned;
  localStorage.setItem('atlas_host_ip', cleaned);
  writeLogEntry(`Host server target updated to: ${cleaned}`, 'sys-msg');
  
  // Update input field just in case
  const ipInput = document.getElementById('host-ip-address');
  if (ipInput) ipInput.value = cleaned;
  
  // Trigger immediate poll
  if (typeof pollStats === 'function') {
    pollStats();
  }
}

// ----------------------------------------------------
// 4. DEVICE MANAGEMENT FUNCTIONS
// ----------------------------------------------------
function toggleDevice(id, isOn) {
  if (!state.devices[id]) return;
  state.devices[id].isOn = isOn;

  const tile = document.getElementById(`device-${id}`);
  if (tile) {
    if (isOn) {
      tile.classList.remove('device-off');
    } else {
      tile.classList.add('device-off');
    }
  }

  // Update checkmark input state if needed to prevent infinite trigger loops
  const toggleInput = document.querySelector(`#device-${id} input[type="checkbox"]`);
  if (toggleInput && toggleInput.checked !== isOn) {
    toggleInput.checked = isOn;
  }

  playHUDsfx('click');
  writeLogEntry(`${state.devices[id].name} state changed: ${isOn ? 'ON' : 'OFF'}`, isOn ? 'ok-msg' : 'warn-msg');
  speakAsAtlas(`${state.devices[id].name} is now ${isOn ? 'on' : 'off'}.`);
}

let thermostatSpeechTimeout = null;
function setThermostat(val) {
  if (!state.devices['thermostat']) return;
  const numVal = parseInt(val);
  state.devices['thermostat'].value = numVal;
  
  const display = document.getElementById('thermostat-val');
  if (display) display.innerText = numVal;

  const slider = document.querySelector('#device-thermostat input[type="range"]');
  if (slider && slider.value != numVal) {
    slider.value = numVal;
  }

  playHUDsfx('keypress');

  clearTimeout(thermostatSpeechTimeout);
  thermostatSpeechTimeout = setTimeout(() => {
    writeLogEntry(`Thermostat adjusted to ${numVal}°F.`, 'ok-msg');
    speakAsAtlas(`Adjusting the thermostat temperature to ${numVal} degrees.`);
  }, 600);
}

let speakerSpeechTimeout = null;
function setSpeakerVolume(val) {
  if (!state.devices['speaker']) return;
  const numVal = parseInt(val);
  state.devices['speaker'].value = numVal;

  const display = document.getElementById('speaker-vol');
  if (display) display.innerText = numVal;

  const slider = document.querySelector('#device-speaker input[type="range"]');
  if (slider && slider.value != numVal) {
    slider.value = numVal;
  }

  playHUDsfx('keypress');

  clearTimeout(speakerSpeechTimeout);
  speakerSpeechTimeout = setTimeout(() => {
    writeLogEntry(`Speaker volume changed to ${numVal}%.`, 'ok-msg');
    speakAsAtlas(`Setting smart speaker volume to ${numVal} percent.`);
  }, 600);
}

function updateDeviceCheckbox(id, checked) {
  if (state.devices[id] && state.devices[id].hasOwnProperty('isOn')) {
    toggleDevice(id, checked);
  }
}

// Helper to set greeting time dynamically
function initGreetingTime() {
  const d = new Date();
  const pad = (v) => String(v).padStart(2, '0');
  const greetingTime = document.getElementById('greeting-time');
  if (greetingTime) {
    greetingTime.innerText = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}

// ----------------------------------------------------
// 5. CHAT & MESSAGE HISTORY
// ----------------------------------------------------
function sendChatMessage() {
  const inputEl = document.getElementById('chat-input');
  if (!inputEl) return;
  const text = inputEl.value.trim();
  if (!text) return;

  addChatMessage('user', text);
  inputEl.value = '';
  playHUDsfx('click');

  // Process command
  processInputDirective(text);
}

function addChatMessage(sender, text) {
  const chatHistory = document.getElementById('chat-history');
  if (!chatHistory) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-msg ${sender}-msg`;

  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'msg-avatar';
  avatarDiv.innerText = sender === 'user' ? 'U' : 'A';

  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'msg-bubble';

  const nameDiv = document.createElement('div');
  nameDiv.className = 'msg-name';
  nameDiv.innerText = sender === 'user' ? 'User' : 'Atlas';

  const textDiv = document.createElement('div');
  textDiv.className = 'msg-text';
  textDiv.innerHTML = text; // supports HTML markup for lists, styles, etc.

  const timeDiv = document.createElement('div');
  timeDiv.className = 'msg-time';
  const d = new Date();
  const pad = (v) => String(v).padStart(2, '0');
  timeDiv.innerText = `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  bubbleDiv.appendChild(nameDiv);
  bubbleDiv.appendChild(textDiv);
  bubbleDiv.appendChild(timeDiv);

  msgDiv.appendChild(avatarDiv);
  msgDiv.appendChild(bubbleDiv);

  chatHistory.appendChild(msgDiv);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function clearChatHistory() {
  const chatHistory = document.getElementById('chat-history');
  if (chatHistory) {
    chatHistory.innerHTML = `
      <div class="chat-msg atlas-msg">
        <div class="msg-avatar">A</div>
        <div class="msg-bubble">
          <div class="msg-name">Atlas</div>
          <div class="msg-text">Chat logs flushed. I'm online and ready for input parameters.</div>
          <div class="msg-time">${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}</div>
        </div>
      </div>
    `;
  }
  playHUDsfx('click');
  writeLogEntry("Chat logs cleared manually.", "sys-msg");
}

// ----------------------------------------------------
// 6. COMMAND TELEMETRY PROCESSING (Q&A & Direct Directives)
// ----------------------------------------------------
function processInputDirective(input) {
  const clean = input.trim().toLowerCase();
  const d = new Date();
  const pad = (v) => String(v).padStart(2, '0');
  const clockText = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const dateText = `${pad(d.getDate())}.${months[d.getMonth()]}.${d.getFullYear()}`;

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
      case '/help': {
        const helpHTML = `
          <strong>Available ATLAS directives:</strong><br>
          • <code>/help</code> - Render command matrix overview.<br>
          • <code>/status</code> - Query system dashboard performance metrics.<br>
          • <code>/devices</code> - Scan and query connected home device metrics.<br>
          • <code>/toggle [id]</code> - Toggle smart devices (living-light, bedroom-light, lock, camera).<br>
          • <code>/thermostat [60-85]</code> - Regulate heating & cooling target.<br>
          • <code>/volume [0-100/up/down/mute]</code> - Regulate computational audio levels.<br>
          • <code>/diagnose</code> - Trigger standard system sweeps.<br>
          • <code>/weather [query]</code> - Access atmospheric data files.<br>
          • <code>/notepad</code> - Open Notepad on host computer.<br>
          • <code>/calc</code> - Open Calculator on host computer.<br>
          • <code>/screenshot</code> - Take a desktop screenscan.<br>
          • <code>/lock</code> - Secure and lock host workstation.<br>
          • <code>/torch</code> - Toggle camera light source on mobile.<br>
          • <code>/vibrate</code> - Trigger mobile tactile haptic pulses.<br>
          • <code>/toast</code> - Render screen banner notification on mobile.<br>
          • <code>/specs</code> - Retrieve hardware device configuration.<br>
          • <code>/clear</code> - Flush chat message streams.
        `;
        speakAsAtlas("Here are the commands I can execute.");
        addChatMessage('atlas', helpHTML);
        break;
      }

      case '/status': {
        speakAsAtlas(`System status nominal. CPU computational load is at ${state.cpu} percent, memory capacity is at ${state.mem} percent, and the local host link is fully coupled.`);
        break;
      }

      case '/devices': {
        const devList = Object.keys(state.devices).map(id => {
          const dev = state.devices[id];
          const status = dev.hasOwnProperty('isOn') ? (dev.isOn ? '<span class="text-green">ON</span>' : '<span class="text-danger">OFF</span>') : `<span class="text-cyan">${dev.value}${id === 'thermostat' ? '°F' : '%'}</span>`;
          return `• <strong>${dev.name}</strong> (<code>${id}</code>): ${status}`;
        }).join('<br>');
        speakAsAtlas("Displaying smart home device telemetry logs.");
        addChatMessage('atlas', `<strong>Connected Device Matrix:</strong><br>${devList}`);
        break;
      }

      case '/toggle': {
        const id = args[1];
        if (id && state.devices[id] && state.devices[id].hasOwnProperty('isOn')) {
          const newState = !state.devices[id].isOn;
          toggleDevice(id, newState);
        } else {
          speakAsAtlas("Please specify a valid device ID. Valid options: living-light, bedroom-light, lock, camera.");
        }
        break;
      }

      case '/thermostat': {
        const val = parseInt(args[1]);
        if (!isNaN(val) && val >= 60 && val <= 85) {
          setThermostat(val);
        } else {
          speakAsAtlas("Thermostat input must be a numeric value between 60 and 85.");
        }
        break;
      }

      case '/volume': {
        const param = args[1];
        const val = parseInt(param);
        if (!isNaN(val) && val >= 0 && val <= 100) {
          setSpeakerVolume(val);
        } else if (param === 'up') {
          triggerHostAction('media:volup');
        } else if (param === 'down') {
          triggerHostAction('media:voldown');
        } else if (param === 'mute') {
          triggerHostAction('media:mute');
        } else {
          speakAsAtlas("Volume target must be a number (0-100) or up/down/mute.");
        }
        break;
      }

      case '/diagnose': {
        runSubsystemDiagnostics();
        break;
      }

      case '/weather': {
        const q = args.slice(1).join(' ') || 'Malibu';
        state.weatherQuery = q;
        fetchWeather();
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
        clearChatHistory();
        break;

      default:
        speakAsAtlas(`Unknown command: ${primary}. Type /help to view valid parameters.`);
    }
  } else {
    // Natural Language Queries
    if (clean.includes('who are you') || clean.includes('introduce yourself') || clean.includes('what is your name')) {
      speakAsAtlas("I am ATLAS, your intelligent AI Assistant and Smart Device Controller. I can regulate smart home tiles, run host telemetry sequences, launch applications, and process conversational queries.");
    } 
    else if (clean.includes('status') || clean.includes('how are you') || clean.includes('diagnostics')) {
      speakAsAtlas(`System metrics are fully optimized. Computational CPU usage at ${state.cpu} percent, RAM capacity at ${state.mem} percent, and server host link is active. Uptime is currently ${formatUptime(state.uptime)}.`);
    } 
    else if (clean.includes('time')) {
      speakAsAtlas(`The current system time is ${clockText}.`);
    } 
    else if (clean.includes('date') || clean.includes('today')) {
      speakAsAtlas(`Today's date is ${dateText}.`);
    } 
    else if (clean.includes('joke')) {
      const jokes = [
        "Why did the smart speaker go to school? Because it wanted to improve its volume of knowledge!",
        "How many smart lights does it take to change a light bulb? None, they just update their firmware!",
        "Why did the thermostat break up with the air conditioning system? They kept having too many heated arguments."
      ];
      const selected = jokes[Math.floor(Math.random() * jokes.length)];
      speakAsAtlas(selected);
    } 
    else if (clean.includes('weather') || clean.includes('temperature outside')) {
      const weatherMatch = clean.match(/weather in\s*([a-zA-Z\s]+)/) || clean.match(/weather for\s*([a-zA-Z\s]+)/);
      if (weatherMatch) {
        state.weatherQuery = weatherMatch[1];
      }
      fetchWeather();
    } 
    // Device intents parsed naturally
    else if (clean.includes('turn on') || clean.includes('activate') || clean.includes('enable')) {
      if (clean.includes('living')) {
        updateDeviceCheckbox('living-light', true);
      } else if (clean.includes('bedroom')) {
        updateDeviceCheckbox('bedroom-light', true);
      } else if (clean.includes('lock') || clean.includes('door')) {
        updateDeviceCheckbox('lock', true);
      } else if (clean.includes('camera') || clean.includes('security')) {
        updateDeviceCheckbox('camera', true);
      } else {
        speakAsAtlas("Which device would you like to turn on? You can specify living room light, bedroom light, door lock, or camera.");
      }
    } 
    else if (clean.includes('turn off') || clean.includes('deactivate') || clean.includes('disable') || clean.includes('unlock') || clean.includes('open door')) {
      if (clean.includes('living')) {
        updateDeviceCheckbox('living-light', false);
      } else if (clean.includes('bedroom')) {
        updateDeviceCheckbox('bedroom-light', false);
      } else if (clean.includes('lock') || clean.includes('door') || clean.includes('unlock')) {
        updateDeviceCheckbox('lock', false);
      } else if (clean.includes('camera') || clean.includes('security')) {
        updateDeviceCheckbox('camera', false);
      } else {
        speakAsAtlas("Which device would you like to turn off? You can specify living room light, bedroom light, door lock, or camera.");
      }
    } 
    // Host triggers parsed naturally
    else if (clean.includes('open notepad') || clean.includes('launch notepad')) {
      triggerHostAction('open:notepad');
    } 
    else if (clean.includes('open calculator') || clean.includes('launch calculator')) {
      triggerHostAction('open:calc');
    } 
    else if (clean.includes('open browser') || clean.includes('launch browser')) {
      triggerHostAction('open:browser');
    } 
    else if (clean.includes('take screenshot') || clean.includes('capture screen')) {
      triggerHostAction('sys:screenshot');
    } 
    else if (clean.includes('lock screen') || clean.includes('lock computer')) {
      triggerHostAction('sys:lock');
    } 
    else if (clean.includes('volume up') || clean.includes('louder')) {
      triggerHostAction('media:volup');
    } 
    else if (clean.includes('volume down') || clean.includes('quieter')) {
      triggerHostAction('media:voldown');
    } 
    else if (clean.includes('mute audio')) {
      triggerHostAction('media:mute');
    } 
    // Mobile integrations parsed naturally
    else if (clean.includes('torch') || clean.includes('flashlight')) {
      triggerMobileAction('torch');
    } 
    else if (clean.includes('vibrate') || clean.includes('buzz')) {
      triggerMobileAction('haptic');
    } 
    else if (clean.includes('specs') || clean.includes('hardware details')) {
      triggerMobileAction('specs');
    } 
    // Basic calculator capability
    else if (/(?:calculate|compute|solve)?\s*([\d\s+\-*\/().]+)/.test(clean) && /[\d]/.test(clean) && /[+\-*\/]/.test(clean)) {
      try {
        const mathMatch = clean.match(/(?:calculate|compute|solve)?\s*([\d\s+\-*\/().]+)/);
        const expr = mathMatch[1].replace(/[^0-9+\-*\/().\s]/g, '');
        const result = Function(`"use strict"; return (${expr})`)();
        speakAsAtlas(`That calculates to ${result}.`);
      } catch (e) {
        speakAsAtlas("I wasn't able to process that mathematical expression. Please check your numbers.");
      }
    } 
    else if (clean.includes('red alert') || clean.includes('critical warning') || clean.includes('emergency')) {
      triggerCriticalEmergency();
    }
    // Conversational fallback
    else {
      speakAsAtlas(`I've received your query: "${input}". Since I am running in local dashboard mode, you can type /help to review specific control commands.`);
    }
  }
}

// ----------------------------------------------------
// 7. CORE ASSISTANT VISUALS & ACTIONS
// ----------------------------------------------------
function triggerCorePulse() {
  playHUDsfx('click');
  const node = document.getElementById('atlas-core-node');
  if (node) {
    node.style.transform = 'scale(1.2)';
    setTimeout(() => {
      node.style.transform = '';
    }, 200);
  }

  speakAsAtlas("Atlas core database synchronized. All cognitive loops running at optimal latency.");
  writeLogEntry("AI core manual pulse executed. Synaptic links online.", "ok-msg");
}

function runSubsystemDiagnostics() {
  playHUDsfx('diagnostic');
  speakAsAtlas("Initializing full matrix sub-system sweep. Diagnostic telemetry mapping active.");
  writeLogEntry("Diagnostic sweep initialized...", "sys-msg");

  let progress = 0;
  const sysProtocol = document.getElementById('system-protocol-display');
  if (sysProtocol) sysProtocol.innerText = "DIAGNOSTICS ACTIVE";

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
      if (sysProtocol) sysProtocol.innerText = "ONLINE";
      
      // Reset displays
      document.getElementById('cpu-percent').innerText = `${state.cpu}%`;
      document.getElementById('mem-percent').innerText = `${state.mem}%`;
    }
  }, 400);
}

// Weather fetch simulation
function fetchWeather() {
  playHUDsfx('click');
  const city = state.weatherQuery;
  speakAsAtlas(`Accessing meteorological forecast tables for ${city}.`);
  writeLogEntry(`Contacting satellite servers for atmospheric data at ${city.toUpperCase()}...`, 'sys-msg');
  
  setTimeout(() => {
    let temp = "72°F";
    let cond = "Sunny Skies - Calm";
    let wind = "6.4 mph NW";
    let hum = "48%";
    
    const lower = city.toLowerCase();
    if (lower.includes('london')) {
      temp = "14°C";
      cond = "Overcast Overlay - Light Drizzle";
      wind = "12.8 mph SW";
      hum = "82%";
    } else if (lower.includes('tokyo')) {
      temp = "22°C";
      cond = "Cloudy - Calm";
      wind = "5.1 mph NE";
      hum = "60%";
    } else if (lower.includes('new york')) {
      temp = "68°F";
      cond = "Partly Cloudy";
      wind = "10.0 mph E";
      hum = "55%";
    } else if (lower.includes('critical') || lower.includes('alert') || lower.includes('storm')) {
      temp = "99°F";
      cond = "Severe Winds - Meteorological Alert";
      wind = "85.0 mph Gale";
      hum = "95%";
    }

    // Since we don't have separate HUD fields for weather anymore (they are inside Q&A logs), 
    // let's speak the weather and output it beautifully in the chat
    speakAsAtlas(`Tropospheric scan complete. Weather in ${city} is currently ${temp} and ${cond.toLowerCase()} with winds at ${wind}.`);
    writeLogEntry(`Atmospheric metrics loaded for ${city.toUpperCase()}.`, 'ok-msg');
  }, 800);
}

function writeLogEntry(msg, type = 'sys-msg') {
  const logEntries = document.getElementById('secure-log-entries');
  if (!logEntries) return;

  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  
  const time = new Date();
  const timeStr = `[${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}:${String(time.getSeconds()).padStart(2, '0')}]`;
  
  entry.innerHTML = `<span class="timestamp">${timeStr}</span> <span class="msg">${msg}</span>`;
  logEntries.appendChild(entry);
  logEntries.scrollTop = logEntries.scrollHeight;
}

function clearSecureLogs() {
  const logEntries = document.getElementById('secure-log-entries');
  if (logEntries) logEntries.innerHTML = '';
  playHUDsfx('click');
  writeLogEntry("Activity logs cleared.", "sys-msg");
}

function toggleVoiceCommand() {
  if (state.isListening) {
    if (recognition) recognition.stop();
  } else {
    initAudioContext();
    if (recognition) {
      recognition.start();
    } else {
      speakAsAtlas("Voice speech recognition is not supported in this browser. Please type instructions in the chat box.");
    }
  }
}

function updateMicUI() {
  const btn = document.getElementById('btn-mic');
  const bubble = document.getElementById('mic-status-bubble');
  const text = document.getElementById('mic-status-text');

  if (!btn || !bubble || !text) return;

  bubble.className = "listening-status";
  btn.classList.remove('listening');

  if (state.isListening) {
    btn.classList.add('listening');
    bubble.classList.add('status-listening');
    text.innerText = "LISTENING";
    playHUDsfx('click');
  } else if (state.isSpeaking) {
    bubble.classList.add('status-speaking');
    text.innerText = "SPEAKING";
  } else {
    text.innerText = "STANDBY";
  }
}

// Emergency Overlay
function triggerCriticalEmergency() {
  playHUDsfx('warning');
  const overlay = document.getElementById('alert-overlay');
  const msg = document.getElementById('alert-message');
  if (overlay) overlay.classList.remove('hidden');
  if (msg) msg.innerText = "CRITICAL HARDWARE OVERLOAD OR SYSTEM DIRECTIVE INTRUSION DETECTED.";
}

function dismissAlert() {
  playHUDsfx('click');
  const overlay = document.getElementById('alert-overlay');
  if (overlay) overlay.classList.add('hidden');
  speakAsAtlas("Emergency status overridden. Core temperature nominal.");
  writeLogEntry("Critical emergency overridden manually. Reactor stabilization active.", "ok-msg");
}

// ----------------------------------------------------
// 8. VISUAL RENDERING ENGINES (HTML5 Canvas Animations)
// ----------------------------------------------------
function initVoiceVisualizer() {
  const canvas = document.getElementById('voice-visualizer');
  if (!canvas) return;
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
    
    ctx.strokeStyle = 'rgba(129, 140, 248, 0.08)';
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    let linesCount = 3;
    let amplitude = 6;
    let frequency = 0.02;
    let speed = 0.08;
    let strokeColor = 'rgba(34, 211, 238, 0.5)'; // cyan
    
    if (state.isSpeaking) {
      amplitude = 22;
      speed = 0.25;
      frequency = 0.04;
      linesCount = 5;
      strokeColor = 'rgba(129, 140, 248, 0.8)'; // accent
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(129, 140, 248, 0.7)';
    } else if (state.isListening) {
      amplitude = 15;
      speed = 0.18;
      frequency = 0.09;
      linesCount = 4;
      strokeColor = 'rgba(248, 113, 113, 0.7)'; // red
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(248, 113, 113, 0.7)';
    } else {
      ctx.shadowBlur = 0;
    }

    for (let i = 0; i < linesCount; i++) {
      ctx.strokeStyle = i === 0 ? strokeColor : strokeColor.replace('0.8', '0.2').replace('0.7', '0.15').replace('0.5', '0.1');
      ctx.beginPath();
      
      const linePhase = phase + (i * Math.PI / 4);
      
      for (let x = 0; x < width; x++) {
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
    
    ctx.shadowBlur = 0;
    phase += speed;
    requestAnimationFrame(draw);
  }

  draw();
}

// ----------------------------------------------------
// 9. BOOTSTRAP INITIALIZATION
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Setup clock & date HUD indicators
  setInterval(() => {
    const d = new Date();
    const pad = (v) => String(v).padStart(2, '0');
    
    // Header clock
    const clockText = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    const clockEl = document.getElementById('hud-clock');
    if (clockEl) clockEl.innerText = clockText;
    
    // Header date
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const dateText = `${pad(d.getDate())}.${months[d.getMonth()]}.${d.getFullYear()}`;
    const dateEl = document.getElementById('hud-date');
    if (dateEl) dateEl.innerText = dateText;

    // Increment simulated uptime
    state.uptime++;
    const uptimeEl = document.getElementById('uptime-display');
    if (uptimeEl) uptimeEl.innerText = formatUptime(state.uptime);

    // Read actual system metrics from backend API
    fetch(getHostUrl('/api/stats'))
      .then(res => res.json())
      .then(data => {
        // Link statuses
        const linkBadge = document.getElementById('host-link-status');
        if (linkBadge) {
          linkBadge.className = 'status-badge status-online';
          linkBadge.innerText = 'ONLINE';
        }
        
        // Update stats
        state.cpu = data.cpu;
        state.mem = data.mem;
        state.net = data.disk;
        
        const cpuVal = document.getElementById('cpu-percent');
        if (cpuVal) cpuVal.innerText = `${data.cpu}%`;
        
        const memVal = document.getElementById('mem-percent');
        if (memVal) memVal.innerText = `${data.mem}%`;
        
        const netVal = document.getElementById('net-percent');
        if (netVal) netVal.innerText = `${data.disk}%`;
      })
      .catch(err => {
        const linkBadge = document.getElementById('host-link-status');
        if (linkBadge) {
          linkBadge.className = 'status-badge status-offline';
          linkBadge.innerText = 'OFFLINE';
        }
        
        // Fallback simulate stats when backend server isn't running
        const targetCpu = 24;
        const fluxCpu = Math.max(5, Math.min(100, Math.round(targetCpu + (Math.random() * 8 - 4))));
        const fluxMem = Math.max(10, Math.min(100, Math.round(state.mem + (Math.random() * 4 - 2))));
        const fluxNet = Math.max(5, Math.min(100, Math.round(state.net + (Math.random() * 6 - 3))));

        const cpuVal = document.getElementById('cpu-percent');
        if (cpuVal) cpuVal.innerText = `${fluxCpu}%`;
        
        const memVal = document.getElementById('mem-percent');
        if (memVal) memVal.innerText = `${fluxMem}%`;
        
        const netVal = document.getElementById('net-percent');
        if (netVal) netVal.innerText = `${fluxNet}%`;
      });
  }, 1000);

  // Initialize greeting time stamp
  initGreetingTime();

  // Initialize Host IP input field from saved state
  const ipInput = document.getElementById('host-ip-address');
  if (ipInput) ipInput.value = state.hostIP;

  // Chat input enter listener
  const inputElement = document.getElementById('chat-input');
  if (inputElement) {
    inputElement.addEventListener('keydown', (e) => {
      playHUDsfx('keypress');
      if (e.key === 'Enter') {
        sendChatMessage();
      }
    });
  }

  // Set initial visual states for device toggles/sliders
  Object.keys(state.devices).forEach(id => {
    const dev = state.devices[id];
    const tile = document.getElementById(`device-${id}`);
    if (tile) {
      if (dev.hasOwnProperty('isOn')) {
        const inputCheck = tile.querySelector('input[type="checkbox"]');
        if (inputCheck) inputCheck.checked = dev.isOn;
        if (dev.isOn === false) {
          tile.classList.add('device-off');
        } else {
          tile.classList.remove('device-off');
        }
      } else {
        const inputSlider = tile.querySelector('input[type="range"]');
        if (inputSlider) inputSlider.value = dev.value;
        const valSpan = tile.querySelector('span');
        if (valSpan) valSpan.innerText = dev.value;
      }
    }
  });

  // Trigger visual visualizer loop
  initVoiceVisualizer();

  // Check and initialize Capacitor Mobile layouts
  if (typeof window.Capacitor !== 'undefined') {
    const mobPanel = document.getElementById('mobile-controls-panel');
    if (mobPanel) mobPanel.classList.remove('hidden');
    writeLogEntry("Capacitor core coupled. Native mobile bridges loaded.", "ok-msg");
  }

  // Greeting speech delay to let user load screen
  setTimeout(() => {
    speakAsAtlas("Atlas online. Virtual assistant matrix and smart home systems coupled successfully.");
    writeLogEntry("ATLAS Intelligence Core online. Ready for Q&A or device control parameters.", "ok-msg");
  }, 1200);
});

// ----------------------------------------------------
// 10. HOST CONTROL API PIPELINES
// ----------------------------------------------------
function triggerHostAction(action) {
  playHUDsfx('click');
  writeLogEntry(`Transmitting host control action: ${action.toUpperCase()}`, 'sys-msg');
  
  fetch(getHostUrl(`/api/control?action=${action}`))
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
          if (thumb && area) {
            thumb.src = getHostUrl('/' + data.imageUrl) + '?t=' + Date.now();
            area.classList.remove('hidden');
          }
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
      writeLogEntry(`Host connection error. Check if server.py is running.`, 'err-msg');
    });
}

// ----------------------------------------------------
// 11. NATIVE MOBILE CONTROLS & WEB FALLBACKS
// ----------------------------------------------------
let torchTrack = null;

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
  if (thumb) {
    if (thumb.style.maxHeight === 'none') {
      thumb.style.maxHeight = '120px';
    } else {
      thumb.style.maxHeight = 'none';
    }
  }
}

function formatUptime(secs) {
  const pad = (v) => String(v).padStart(2, '0');
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
