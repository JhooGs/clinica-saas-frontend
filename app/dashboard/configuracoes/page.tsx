import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ConfiguracoesGeralPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Informações Gerais</CardTitle>
        <CardDescription>Configurações básicas da clínica</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Em breve.</p>
      </CardContent>
    </Card>
  )
}
