import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'

function getFirebaseAdmin() {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!serviceAccount) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON não configurado')
  const parsed = JSON.parse(serviceAccount)
  return getApps().length ? getApps()[0] : initializeApp({ credential: cert(parsed) })
}

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization')
    const accessToken = authorization?.replace(/^Bearer\s+/i, '')
    if (!accessToken) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } },
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    if (!body.userId || !body.title || !body.body) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    if (body.userId === user.id) return NextResponse.json({ sent: 0 })

    const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: tokens, error: tokenError } = await adminSupabase.from('push_tokens').select('token').eq('user_id', body.userId)
    if (tokenError) throw tokenError
    if (!tokens?.length) return NextResponse.json({ sent: 0 })

    const result = await getMessaging(getFirebaseAdmin()).sendEachForMulticast({
      tokens: tokens.map(row => row.token),
      notification: { title: body.title, body: body.body },
      data: { url: body.url || '/notifications' },
      webpush: { fcmOptions: { link: body.url || '/notifications' } },
    })
    const invalidTokens = tokens.filter((_, index) => !result.responses[index].success).map(row => row.token)
    if (invalidTokens.length) await adminSupabase.from('push_tokens').delete().in('token', invalidTokens)
    return NextResponse.json({ sent: result.successCount })
  } catch (error) {
    console.error('Erro ao enviar push:', error)
    return NextResponse.json({ error: 'Falha ao enviar push' }, { status: 500 })
  }
}