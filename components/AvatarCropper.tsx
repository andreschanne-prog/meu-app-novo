'use client'
import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'

interface AvatarCropperProps {
  imageUrl: string
  onApply: (blob: Blob) => void
  onCancel: () => void
  loading?: boolean
}

export default function AvatarCropper({ imageUrl, onApply, onCancel, loading }: AvatarCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null)

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image()
      image.addEventListener('load', () => resolve(image))
      image.addEventListener('error', (error) => reject(error))
      image.src = url
    })

  const getCroppedImg = async (imageSrc: string, croppedAreaPixels: { x: number; y: number; width: number; height: number }): Promise<Blob> => {
    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No 2d context')

    const size = 400
    canvas.width = size
    canvas.height = size

    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()

    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      size,
      size
    )

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas is empty'))
      }, 'image/jpeg', 0.9)
    })
  }

  const onCropComplete = useCallback((_croppedArea: any, pixels: { x: number; y: number; width: number; height: number }) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const handleSave = async () => {
    if (!imageUrl) return

    try {
      let pixels = croppedAreaPixels
      if (!pixels) {
        const image = await createImage(imageUrl)
        const minDim = Math.min(image.width, image.height)
        pixels = {
          x: (image.width - minDim) / 2,
          y: (image.height - minDim) / 2,
          width: minDim,
          height: minDim,
        }
      }

      const blob = await getCroppedImg(imageUrl, pixels)
      onApply(blob)
    } catch (err) {
      console.error('Error cropping:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <div className="bg-[#0a1f14] rounded-3xl p-6 w-[340px] max-w-[90vw]">
        <h3 className="text-white text-center text-sm font-light mb-4">Ajustar foto</h3>

        <div className="relative w-[200px] h-[200px] mx-auto mb-6 rounded-full overflow-hidden bg-[#1a1a1a]">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            minZoom={1}
            maxZoom={3}
            zoomWithScroll={true}
          />
        </div>

        <div className="mb-6">
          <label className="text-[#a8a8a8] text-xs block mb-2 text-center">Zoom</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full h-1 bg-[#333] rounded-full appearance-none cursor-pointer accent-[#C6A664]"
          />
          <div className="flex justify-between text-[10px] text-[#666] mt-1">
            <span>1x</span>
            <span>3x</span>
          </div>
        </div>

        <p className="text-[10px] text-[#666] text-center mb-4">
          Arraste para posicionar • Scroll/pinça para zoom
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 rounded-full text-sm text-white bg-[#262626] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-3 rounded-full text-sm text-black font-medium bg-[#C6A664] hover:bg-[#d4b574] transition-colors disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar foto'}
          </button>
        </div>
      </div>
    </div>
  )
}