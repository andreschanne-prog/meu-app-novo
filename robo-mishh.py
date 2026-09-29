import requests
import time
import datetime
import threading

# === CONFIG MISHH MONITOR - ANDRE V4 COM COMANDOS ===
TOKEN = "8909833677:AAG91xMynQx7YUxQTeD-Z9qGgSYFCtu5nXY"
CHAT_ID = "6698007215" # Só responde pra você

URLS = {
    "MISHH Principal": "https://mishh.com.br/",
    "Painel admin": "https://mishh.com.br/admin",
    "feed": "https://mishh.com.br/feed",
    "ranking": "https://mishh.com.br/ranking",
    "destaques": "https://mishh.com.br/destaques",
    "chat": "https://mishh.com.br/chat",
    "profile": "https://mishh.com.br/profile",
    "search": "https://mishh.com.br/search",
    "notifications": "https://mishh.com.br/notifications",
    "login": "https://mishh.com.br/login",
}

CHECK_INTERVAL = 60
TIMEOUT = 10

# Guarda o status pra responder rápido no /status
ultimo_status = {}
offset = 0

def enviar_telegram(msg):
    try:
        url = f"https://api.telegram.org/bot{TOKEN}/sendMessage"
        data = {"chat_id": CHAT_ID, "text": msg, "parse_mode": "Markdown"}
        requests.post(url, data=data, timeout=10)
    except: pass

def checar_site(nome, url):
    try:
        inicio = time.time()
        r = requests.get(url, timeout=TIMEOUT, headers={"User-Agent": "MishhV4"})
        tempo = round(time.time() - inicio, 2)
        ok = r.status_code == 200
        ultimo_status[nome] = {"ok": ok, "tempo": tempo, "code": r.status_code, "hora": datetime.datetime.now().strftime('%H:%M:%S')}
        print(f"{'OK' if ok else 'FAIL'} {nome} {r.status_code} {tempo}s")
        return ok, tempo, r.status_code
    except Exception as e:
        ultimo_status[nome] = {"ok": False, "tempo": 0, "code": 0, "hora": datetime.datetime.now().strftime('%H:%M:%S')}
        return False, 0, str(e)

def verificar_comandos():
    global offset
    try:
        url = f"https://api.telegram.org/bot{TOKEN}/getUpdates?timeout=20&offset={offset}"
        r = requests.get(url, timeout=25).json()
        if not r.get("ok"): return

        for update in r.get("result", []):
            offset = update["update_id"] + 1
            msg = update.get("message", {})
            chat_id = str(msg.get("chat", {}).get("id", ""))
            text = msg.get("text", "").lower()

            # Só responde pra você
            if chat_id!= CHAT_ID: continue

            if text in ["/status", "status", "/online"]:
                resp = f"📊 *STATUS MISHH - {datetime.datetime.now().strftime('%H:%M:%S')}*\n\n"
                for nome, info in ultimo_status.items():
                    emoji = "✅" if info['ok'] else "❌"
                    resp += f"{emoji} {nome}: {info['tempo']}s ({info['code']})\n"
                if not ultimo_status:
                    resp += "_Ainda checando... me dá 1 min_"
                enviar_telegram(resp)

            elif text in ["/ping", "ping"]:
                enviar_telegram(f"🏓 *Tô vivo André!* \nMonitorando {len(URLS)} telas do Mishh. Tudo rodando!")

            elif text in ["/check", "/forcar", "/agora"]:
                enviar_telegram("🔍 *Forçando checagem agora...*")
                for nome, url in URLS.items():
                    checar_site(nome, url)
                enviar_telegram("✅ Checagem forçada finalizada! Manda /status pra ver.")

            elif text in ["/help", "/ajuda", "help"]:
                enviar_telegram("🤖 *COMANDOS MISHH*\n\n/status - Ver como tá tudo\n/ping - Ver se tô vivo\n/check - Forçar checagem agora\n/help - Ver comandos")

    except Exception as e:
        print(f"Erro comandos: {e}")

def loop_monitor():
    falhas = {nome: 0 for nome in URLS}
    while True:
        for nome, url in URLS.items():
            ok, tempo, status = checar_site(nome, url)
            if not ok:
                falhas[nome] += 1
                if falhas[nome] >= 2:
                    enviar_telegram(f"🚨 *MISHH CAIU!* 🚨\n\n*Site:* {nome}\n*URL:* {url}\n*Erro:* {status}\n*Hora:* {datetime.datetime.now().strftime('%d/%m %H:%M:%S')}")
                    falhas[nome] = 0
            else:
                if falhas[nome] > 0:
                    enviar_telegram(f"✅ *VOLTOU!* {nome} - {tempo}s")
                falhas[nome] = 0
        time.sleep(CHECK_INTERVAL)

def main():
    print("🤖 MISHH V4 - MONITOR + COMANDOS")
    enviar_telegram(f"🤖 *Mishh V4 Ligado - Agora com comandos!*\n\nFala André! Agora você pode mandar:\n\n/status - ver tudo\n/ping - ver se tô vivo\n/check - checar agora\n\nMonitorando {len(URLS)} telas!")

    # Inicia o monitor em segundo plano
    t = threading.Thread(target=loop_monitor, daemon=True)
    t.start()

    # Loop principal fica só ouvindo seus comandos
    print("Aguardando comandos no Telegram...")
    while True:
        verificar_comandos()
        time.sleep(2)

if __name__ == "__main__":
    main()