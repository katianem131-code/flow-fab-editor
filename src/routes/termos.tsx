import { createFileRoute } from "@tanstack/react-router";
import { LegalContact, LegalLayout, LegalSection } from "@/components/legal/LegalLayout";

export const Route = createFileRoute("/termos")({
  head: () => ({ meta: [{ title: "Termos de Uso — LabRemix" }, { name: "description", content: "Condições de uso do editor, recursos de IA e agendamento de publicações do LabRemix." }] }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalLayout title="Termos de Uso" intro="Estes termos descrevem as condições de uso do LabRemix. Leia também a Política de Privacidade antes de criar uma conta ou conectar suas redes sociais.">
      <LegalSection title="1. Serviço e responsável">
        <LegalContact />
        <p>O LabRemix oferece edição de vídeos e imagens, organização de projetos, recursos de inteligência artificial e agendamento de publicações em contas profissionais compatíveis. Os recursos disponíveis podem variar conforme o plano, a configuração das integrações e as limitações dos provedores.</p>
      </LegalSection>
      <LegalSection title="2. Conta e autorização">
        <p>Forneça informações corretas, proteja suas credenciais e utilize apenas contas sociais que você possui ou está autorizado a administrar. Não compartilhe senhas, códigos de confirmação ou credenciais de API com outras pessoas.</p>
        <p>Conectar o Instagram autoriza os acessos apresentados pela Meta. A conexão, por si só, não cria uma postagem. Ao confirmar um agendamento, você instrui o LabRemix a enviar as mídias e legendas selecionadas às contas indicadas, no horário escolhido, conforme a disponibilidade da integração.</p>
      </LegalSection>
      <LegalSection title="3. Conteúdo e uso permitido">
        <p>Você mantém os direitos que possui sobre seu conteúdo e autoriza seu tratamento e transmissão na medida necessária para executar as funcionalidades solicitadas. Você deve possuir os direitos e autorizações necessários sobre imagens, vídeos, músicas, marcas e dados de terceiros.</p>
        <p>Não utilize o serviço para fraude, spam, violação de privacidade ou direitos autorais, conteúdo ilegal ou tentativa de contornar proteções e limites das plataformas. A edição, o download ou uma transformação por IA não tornam automaticamente permitido o uso de conteúdo alheio.</p>
        <p>Revise mídias, legendas, contas de destino e horários antes de agendar. Resultados de IA podem conter erros e devem ser conferidos antes de qualquer uso.</p>
      </LegalSection>
      <LegalSection title="4. Publicações e serviços de terceiros">
        <p>A entrega depende da conexão autorizada, das permissões concedidas, dos formatos aceitos, dos limites da API e da disponibilidade da Meta e dos demais serviços envolvidos. Não há garantia de alcance, engajamento, monetização ou publicação em horário exato.</p>
        <p>Acompanhe a situação dos agendamentos na Agenda. Publicações concluídas permanecem na rede social até serem removidas por meio dela. Desconectar o Instagram ou excluir dados no LabRemix não remove automaticamente essas publicações.</p>
        <p>O LabRemix é um serviço independente. A integração com as APIs da Meta não representa endosso ou garantia da Meta. Você também deve cumprir os termos e políticas das plataformas utilizadas.</p>
      </LegalSection>
      <LegalSection title="5. Planos, créditos e compras">
        <p>Consulte os preços, limites e condições apresentados no plano e no checkout antes de contratar. A liberação de créditos e recursos depende da confirmação do pagamento. Pedidos sobre cobrança, cancelamento ou reembolso podem ser encaminhados ao contato do serviço, sem prejuízo dos direitos aplicáveis e das condições informadas na contratação.</p>
      </LegalSection>
      <LegalSection title="6. Disponibilidade e encerramento">
        <p>O serviço pode sofrer interrupções, manutenção ou mudanças de funcionalidades. Mantenha cópias dos arquivos importantes. O acesso pode ser restringido em caso de uso indevido, comprometimento de segurança ou exigência da plataforma, com esclarecimentos pelo contato do serviço quando possível.</p>
        <p>Você pode deixar de usar o serviço, revogar as conexões e solicitar exclusão de dados. Veja as <a className="underline" href="/exclusao-de-dados">instruções de exclusão</a> e a <a className="underline" href="/privacidade">Política de Privacidade</a>.</p>
        <p>Estes termos não afastam direitos assegurados pela legislação aplicável. Eventuais alterações serão identificadas pela data de atualização e, quando relevantes, informadas pelos canais do serviço.</p>
      </LegalSection>
    </LegalLayout>
  );
}
