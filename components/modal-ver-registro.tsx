'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Pencil, ExternalLink, FileText, Paperclip, CheckCircle2, XCircle } from 'lucide-react'
import { cn, tiptapToHtml } from '@/lib/utils'
import type { Registro } from '@/types'

interface ModalVerRegistroProps {
  registro: Registro | null
  onClose: () => void
}

function formatDataBR(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function formatBRL(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined) return '—'
  const num = typeof valor === 'string' ? parseFloat(valor) : valor
  if (isNaN(num)) return '—'
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function ModalVerRegistro({ registro, onClose }: ModalVerRegistroProps) {
  const router = useRouter()
  const [imagemLightboxUrl, setImagemLightboxUrl] = useState<string | null>(null)

  const tiptapHtml = registro ? tiptapToHtml(registro.conteudo_json) : ''
  const links = registro?.link_youtube ? [registro.link_youtube] : []
  const imagens = (registro?.arquivos ?? []).filter(f => f.tipo.startsWith('image/'))
  const outrosArquivos = (registro?.arquivos ?? []).filter(f => !f.tipo.startsWith('image/'))

  function abrirEditor() {
    if (!registro) return
    onClose()
    router.push(`/dashboard/registros/${registro.id}?editar=true`)
  }

  return (
    <>
      <Dialog open={!!registro && !imagemLightboxUrl} onOpenChange={(open) => { if (!open) onClose() }}>
        <DialogContent className="sm:!max-w-3xl w-full max-h-[90vh] overflow-y-auto p-0">
          <VisuallyHidden>
            <DialogTitle>Registro de Sessão</DialogTitle>
          </VisuallyHidden>

          {registro && (
            <>
              {/* Cabeçalho */}
              <div className="px-6 pt-6 pb-4 border-b">
                <div className="flex-1 min-w-0">
                  {registro.paciente_nome && (
                    <p className="text-xs font-medium text-muted-foreground mb-1">{registro.paciente_nome}</p>
                  )}
                  <h2 className="text-base font-semibold text-gray-900 leading-tight">
                    Sessão de {formatDataBR(registro.data_sessao)}
                  </h2>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {registro.tipo_sessao && (
                    <span className="inline-flex items-center rounded-full bg-[#04c2fb]/8 border border-[#04c2fb]/20 px-2.5 py-0.5 text-[11px] font-medium text-[#04c2fb]">
                      {registro.tipo_sessao}
                    </span>
                  )}
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                    registro.presenca ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600',
                  )}>
                    {registro.presenca
                      ? <CheckCircle2 className="h-3 w-3" />
                      : <XCircle className="h-3 w-3" />
                    }
                    {registro.presenca ? 'Presente' : 'Falta'}
                  </span>
                  {registro.numero_sessao != null && (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] text-gray-500">
                      Sessão #{registro.numero_sessao}
                    </span>
                  )}
                  {registro.valor_sessao != null && (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] text-gray-500">
                      {formatBRL(registro.valor_sessao)}
                    </span>
                  )}
                </div>
              </div>

              {/* Corpo */}
              <div className="px-6 py-4 space-y-4">
                {/* Notas */}
                {tiptapHtml.length > 0 ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-3.5 w-3.5 text-[#04c2fb]" />
                      <span className="text-xs font-semibold text-[#04c2fb]">Notas da Sessão</span>
                    </div>
                    <div
                      className={cn(
                        'text-sm text-gray-700 leading-relaxed',
                        '[&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0',
                        '[&_h1]:text-base [&_h1]:font-bold [&_h1]:my-1.5',
                        '[&_h2]:text-sm [&_h2]:font-bold [&_h2]:my-1.5',
                        '[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:my-1',
                        '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1',
                        '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1',
                        '[&_li]:my-0.5',
                        '[&_strong]:font-semibold [&_em]:italic [&_u]:underline [&_s]:line-through',
                        '[&_mark]:bg-yellow-200 [&_mark]:px-0.5 [&_mark]:rounded-sm',
                        '[&_a]:text-[#04c2fb] [&_a]:underline [&_a]:break-all',
                        '[&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:text-gray-500 [&_blockquote]:italic [&_blockquote]:my-1',
                        '[&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono',
                        '[&_pre]:bg-gray-100 [&_pre]:p-2 [&_pre]:rounded [&_pre]:text-xs [&_pre]:overflow-x-auto [&_pre]:my-1.5',
                        '[&_hr]:border-gray-200 [&_hr]:my-2',
                      )}
                      dangerouslySetInnerHTML={{ __html: tiptapHtml }}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Sem notas registradas.</p>
                )}

                {/* Material */}
                {registro.material && registro.material !== '-' && (
                  <div className="pt-3 border-t">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 px-2.5 py-0.5 text-[11px] text-gray-600">
                      Material: {registro.material}
                    </span>
                  </div>
                )}

                {/* Links YouTube */}
                {links.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-3 border-t">
                    {links.map((link, i) => (
                      <a
                        key={i}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-[#04c2fb]/30 bg-[#04c2fb]/5 px-2.5 py-0.5 text-[11px] text-[#04c2fb] hover:bg-[#04c2fb]/10 transition-colors max-w-[220px]"
                        title={link}
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate">{(() => { try { return new URL(link).hostname.replace('www.', '') } catch { return link } })()}</span>
                      </a>
                    ))}
                  </div>
                )}

                {/* Imagens */}
                {imagens.length > 0 && (
                  <div className="pt-3 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Imagens</p>
                    <div className="flex flex-wrap gap-2">
                      {imagens.map((img, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setImagemLightboxUrl(img.url)}
                          title={img.nome}
                          className="block h-20 w-20 rounded-lg overflow-hidden border border-gray-200 hover:ring-2 hover:ring-[#04c2fb]/50 transition-all shrink-0 cursor-zoom-in"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.url} alt={img.nome} className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Outros arquivos */}
                {outrosArquivos.length > 0 && (
                  <div className="pt-3 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Arquivos</p>
                    <div className="flex flex-wrap gap-2">
                      {outrosArquivos.map((arq, i) => (
                        <a
                          key={i}
                          href={arq.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-[#04c2fb]/40 transition-colors"
                        >
                          <Paperclip className="h-3 w-3 shrink-0" />
                          <span className="max-w-[180px] truncate">{arq.nome}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Rodapé com botão Editar */}
              <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100">
                <button
                  onClick={abrirEditor}
                  title="Abrir editor completo"
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-110 active:scale-95 transition-all"
                  style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
                >
                  <Pencil className="h-4 w-4" />
                  Editar registro
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightbox de imagem — separado para não fechar o modal principal */}
      <Dialog open={!!imagemLightboxUrl} onOpenChange={() => setImagemLightboxUrl(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black/90 border-0">
          <VisuallyHidden>
            <DialogTitle>Visualizar imagem</DialogTitle>
          </VisuallyHidden>
          {imagemLightboxUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imagemLightboxUrl}
              alt="Visualizar imagem"
              className="max-h-[80vh] w-auto mx-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
