import http.server
import socketserver
import json
import os
import socket

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_POST(self):
        if self.path == '/api/save_odds':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                filepath = os.path.join(DIRECTORY, 'manual_odds.json')
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success"}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))
        else:
            super().do_POST()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

# Dọn dẹp socket rỗi nhanh chóng
socketserver.TCPServer.allow_reuse_address = True

local_ip = get_local_ip()

with socketserver.TCPServer(("", PORT), MyHandler) as httpd:
    print(f"\n=======================================================")
    print(f" Server local ho tro ghi file dang chay tai:")
    print(f" - May tinh cua ban:  http://localhost:{PORT}")
    if local_ip != '127.0.0.1':
        print(f" - Dien thoai/IPAD:   http://{local_ip}:{PORT}")
    print(f"=======================================================")
    print("Mo lien ket tren thiet bi cung Wi-Fi de xem va nhap keo.")
    print("Keo ban nhap se duoc ghi truc tiep vao file manual_odds.json.")
    print("Bam Ctrl+C trong cua so terminal nay de dung server.\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nĐang dừng server...")
