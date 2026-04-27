'use client'

/**
 * Modal exibido quando uma ação retorna 403 com "dois fatores obrigatório".
 *
 * Dois cenários:
 *   1. MFA não cadastrado → instrui a ir em Configurações → Segurança
 *   2. MFA cadastrado mas sessão em AAL1 → permite elevar diretamente inserindo o código
 *
 * Uso em mutations:
 *   onError: (err) => {
 *     if (err instanceof MFARequiredError) setMfaModalAberto(true)
 *     else toast.error(err.message)
 *   }
 *   onSuccess: () => setMfaModalAberto(false)  // após elevar, retentar a ação
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Loader2, KeyRound, ExternalLink } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { toast } from 'sonner'
import { useMFA } from '@/hooks/use-mfa'

interface ModalMFARequiredProps {
  open: boolean
  onClose: () => void
  /** Chamado após elevar a sessão com sucesso — o caller pode retentar a ação */
  onSessaoElevada?: () => void
}

export function ModalMFARequired({ open, onClose, onSessaoElevada }: ModalMFARequiredProps) {
  const router = useRouter()
  const { fatorAtivo, mfaAtivo, carregando, elevarSessao } = useMFA()
  const [codigo, setCodigo] = useState('')
  const [verificando, setVerificando] = useState(false)

  async function handleVerificar() {
    if (!fatorAtivo || codigo.length !== 6) return
    setVerificando(true)
    try {
      await elevarSessao(fatorAtivo.id, codigo)
      toast.success('Verificação concluída', { description: 'Você pode continuar com a operação.' })
      setCodigo('')
      onSessaoElevada?.()
      onClose()
    } catch {
      toast.error('Código inválido', { description: 'Verifique o código no seu app autenticador.' })
    } finally {
      setVerificando(false)
    }
  }

  function handleIrParaSeguranca() {
    onClose()
    router.push('/dashboard/configuracoes?aba=seguranca')
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!verificando) { onClose(); setCodigo('') } }}>
      <DialogContent className="max-w-sm">
        <VisuallyHidden><DialogTitle>Verificação de dois fatores</DialogTitle></VisuallyHidden>

        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#04c2fb]/10">
              <Shield className="h-5 w-5 text-[#04c2fb]" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">Verificação necessária</p>
              <p className="text-xs text-muted-foreground">Esta ação requer autenticação de dois fatores</p>
            </div>
          </div>

          {carregando ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : mfaAtivo ? (
            /* MFA cadastrado — pedir código para elevar sessão */
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Insira o código de 6 dígitos do seu aplicativo autenticador para confirmar a operação.
              </p>
              <div className="space-y-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={codigo}
                  onChange={e => setCodigo(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  disabled={verificando}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-center text-xl font-mono font-semibold tracking-widest outline-none focus:border-[#04c2fb] focus:ring-1 focus:ring-[#04c2fb]/30 disabled:opacity-50"
                  onKeyDown={e => { if (e.key === 'Enter') handleVerificar() }}
                  autoFocus
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={onClose}
                  disabled={verificando}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleVerificar}
                  disabled={codigo.length !== 6 || verificando}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
                >
                  {verificando ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  Verificar
                </button>
              </div>
            </div>
          ) : (
            /* MFA não cadastrado — instruir para configurar */
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Esta ação exige autenticação de dois fatores, mas você ainda não configurou
                o MFA na sua conta. Configure agora em Configurações.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleIrParaSeguranca}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
                  style={{ background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)' }}
                >
                  <ExternalLink className="h-4 w-4" />
                  Configurar MFA
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
