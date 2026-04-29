import { createClient } from '@/lib/supabase'

const BUCKET = 'paciente-documentos'

export async function uploadOrigemTemplate(file: File, clinicaId: string, templateId: string): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop() ?? 'pdf'
  const path = `clinica-${clinicaId}/template-${templateId}/origem.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) throw new Error(`Erro ao enviar arquivo: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function uploadAnexoPaciente(
  file: File,
  clinicaId: string,
  pacienteId: string,
  docId: string,
): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop() ?? 'pdf'
  const path = `clinica-${clinicaId}/paciente-${pacienteId}/${docId}/anexo.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) throw new Error(`Erro ao enviar anexo: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function removerArquivo(url: string): Promise<void> {
  const supabase = createClient()
  const marker = `/object/public/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return
  const path = decodeURIComponent(url.slice(idx + marker.length))
  await supabase.storage.from(BUCKET).remove([path])
}
