import { NextResponse } from 'next/server'

const TOKEN = "8909833677:AAG91xMynQx7YUxQTeD-Z9qGgSYFCtu5nXY"
const CHAT_ID = "6698007215"

const URLS: Record<string, string> = {
  "Principal": "https://mishh.com.br/",
  "feed": "https://mishh.com.br/feed",
  "ranking": "https://mishh.com.br/ranking",
  "destaques": "https://mishh.com.br/destaques",
  "chat": "https://mishh.com.br/chat",
  "search": "https://mishh.com.br/search",
  "login": "https://mishh.com.br/login",
}

async function sendTelegram(text: string) {
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'Markdown' })
  })
}

async function checkAll() {
  const results: string[] = []
  let hasFail = false
  for (const [nome, url] of Object.entries(URLS)) {
    try {
      const start = Date.now()
      const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(10000) })
      const tempo = ((Date.now() - start) / 1000).toFixed(2)
      if (r.status !== 200) {
        hasFail = true
        results.push(`❌ ${nome}: ${r.status}`)
      } else {
        results.push(`✅ ${nome}: ${tempo}s`)
      }
    } catch {
      hasFail = true
      results.push(`❌ ${nome}: OFF`)
    }
  }
  return { results, hasFail }
}

// 1. CRON da Vercel chama aqui a cada 1 min
export async function GET() {
  const { results, hasFail } = await checkAll()
  if (hasFail) {
    await sendTelegram(`🚨 *MISHH CAIU - VERCEL* 🚨\n\n${results.join('\n')}\n\n⏰ ${new Date().toLocaleString('pt-BR')}`)
  }
  return NextResponse.json({ ok: !hasFail, results })
}

// 2. TELEGRAM chama aqui quando você manda /status
export async function POST(req: Request) {
  const body = await req.json()
  const msg = body?.message?.text || ""
  const fromId = String(body?.message?.chat?.id || "")

  if (fromId !== CHAT_ID) return NextResponse.json({ ok: true }) // só você pode usar

  if (msg === "/status" || msg === "/ping" || msg === "/sites") {
    const { results, hasFail } = await checkAll()
    const texto = hasFail 
      ? `🚨 *ATENÇÃO - PROBLEMA DETECTADO*\n\n${results.join('\n')}`
      : `✅ *Tudo online*\n\n${results.join('\n')}\n\n⏰ ${new Date().toLocaleString('pt-BR')}`
    await sendTelegram(texto)
  }
  
  if (msg === "/start" || msg === "/help") {
    await sendTelegram(`🤖 *Mishh Monitor 24h - Vercel*\n\nComandos:\n/status - checa tudo agora\n/ping - checa tudo agora\n/sites - lista os sites\n\nEle te avisa sozinho quando cair!`)
  }

  return NextResponse.json({ ok: true })
}