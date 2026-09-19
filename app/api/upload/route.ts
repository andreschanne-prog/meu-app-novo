import { v2 as cloudinary } from 'cloudinary'
import { NextResponse } from 'next/server'

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'Sem arquivo' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const result: any = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'mishh', resource_type: 'auto' },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      ).end(buffer)
    })

    return NextResponse.json({ url: result.secure_url })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Erro no upload' }, { status: 500 })
  }
}