import { createClient } from '@/lib/supabase'

const BUCKET = 'comprovantes-financeiro'

const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export function validarArquivoComprovante(file: File): string | null {
  if (!TIPOS_ACEITOS.includes(file.type)) {
    return 'Formato inválido. Use JPG, PNG, WebP ou PDF.'
  }
  if (file.size > MAX_BYTES) {
    return 'Arquivo muito grande. Máximo 10 MB.'
  }
  return null
}

export async function uploadComprovante(
  financeiroId: string,
  clinicaId: string,
  file: File,
): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${clinicaId}/${financeiroId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) throw new Error(`Erro ao enviar comprovante: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function removerComprovante(url: string): Promise<void> {
  const supabase = createClient()
  const marker = `/object/public/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return
  const path = decodeURIComponent(url.slice(idx + marker.length))
  await supabase.storage.from(BUCKET).remove([path])
}
