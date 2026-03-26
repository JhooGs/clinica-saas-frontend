# CLAUDE.md — Frontend (clinica-saas-frontend)

Instruções específicas do frontend. Complementam o `CLAUDE.md` da raiz do repositório.

---

## Responsividade — Regra Obrigatória

**Todo componente, página, card, modal ou qualquer elemento de UI criado ou modificado DEVE ser responsivo.**
Isso não é opcional — trate ausência de responsividade como bug.

### Breakpoints Tailwind usados no projeto

| Prefixo | Largura mínima | Dispositivo típico |
|---------|---------------|-------------------|
| _(sem prefixo)_ | 0px | Mobile (base) |
| `sm:` | 640px | Tablet pequeno |
| `md:` | 768px | Tablet |
| `lg:` | 1024px | Desktop |
| `xl:` | 1280px | Desktop largo |

**Escreva sempre mobile-first:** defina o estilo base para mobile e sobrescreva com breakpoints maiores.

### Checklist obrigatório ao criar/modificar UI

- [ ] **Grids**: nunca use `grid-cols-N` fixo sem breakpoints. Padrão: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-N`
- [ ] **Flex layouts**: verifique se `gap`, `padding` e `font-size` são adequados em telas de 375px
- [ ] **Tabelas**: sempre envolva em `<div className="overflow-x-auto">` para scroll horizontal no mobile
- [ ] **Modais/Sheets**: adicione `<Title className="sr-only">` para acessibilidade (requisito Radix)
- [ ] **Textos**: prefira tamanhos responsivos (`text-sm sm:text-base`) a tamanhos fixos grandes
- [ ] **Padding de container**: use `p-3 sm:p-6` ou `px-4 sm:px-6`, nunca `p-6` fixo em conteúdo de página
- [ ] **Imagens e SVGs**: use `w-full h-auto` com `viewBox` ou `sizes` adequados — nunca largura fixa em px sem breakpoint

### Sidebar e navegação mobile

O projeto usa um padrão de layout fixo:
- **Desktop (`md+`)**: `AppSidebar` visível como coluna lateral (`hidden md:flex`)
- **Mobile (< `md`)**: `MobileHeader` com drawer lateral (`Sheet`) — definido em `components/mobile-header.tsx`

Ao adicionar itens de navegação, atualize **ambos**: `components/app-sidebar.tsx` e `components/mobile-header.tsx`.

### Referências de componentes responsivos já implementados

- `app/dashboard/pacientes/[id]/page.tsx` — exemplo de página com cards, grids e SVGs responsivos
- `components/mobile-header.tsx` — padrão de drawer mobile
- `components/app-sidebar.tsx` — sidebar desktop com collapse

---

## Feedback de Ações — Regra Obrigatória

**Toda ação do usuário que modifica dados DEVE exibir um toast de feedback.**
Isso não é opcional — ausência de feedback é tratada como bug de UX.

### Como usar

```tsx
import { toast } from 'sonner'

// ✅ Sucesso (verde) — ação concluída com êxito
toast.success('Título', { description: 'Mensagem opcional.' })

// ❌ Erro (vermelho) — falha na operação
toast.error('Título', { description: 'O que deu errado.' })

// ℹ️ Info (azul) — informação neutra (ex: rascunho salvo)
toast.info('Título', { description: 'Contexto adicional.' })

// ⚠️ Aviso (laranja) — atenção sem ser erro
toast.warning('Título', { description: 'O que o usuário deve saber.' })
```

O `<Toaster />` já está em `app/layout.tsx` — não adicione outro.

### Checklist obrigatório ao criar/modificar ações

- [ ] **Criar registro** (paciente, transação, agendamento…) → `toast.success`
- [ ] **Editar/salvar registro** → `toast.success`
- [ ] **Excluir registro** → `toast.success` com descrição indicando o item removido
- [ ] **Erro de validação ou API** → `toast.error` com descrição clara do problema
- [ ] **Autosave / rascunho** → `toast.info` com `id` fixo para não empilhar (ex: `id: 'draft-123'`)
- [ ] **Ações destrutivas confirmadas** → `toast.success` após confirmação

### Exemplos já implementados

| Arquivo | Ação | Toast |
|---------|------|-------|
| `app/auth/login/page.tsx` | Login inválido | `toast.error` |
| `app/dashboard/pacientes/page.tsx` | Novo paciente | `toast.success` |
| `app/dashboard/pacientes/[id]/page.tsx` | Editar paciente | `toast.success` |
| `app/dashboard/financeiro/page.tsx` | Nova transação | `toast.success` |
| `app/dashboard/registros/[id]/page.tsx` | Salvar registro | `toast.success` / `toast.error` |
| `hooks/use-registro-draft.ts` | Autosave rascunho | `toast.info` (ID fixo) |
