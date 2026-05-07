import { createClient } from '@/lib/supabase'
import type { UploadedFile } from '@/components/editor/rich-editor'

const BUCKET = 'registros'

const VIDEO_EXTENSIONS = new Set([
  'mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v',
  '3gp', '3g2', 'ogv', 'ts', 'm2ts', 'mts', 'vob', 'rm',
  'rmvb', 'asf', 'divx', 'xvid', 'mpeg', 'mpg', 'f4v',
])

export function isVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return VIDEO_EXTENSIONS.has(ext)
}

// ---------------------------------------------------------------------------
// Upload de imagem — retorna metadados para a lista de anexos (igual a arquivo)
// ---------------------------------------------------------------------------

export async function uploadImagem(
  file: File,
  agendamentoId: string,
): Promise<UploadedFile> {
  const supabase = createClient()

  const ext  = file.name.split('.').pop()
  const nome = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const path = `agendamento-${agendamentoId}/imagens/${nome}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type })

  if (error) throw new Error(`Erro ao enviar imagem: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)

  return {
    nome: file.name,
    url: data.publicUrl,
    tipo: file.type,
    tamanho: file.size,
  }
}

// ---------------------------------------------------------------------------
// Upload de arquivo genérico — retorna metadados para a lista de anexos
// ---------------------------------------------------------------------------

export async function uploadArquivo(
  file: File,
  agendamentoId: string,
): Promise<UploadedFile> {
  if (isVideoFile(file)) {
    throw new Error('Vídeos não são permitidos como anexo de registro.')
  }
  const supabase = createClient()

  const ext  = file.name.split('.').pop()
  const nome = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const path = `agendamento-${agendamentoId}/arquivos/${nome}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type })

  if (error) throw new Error(`Erro ao enviar arquivo: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)

  return {
    nome: file.name,
    url: data.publicUrl,
    tipo: file.type,
    tamanho: file.size,
  }
}

// ---------------------------------------------------------------------------
// Remove arquivo do Storage (usado ao clicar no × dos anexos)
// ---------------------------------------------------------------------------

export async function removerArquivo(url: string): Promise<void> {
  const supabase = createClient()

  // Extrai o path relativo a partir da URL pública
  // URL formato: https://<project>.supabase.co/storage/v1/object/public/registros/<path>
  const marker = `/object/public/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return

  const path = decodeURIComponent(url.slice(idx + marker.length))

  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw new Error(`Erro ao remover arquivo: ${error.message}`)
}
