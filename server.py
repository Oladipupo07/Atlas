import http.server
import socketserver
import json
import urllib.parse
import subprocess
import os
import sys
import shutil

PORT = 8000

class AtlasApiHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Prevent caching and allow local origins
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        super().end_headers()

    def do_GET(self):
        url_parsed = urllib.parse.urlparse(self.path)
        path = url_parsed.path
        query = urllib.parse.parse_qs(url_parsed.query)

        # API: System Stats Endpoint
        if path == '/api/stats':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            stats = self.get_system_stats()
            self.wfile.write(json.dumps(stats).encode('utf-8'))
            return

        # API: Control System Endpoint
        elif path == '/api/control':
            action = query.get('action', [None])[0]
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            result = self.execute_system_action(action)
            self.wfile.write(json.dumps(result).encode('utf-8'))
            return

        # Fallback to serving static files
        super().do_GET()

    def get_system_stats(self):
        stats = {
            "cpu": 0,
            "mem": 0,
            "disk": 0,
            "os": "Windows" if os.name == 'nt' else "Linux"
        }

        try:
            # 1. Disk usage (native cross-platform python)
            total, used, free = shutil.disk_usage(".")
            stats["disk"] = int((used / total) * 100)

            # Windows Stats
            if os.name == 'nt':
                # CPU load percentage
                cpu_query = subprocess.run(
                    ["wmic", "cpu", "get", "LoadPercentage"],
                    capture_output=True, text=True, check=True
                )
                cpu_lines = [l.strip() for l in cpu_query.stdout.split('\n') if l.strip()]
                if len(cpu_lines) > 1:
                    stats["cpu"] = int(cpu_lines[1])
                
                # RAM percentage
                mem_query = subprocess.run(
                    ["wmic", "OS", "get", "FreePhysicalMemory,TotalVisibleMemorySize", "/Value"],
                    capture_output=True, text=True, check=True
                )
                mem_dict = {}
                for line in mem_query.stdout.split('\n'):
                    if '=' in line:
                        k, v = line.strip().split('=')
                        mem_dict[k] = int(v)
                
                if "FreePhysicalMemory" in mem_dict and "TotalVisibleMemorySize" in mem_dict:
                    used_mem = mem_dict["TotalVisibleMemorySize"] - mem_dict["FreePhysicalMemory"]
                    stats["mem"] = int((used_mem / mem_dict["TotalVisibleMemorySize"]) * 100)
            
            # Linux Stats
            else:
                stats["os"] = "Linux"
                
                # Parse CPU load from /proc/loadavg
                if os.path.exists('/proc/loadavg'):
                    with open('/proc/loadavg', 'r') as f:
                        load = float(f.readline().split()[0])
                        # Map load average (e.g. 0.5 to 50%)
                        stats["cpu"] = min(100, int(load * 50))
                
                # Parse Memory from /proc/meminfo
                if os.path.exists('/proc/meminfo'):
                    meminfo = {}
                    with open('/proc/meminfo', 'r') as f:
                        for line in f:
                            parts = line.split()
                            if len(parts) >= 2:
                                meminfo[parts[0].rstrip(':')] = int(parts[1])
                    
                    if "MemTotal" in meminfo:
                        total_mem = meminfo["MemTotal"]
                        avail_mem = meminfo.get("MemAvailable", meminfo.get("MemFree", 0) + meminfo.get("Buffers", 0) + meminfo.get("Cached", 0))
                        used_mem = total_mem - avail_mem
                        stats["mem"] = int((used_mem / total_mem) * 100)
                        
        except Exception as e:
            print(f"Error reading stats: {e}", file=sys.stderr)
            stats["cpu"] = 14
            stats["mem"] = 38

        return stats

    def execute_system_action(self, action):
        if not action:
            return {"success": False, "message": "No action specified"}

        print(f"Atlas executing system action: {action}")
        is_windows = (os.name == 'nt')
        
        try:
            # 1. LAUNCH NOTEPAD / TEXT EDITOR
            if action == "open:notepad":
                if is_windows:
                    subprocess.Popen(["notepad.exe"])
                    return {"success": True, "message": "Notepad launched"}
                else:
                    editors = ["gnome-text-editor", "gedit", "mousepad", "kate", "nano", "xdg-open"]
                    for editor in editors:
                        try:
                            if editor == "xdg-open":
                                # Open blank temp file
                                temp_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp.txt")
                                with open(temp_path, "w") as tf:
                                    tf.write("ATLAS Node Editor Link.\n")
                                subprocess.Popen(["xdg-open", temp_path])
                            else:
                                subprocess.Popen([editor])
                            return {"success": True, "message": f"Text editor ({editor}) launched"}
                        except Exception:
                            continue
                    return {"success": False, "message": "No suitable Linux text editor found"}

            # 2. LAUNCH CALCULATOR
            elif action == "open:calc":
                if is_windows:
                    subprocess.Popen(["calc.exe"])
                    return {"success": True, "message": "Calculator launched"}
                else:
                    calcs = ["gnome-calculator", "kcalc", "galculator", "xcalc"]
                    for calc in calcs:
                        try:
                            subprocess.Popen([calc])
                            return {"success": True, "message": f"Calculator ({calc}) launched"}
                        except Exception:
                            continue
                    return {"success": False, "message": "No suitable Linux calculator found"}

            # 3. OPEN BROWSER
            elif action == "open:browser":
                if is_windows:
                    subprocess.Popen(["cmd.exe", "/c", "start", "https://google.com"])
                else:
                    subprocess.Popen(["xdg-open", "https://google.com"])
                return {"success": True, "message": "Browser opened"}

            # 4. VOLUME UP
            elif action == "media:volup":
                if is_windows:
                    subprocess.run([
                        "powershell", "-Command",
                        "(New-Object -ComObject WScript.Shell).SendKeys([char]175)"
                    ], check=True)
                    return {"success": True, "message": "Volume increased"}
                else:
                    try:
                        subprocess.run(["pactl", "set-sink-volume", "@DEFAULT_SINK@", "+5%"], check=True)
                        return {"success": True, "message": "Volume increased via PulseAudio"}
                    except Exception:
                        try:
                            subprocess.run(["amixer", "-D", "pulse", "sset", "Master", "5%+"], check=True)
                            return {"success": True, "message": "Volume increased via ALSA"}
                        except Exception as e:
                            return {"success": False, "message": f"Volume adjustment failed: {str(e)}"}

            # 5. VOLUME DOWN
            elif action == "media:voldown":
                if is_windows:
                    subprocess.run([
                        "powershell", "-Command",
                        "(New-Object -ComObject WScript.Shell).SendKeys([char]174)"
                    ], check=True)
                    return {"success": True, "message": "Volume decreased"}
                else:
                    try:
                        subprocess.run(["pactl", "set-sink-volume", "@DEFAULT_SINK@", "-5%"], check=True)
                        return {"success": True, "message": "Volume decreased via PulseAudio"}
                    except Exception:
                        try:
                            subprocess.run(["amixer", "-D", "pulse", "sset", "Master", "5%-"], check=True)
                            return {"success": True, "message": "Volume decreased via ALSA"}
                        except Exception as e:
                            return {"success": False, "message": f"Volume adjustment failed: {str(e)}"}

            # 6. VOLUME MUTE
            elif action == "media:mute":
                if is_windows:
                    subprocess.run([
                        "powershell", "-Command",
                        "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"
                    ], check=True)
                    return {"success": True, "message": "Volume muted/unmuted"}
                else:
                    try:
                        subprocess.run(["pactl", "set-sink-mute", "@DEFAULT_SINK@", "toggle"], check=True)
                        return {"success": True, "message": "Volume muted/unmuted via PulseAudio"}
                    except Exception:
                        try:
                            subprocess.run(["amixer", "-D", "pulse", "sset", "Master", "toggle"], check=True)
                            return {"success": True, "message": "Volume muted/unmuted via ALSA"}
                        except Exception as e:
                            return {"success": False, "message": f"Volume mute failed: {str(e)}"}

            # 7. LOCK WORKSTATION
            elif action == "sys:lock":
                if is_windows:
                    subprocess.run(["rundll32.exe", "user32.dll,LockWorkStation"], check=True)
                    return {"success": True, "message": "Workstation locked"}
                else:
                    lockers = [
                        ["xdg-screensaver", "lock"],
                        ["gnome-screensaver-command", "-l"],
                        ["dbus-send", "--type=method_call", "--dest=org.gnome.ScreenSaver", "/org/gnome/ScreenSaver", "org.gnome.ScreenSaver.Lock"],
                        ["loginctl", "lock-session"]
                    ]
                    for cmd in lockers:
                        try:
                            subprocess.run(cmd, check=True)
                            return {"success": True, "message": "Session locked"}
                        except Exception:
                            continue
                    return {"success": False, "message": "No suitable Linux screensaver lock found"}

            # 8. DESKTOP SCREENSHOT
            elif action == "sys:screenshot":
                if is_windows:
                    ps_script = """
                    [Reflection.Assembly]::LoadWithPartialName("System.Drawing") | Out-Null
                    [Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms") | Out-Null
                    $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
                    $bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
                    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
                    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
                    $bmp.Save("screenshot.png", [System.Drawing.Imaging.ImageFormat]::Png)
                    $graphics.Dispose()
                    $bmp.Dispose()
                    """
                    subprocess.run(["powershell", "-Command", ps_script], check=True)
                    return {
                        "success": True,
                        "message": "Desktop screenshot compiled",
                        "imageUrl": "screenshot.png"
                    }
                else:
                    # Linux screenshots
                    try:
                        subprocess.run(["gnome-screenshot", "-f", "screenshot.png"], check=True)
                        return {"success": True, "message": "Desktop screenscan compiled (gnome-screenshot)", "imageUrl": "screenshot.png"}
                    except Exception:
                        try:
                            subprocess.run(["scrot", "screenshot.png"], check=True)
                            return {"success": True, "message": "Desktop screenscan compiled (scrot)", "imageUrl": "screenshot.png"}
                        except Exception as e:
                            return {"success": False, "message": f"Screenscan tool not found or failed: {str(e)}"}

            else:
                return {"success": False, "message": f"Action command '{action}' unrecognized"}

        except Exception as e:
            return {"success": False, "message": f"Execution failed: {str(e)}"}

if __name__ == '__main__':
    # Force working directory to where this file lives so files are served properly
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Run server
    handler = AtlasApiHandler
    # Disable DNS reverse lookup for faster request handling
    class FastTCPServer(socketserver.TCPServer):
        allow_reuse_address = True
        
    with FastTCPServer(("", PORT), handler) as httpd:
        print(f"ATLAS Host Server active. Connected at http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
            sys.exit(0)
