#!/usr/bin/env python3
"""
ADMINATOR PULSE - Local Development Server
Lightweight Python HTTP server with UTF-8 support and clean logging.
"""

import http.server
import socketserver
import os
import sys
import webbrowser

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable CORS and caching headers for smooth dev experience
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

def main():
    port = PORT
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass

    server_address = ("", port)
    
    try:
        with socketserver.TCPServer(server_address, Handler) as httpd:
            url = f"http://localhost:{port}"
            print("=" * 64)
            print(f"🚀 Adminator Pulse - Employee Engagement & Analytics Portal")
            print(f"📍 Server running at: {url}")
            print(f"📁 Serving directory: {DIRECTORY}")
            print(f"⚡ Press Ctrl+C to stop the server")
            print("=" * 64)
            
            try:
                webbrowser.open(url)
            except Exception:
                pass
                
            httpd.serve_forever()
    except OSError as e:
        if e.errno == 48 or e.errno == 98 or e.errno == 10048:
            print(f"⚠️ Port {port} is occupied. Retrying with port {port + 1}...")
            sys.argv[1] = str(port + 1)
            main()
        else:
            raise e

if __name__ == "__main__":
    main()
