'use client'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

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
    version: 'v1.0.0',
    date: '26 de abril de 2026',
    changes: [
      { category: 'Added', description: 'Sistema de criptografia completamente atualizado.'},
      { category: 'Added', description: 'Agora é possível exportar dados históricos do paciente.'},
      { category: 'Added', description: 'Agora é possível deletar todos os dados sensíveis paciente.'},
      { category: 'Added', description: 'Autenticação de dois fatores foi adicionada no sistema.'},
      { category: 'Added', description: 'Sistema de auditoria adicionado no sistema.'},
    ],
  },
  {
    version: 'v0.4.1',
    date: '24 de abril de 2026',
    changes: [
      { category: 'Fixed', description: 'Ajustado problema das notificações no mobile.'},
      { category: 'Changed', description: 'Agendamentos cancelados agora tem um destaque diferente na agenda.'},
      { category: 'Added', description: 'Criado sistema de templates para mensagens pelo Whatsapp'},
    ],
  },
  {
    version: 'v0.4.0',
    date: '23 de abril de 2026',
    changes: [
      { category: 'Added', description: 'Agora é possível confirmar atendimento pelo whatsapp para os clientes.'},
      { category: 'Added', description: 'Novo campo endereço no perfil do paciente.'},
    ],
  },
  {
    version: 'v0.3.2',
    date: '22 de abril de 2026',
    changes: [
      { category: 'Added', description: 'Filtro do financeiro foi melhorado.'},
      { category: 'Changed', description: 'Todos os nomes, titulos Sessão foram trocados para Atendimento'},
      { category: 'Changed', description: 'Atendimentos padrão podem ser editados e deletados agora.'},
      { category: 'Changed', description: 'As notificações aparecem com uma frequencia menor.'},
      { category: 'Fixed', description: 'Resolvido bug onde um registro aparecia pendente mas o atendimento não ocorreu ainda.'},
      { category: 'Fixed', description: 'Acontecia um erro quando algumas páginas eram acessadas e precisava recarregar a página.'},
      { category: 'Fixed', description: 'Resolvido um problema onde aparecia que não tinha sessão mas estava apenas carregando, agora aparece o loading da Clinitra.'},
      { category: 'Added', description: 'Adicionado uma forma de dizer qual tipo de atendimento deve ser contabilizado.'},
    ],
  },
  {
    version: 'v0.3.1',
    date: '21 de abril de 2026',
    changes: [
      { category: 'Added', description: 'Agora é possível escolher quais colunas deseja visualizar nas tabelas de registro e do paciente.'},
      { category: 'Fixed', description: 'Resolvido bug onde um agendamendo mostrava ocupado quando não tinha nada agendado.'},
    ],
  },
  {
    version: 'v0.3.0',
    date: '20 de abril de 2026',
    changes: [
      { category: 'Added', description: 'Menu com perfil da clínica foi adicionado.'},
      { category: 'Added', description: 'Agora existem cards informativos na página inicial.'},
      { category: 'Added', description: 'Agora a imagem da clínica fica visivel no canto direito.'},
      { category: 'Fixed', description: 'Logo da clínica não era salvo em banco, isso foi corrigido.'},
      { category: 'Changed', description: 'Fonte do sistema foi alterada.'},
      { category: 'Changed', description: 'Novo menu de configurações no mobile.'},
    ],
  },
  {
    version: 'v0.2.2',
    date: '18 de abril de 2026',
    changes: [
      { category: 'Fixed', description: 'Ajustado erro que não deletava um registro corretamente.'},
      { category: 'Fixed', description: 'Alguns dados do perfil da clínica não eram salvos, isso foi corrigido.'},
      { category: 'Changed', description: 'Mudanças visuais no financeiro.'},
      { category: 'Changed', description: 'Mudanças visuais nas configurações.'},
      { category: 'Changed', description: 'Barra lateral foi visualmente reformulada.'},
      { category: 'Changed', description: 'Agora novas clínicas precisam informar nome do responsável e especialidade.'},
    ],
  },
  {
    version: 'v0.2.1',
    date: '17 de abril de 2026',
    changes: [
      { category: 'Fixed', description: 'Ajustado fuso horário, algumas funções exibiam horários incorretos.'},
      { category: 'Fixed', description: 'Ajustado bug que não editava participantes depois de um agendamento feito.'},
      { category: 'Changed', description: 'Refatorado tabela de histórico do paciente.'},
      { category: 'Changed', description: 'Agora editar um registro não permite editar a Data da sessão e nem seu tipo.'},
      { category: 'Changed', description: 'Refeito lógica de descições do financeiro.'},
      { category: 'Changed', description: 'Sessões em grupo agora são registradas juntas, mas as faltas não recebem registro.'},
      { category: 'Changed', description: 'Agenda foi alterada para mostrar o dia atual antes, retrair dias passados e visual da semana melhorado.'},
      
      
    ],
  },
  {
    version: 'v0.2.0',
    date: '16 de abril de 2026',
    changes: [
      { category: 'Added', description: 'Foi adicionado introdução para novos usuários, aparece somente para quem acessa pela primeira vez o sistema.'},
      
    ],
  },
  {
    version: 'v0.1.9',
    date: '16 de abril de 2026',
    changes: [
      { category: 'Fixed', description: 'Ajustado bug que não gerava registros para pacientes que faziam parte de um grupo.'},
      { category: 'Added', description: 'Agora é possível criar registros em grupo e ficam no histórico de cada um isoladamente.'},
      { category: 'Changed', description: 'Número da sessão agora é editável, os outros seguem a lógica a partir do número informado.'},
      
    ],
  },
  {
    version: 'v0.1.8',
    date: '15 de abril de 2026',
    changes: [
      { category: 'Added', description: 'Agora páginas que ficam carregando mostra a logo da Clinitra'},
      { category: 'Changed', description: 'Agora não é possível alterar presença na edição de um registro.'},
      { category: 'Changed', description: 'Agora os registros abrem em modo janela ao invés de uma nova página.'},
      { category: 'Changed', description: 'Agora o número da sessão do paciente é feita por ordem cronológica da sessão, antes era por ordem de entrada na plataforma.'},
      

      
    ],
  },
  {
    version: 'v0.1.7',
    date: '14 de abril de 2026',
    changes: [
      { category: 'Added', description: 'Agora é possível filtrar histórico do paciente por status.'},
      { category: 'Fixed', description: 'Corrigido um bug que não deixava usar tópicos nos registros do paciente.'},
      { category: 'Fixed', description: 'Corrigido um bug em registros onde as imagens se perdiam depois que eram salvas.'},
      { category: 'Changed', description: 'Atualizado badge de versionamento, agora tudo fica agrupado por categoria.'},
      { category: 'Changed', description: 'Campos "Valor da sessão" e "N da sessão" foram retirados da etapa de registro.'},
      { category: 'Changed', description: 'Refatorado área de edição de registro, agora tem maior aproveitamento do espaço.'},
      { category: 'Changed', description: 'Atualizado a forma de anexar imagens no registro de sessão, agora elas ficam em miniatura e não no meio do texto.'},
      { category: 'Changed', description: 'A opção ver notas agora exibe o registro por completo com barra de rolagem, imagem em minuatura e arquivos anexados.'},

      
    ],
  },
  {
    version: 'v0.1.6',
    date: '13 de abril de 2026',
    changes: [
      { category: 'Added', description: 'Novo sistema de plano criado para melhorar a gestão de pacotes e valores.'},
      { category: 'Changed', description: 'Agora a escolha dos campos dentro do plano de atendimento são obrigatórios.'},
      { category: 'Fixed', description: 'Ajustado bug que não atualizava o financeiro com o valor das sessões.'},
      
    ],
  },
  {
    version: 'v0.1.5',
    date: '12 de abril de 2026',
    changes: [
      { category: 'Added', description: 'Agora é possível dar baixa em despesas também além de receitas.' },
      { category: 'Added', description: 'Novas colunas adicionadas ao importar pacientes.' },
      { category: 'Fixed', description: 'Resolvido bugs gerais na no registro de sessões.' },
      { category: 'Fixed', description: 'Agora os cards do paciente mostram os valores corretamente.' },
      { category: 'Changed', description: 'Agora a barra de rolagem fica sempre onde parou.' },
      
    ],
  },
  {
    version: 'v0.1.4',
    date: '10 de abril de 2026',
    changes: [
      { category: 'Changed', description: 'A agenda agora mostra as sessões agendadas no passado e não apenas as futuras.' },
      { category: 'Fixed', description: 'Resolvido bugs gerais na agenda.' },
      { category: 'Fixed', description: 'Resolvido problemas de registros que não eram exibidos no histórico do paciente.' },
    ],
  },
  {
    version: 'v0.1.3',
    date: '9 de abril de 2026',
    changes: [
      { category: 'Changed', description: 'Alterado layout da página de importação de dados históricos para deixar mais claro as etapas de atualização.' },
      { category: 'Changed', description: 'Alterado forma como é interpretado o financeiro, agora a base é o mês/ano de referência da transação.' },
      { category: 'Fixed', description: 'Resolvido bug na importação de dados históricos que impedia a atualização dos dados.' },
      { category: 'Added', description: 'Adicionado versão badge para mostrar a versão do app.' },
      { category: 'Added', description: 'Adicionado PWA para melhorar a experiência em celulares.' },
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
        <PopoverContent side="top" align="end" className="w-[calc(100vw-2rem)] sm:w-160 p-0 overflow-hidden">
          <div className="px-4 py-3 border-b">
            <p className="text-sm font-semibold text-foreground">
              Histórico de versões
            </p>
          </div>
          <div className="max-h-96 overflow-y-auto">
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
                  ) : (() => {
                    const grouped = entry.changes.reduce<Record<Category, string[]>>(
                      (acc, change) => {
                        if (!acc[change.category]) acc[change.category] = []
                        acc[change.category].push(change.description)
                        return acc
                      },
                      {} as Record<Category, string[]>
                    )
                    const categoryOrder: Category[] = ['Added', 'Changed', 'Fixed', 'Removed', 'Security']
                    const presentCategories = categoryOrder.filter((c) => grouped[c])
                    return (
                      <div className="space-y-2">
                        {presentCategories.map((cat) => {
                          const style = CATEGORY_STYLE[cat]
                          return (
                            <div key={cat}>
                              <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none mb-1 ${style.className}`}>
                                {style.label}
                              </span>
                              <ul className="space-y-0.5 pl-1">
                                {grouped[cat].map((desc, i) => (
                                  <li key={i} className="flex gap-1.5 text-xs text-muted-foreground leading-snug">
                                    <span className="mt-[3px] shrink-0 text-[8px] text-muted-foreground/50">●</span>
                                    <span>{desc}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
