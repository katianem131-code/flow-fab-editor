import { createFileRoute } from "@tanstack/react-router";
import { LegalContact, LegalLayout, LegalSection } from "@/components/legal/LegalLayout";

export const Route = createFileRoute("/privacidade")({
  head: () => ({ meta: [{ title: "Política de Privacidade — LabRemix" }, { name: "description", content: "Saiba como o LabRemix trata dados de cadastro, mídias e conexões com o Instagram e como solicitar sua exclusão." }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalLayout title="Política de Privacidade" intro="Esta política explica o tratamento de dados ao usar o LabRemix para editar mídias, utilizar recursos de inteligência artificial e agendar publicações nas contas que você autorizar.">
      <LegalSection title="1. Responsável e contato"><LegalContact /></LegalSection>
      <LegalSection title="2. Dados utilizados e finalidades">
        <p><strong>Cadastro e acesso:</strong> nome informado, e-mail e dados de autenticação, para criar e manter sua conta, recuperar o acesso e proteger sessões.</p>
        <p><strong>Projetos e publicações:</strong> vídeos, imagens, nomes de arquivos, textos, legendas, configurações de edição, contas de destino, horários e resultados de publicação, para salvar projetos, sincronizar mídias e executar os agendamentos solicitados.</p>
        <p><strong>Conexão com a Meta:</strong> identificadores e informações das Páginas e contas profissionais autorizadas, nome de usuário, foto de perfil, permissões e credenciais de acesso retornadas pela Meta, para identificar suas contas e publicar o conteúdo selecionado. As credenciais dessa integração são tratadas no servidor e não são exibidas ao navegador. O LabRemix não solicita sua senha do Facebook ou Instagram.</p>
        <p><strong>Planos e operação:</strong> e-mail do comprador, plano, saldo de créditos, identificadores e situação de transações recebidos do serviço de pagamento, para liberar recursos e conciliar compras e reembolsos. Também são tratados registros técnicos necessários para investigar falhas e manter o serviço.</p>
      </LegalSection>
      <LegalSection title="3. Onde os dados são tratados">
        <p>Parte da edição e dos rascunhos usa o armazenamento do seu navegador. Quando você utiliza a sincronização e o agendamento com sua conta, arquivos e registros também são enviados à infraestrutura do serviço, que utiliza Supabase para autenticação, banco de dados e armazenamento, e Lovable para a aplicação e recursos associados.</p>
        <p>Ao solicitar recursos de inteligência artificial, textos, imagens ou quadros extraídos dos vídeos podem ser enviados ao gateway de IA da Lovable e ao provedor do modelo, como a OpenAI, para gerar a resposta. Evite incluir informações sensíveis ou dados de outras pessoas sem autorização.</p>
        <p>Recursos de busca e importação por links podem enviar os termos, nomes de perfis ou links solicitados a provedores externos, inclusive serviços disponibilizados pelo RapidAPI. Consultar conteúdo público não concede direito de reutilização.</p>
      </LegalSection>
      <LegalSection title="4. Compartilhamento e serviços externos">
        <p>Os dados necessários são enviados aos prestadores de autenticação, hospedagem, armazenamento, IA e pagamento quando você usa os recursos correspondentes. As mídias e legendas escolhidas são transmitidas à Meta para publicação nas contas autorizadas. Esses serviços podem tratar dados em outros países, conforme suas políticas e condições.</p>
        <p>As informações obtidas por meio da integração com a Meta são usadas para as funcionalidades autorizadas de conexão e publicação. Não são vendidas nem disponibilizadas para publicidade por meio dessa integração.</p>
      </LegalSection>
      <LegalSection title="5. Armazenamento local e segurança">
        <p>O aplicativo e seus provedores utilizam mecanismos de sessão e armazenamento local para autenticação, preferências e projetos. Limpar os dados do site pode apagar rascunhos locais e encerrar sua sessão; isso não exclui automaticamente os registros na nuvem.</p>
        <p>O serviço utiliza autenticação, controles de acesso e comunicação HTTPS. Nenhum sistema elimina todos os riscos. Proteja suas credenciais e use o aplicativo apenas em dispositivos nos quais confia.</p>
      </LegalSection>
      <LegalSection title="6. Conservação e seus pedidos">
        <p>Os dados são mantidos enquanto necessários para prestar o serviço e atender às finalidades descritas. Após um pedido de exclusão, eventuais registros cuja conservação seja necessária para obrigações aplicáveis, segurança ou exercício de direitos podem ser preservados pelo período necessário, com informação sobre a limitação quando cabível. Cópias de segurança podem seguir o ciclo de retenção do provedor.</p>
        <p>Você pode solicitar informações sobre seus dados, acesso, correção, exclusão e esclarecimentos sobre o tratamento pelo contato indicado nesta política. Poderemos confirmar sua identidade de maneira proporcional ao pedido. Não envie senhas ou tokens.</p>
        <p>Consulte <a className="underline" href="/exclusao-de-dados">como solicitar exclusão de dados e revogar a conexão</a>. Desconectar uma conta não equivale a excluir toda a conta LabRemix nem remove publicações já feitas no Instagram.</p>
      </LegalSection>
      <LegalSection title="7. Alterações">
        <p>Esta política pode ser atualizada para acompanhar mudanças no serviço. A data no início indica a versão vigente. Alterações relevantes serão informadas pelos canais do serviço.</p>
      </LegalSection>
    </LegalLayout>
  );
}
