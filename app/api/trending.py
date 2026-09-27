from http.server import BaseHTTPRequestHandler
import json, os, re
from collections import Counter
from supabase import create_client
from datetime import datetime, timedelta

supabase_client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # pega posts dos últimos 7 dias
        since = (datetime.now() - timedelta(days=7)).isoformat()
        posts = supabase_client.table('posts').select('caption, hashtags, created_at').gte('created_at', since).limit(1000).execute()

        hashtags = []
        palavras = []
        mencoes = []

        for p in posts.data:
            # 1. Hashtags
            if p['hashtags']:
                hashtags += [h.lower() for h in p['hashtags'].split(',') if h]
            # 2. Menções @usuario
            mencoes += re.findall(r'@(\w+)', p['caption'] or '')
            # 3. Palavras importantes (tira lixo)
            clean = re.sub(r'[#@]\w+', '', p['caption'] or '').lower()
            palavras += [w for w in re.findall(r'\b\w{4,}\b', clean) if w not in ['para','com','que','esta','isso']]

        top_hashtags = Counter(hashtags).most_common(10)
        top_mencoes = Counter(mencoes).most_common(10)
        top_palavras = Counter(palavras).most_common(10)

        result = {
            "hashtags": top_hashtags,
            "pessoas_mais_marcadas": top_mencoes,
            "assuntos_mais_falados": top_palavras,
            "total_posts_analisados": len(posts.data)
        }

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(result).encode())