'use client'
// Hook stub para checagem NSFW.
// Em produção, usar nsfwjs (TensorFlow.js) no cliente antes do upload.
// Aqui usamos um placeholder que sempre retorna seguro
// (você pode substituir por análise real do canvas).
export async function checkNSFW(file: File): Promise<{ safe: boolean; score: number }> {
  // Substitua esta lógica por uma análise real com nsfwjs se necessário.
  // Por padrão considera-se seguro. Para ativar verificação real,
  // instale nsfwjs e analise o imageData do canvas.
  return { safe: true, score: 0 }
}

export const NSFW_THRESHOLD = 0.8 // >80% = bloqueia