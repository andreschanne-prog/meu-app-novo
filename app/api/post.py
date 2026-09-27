from http.server import BaseHTTPRequestHandler
import json, os, io
import cloudinary.uploader
from PIL import Image

# Config Cloudinary no servidor, não no front
cloudinary.config(
  cloud_name = os.environ.get("CLOUD_NAME"),
  api_key = os.environ.get("CLOUD_API_KEY"),
  api_secret = os.environ.get("CLOUD_API_SECRET")
)

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # 1. Pega a imagem
        content_length = int(self.headers['Content-Length'])
        body = self.rfile.read(content_length)
        
        # 2. Comprime de 5MB pra 300KB com Pillow (economiza 90% do Cloudinary)
        img = Image.open(io.BytesIO(body))
        img = img.convert("RGB")
        img.thumbnail((1080, 1080)) # insta size
        buf = io.BytesIO()
        img.save(buf, format='JPEG', quality=75, optimize=True)
        buf.seek(0)

        # 3. AQUI ENTRA A IA DE MODERAÇÃO (fase 2)
        # Depois a gente pluga: if is_nsfw(buf): bloqueia

        # 4. Sobe pro Cloudinary pelo servidor (seguro)
        res = cloudinary.uploader.upload(buf, folder="mishh/feed")
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"url": res["secure_url"]}).encode())