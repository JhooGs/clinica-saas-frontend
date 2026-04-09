'use client'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'

// ─── Changelog ────────────────────────────────────────────────────────────────
// Adicione uma entrada por versão. A primeira da lista é a mais recente.
// Categorias disponíveis: 'Added' | 'Changed' | 'Fixed' | 'Removed' | 'Security'

type Category = 'Added' | 'Changed' | 'Fixed' | 'Removed' | 'Security'

interface ChangeEntry {
  category: Category
  description: string
}

interface VersionEntry {
  version: string
  date: string
  changes: ChangeEntry[]
}

const CHANGELOG: VersionEntry[] = [
  {
    version: 'v0.3',
    date: '9 de abril de 2026',
    changes: [
      { category: 'Changed', description: 'Alterado layout da página de importação de dados históricos para deixar mais claro as etapas de atualização.' },
      { category: 'Changed', description: 'Alterado forma como é interpretado o financeiro, agora a base é o mês/ano de referência da transação.' },
      { category: 'Fixed', description: 'Resolvido bug na importação de dados históricos que impedia a atualização dos dados.' },
      { category: 'Fixed', description: 'Resolvido bug na importação de dados financeiro onde os valores eram interpretados errados.' },
      { category: 'Added', description: 'Adicionado versão badge para mostrar a versão do app.' },
    ],
  },
]

// ─── Estilos por categoria ─────────────────────────────────────────────────────

const CATEGORY_STYLE: Record<Category, { label: string; className: string }> = {
  Added:    { label: 'Added',    className: 'bg-emerald-100 text-emerald-700' },
  Changed:  { label: 'Changed',  className: 'bg-blue-100 text-blue-700' },
  Fixed:    { label: 'Fixed',    className: 'bg-amber-100 text-amber-700' },
  Removed:  { label: 'Removed',  className: 'bg-red-100 text-red-700' },
  Security: { label: 'Security', className: 'bg-purple-100 text-purple-700' },
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function VersionBadge() {
  const latest = CHANGELOG[0]

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Popover>
        <PopoverTrigger asChild>
          <button className="text-[11px] font-mono text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors px-2 py-1 rounded-md hover:bg-muted/40">
            {latest.version}
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="w-80 p-0 overflow-hidden">
          <div className="px-4 py-3 border-b">
            <p className="text-sm font-semibold text-foreground">
              Histórico de versões
            </p>
          </div>
          <ScrollArea className="max-h-96">
            <div className="divide-y">
              {CHANGELOG.map((entry) => (
                <div key={entry.version} className="px-4 py-3">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-sm font-semibold text-foreground">
                      {entry.version}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {entry.date}
                    </span>
                  </div>
                  {entry.changes.length === 0 ? (
                    <p className="text-xs text-muted-foreground/50 italic">
                      Sem entradas ainda.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {entry.changes.map((change, i) => {
                        const style = CATEGORY_STYLE[change.category]
                        return (
                          <li key={i} className="text-xs">
                            <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none mb-0.5 ${style.className}`}>
                              {style.label}
                            </span>
                            <p className="text-muted-foreground leading-snug">
                              {change.description}
                            </p>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  )
}
