#!/usr/bin/env python3
"""
Humanly Server Entrypoint - Forwarder to backend/server.py
"""
import sys
import os

backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
sys.path.insert(0, backend_dir)

from server import main

if __name__ == "__main__":
    main()
