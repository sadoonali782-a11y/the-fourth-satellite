"""A tiny local web server for the site that tells the browser not to cache files,
so every reload shows your latest edits.

Run from the repository folder:  python tools/dev_server.py   (then open http://localhost:8700)
"""

import functools
import http.server
import pathlib

PORT = 8700
SITE_FOLDER = pathlib.Path(__file__).resolve().parent.parent / "site"


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


handler = functools.partial(NoCacheHandler, directory=str(SITE_FOLDER))
print(f"Serving {SITE_FOLDER} at http://localhost:{PORT}")
http.server.ThreadingHTTPServer(("", PORT), handler).serve_forever()
