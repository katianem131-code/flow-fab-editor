import { createFileRoute } from "@tanstack/react-router";
import { LEGAL_CONTACT, LegalContact, LegalLayout, LegalSection } from "@/components/legal/LegalLayout";

export const Route = createFileRoute("/exclusao-de-dados")({
  head: () => ({ meta: [{ title: "Exclusão de dados — LabRemix" }, { name: "description", content: "Instruções públicas para solicitar exclusão de dados do LabRemix e revogar sua conexão com a Meta." }] }),
  component: DeletionPage,
});

function DeletionPage() {
  return (
    <LegalLayout title="Exclusão de dados" intro="Você pode solicitar a exclusão da sua conta LabRemix ou apenas dos dados relacionados à conexão com Facebook e Instagram. Este pedido pode ser feito por e-mail, sem entrar no aplicativo.">
      <LegalSection title="1. Envie seu pedido">
        <p>Escreva para <a className="underline" href={`mailto:${LEGAL_CONTACT}?subject=Solicita%C3%A7%C3%A3o%20de%20exclus%C3%A3o%20de%20dados%20LabRemix`}>{LEGAL_CONTACT}</a> com o assunto “Solicitação de exclusão de dados LabRemix”. Informe o e-mail cadastrado no LabRemix, o nome de usuário do Instagram conectado, se houver, e se deseja excluir a conta inteira ou somente os dados da integração Meta.</p>
        <p>Preferencialmente, envie o pedido pelo e-mail cadastrado. Podemos solicitar uma confirmação de identidade para evitar exclusões indevidas. Não envie senhas, tokens de acesso, códigos de autenticação ou documentos pessoais no pedido inicial.</p>
        <p>O atendimento é feito pelo responsável do serviço. O envio de um e-mail não executa uma exclusão automática: aguarde a confirmação de recebimento e a resposta sobre a conclusão ou eventual necessidade de informações adicionais. Para acompanhar, responda à mesma conversa.</p>
      </LegalSection>
      <LegalSection title="2. O que o pedido abrange">
        <p>Para a integração Meta, o pedido abrange as credenciais de conexão e os dados das contas sociais armazenados pelo LabRemix, além dos registros relacionados à integração conforme o escopo confirmado. Informe se existem agendamentos pendentes que devem ser cancelados.</p>
        <p>Para a conta completa, o pedido abrange cadastro, projetos, mídias e agendamentos armazenados no serviço. Dados cuja conservação seja necessária para obrigações aplicáveis, segurança ou exercício de direitos podem ser preservados pelo período necessário; eventuais limitações serão explicadas. Cópias de segurança podem seguir o ciclo de retenção do provedor.</p>
        <p>A exclusão no LabRemix não apaga sua conta Facebook ou Instagram, nem publicações já enviadas a essas plataformas. Rascunhos locais no navegador também precisam ser removidos no dispositivo.</p>
      </LegalSection>
      <LegalSection title="3. Desconecte a conta e revogue o acesso">
        <p>No LabRemix, abra Configurar ou Agenda e, na seção Contas do Instagram, use o botão Desconectar da conta desejada. Antes, revise e cancele os agendamentos que não deseja executar. Desconectar remove a conexão salva no aplicativo, mas não substitui o pedido de exclusão de todos os seus dados.</p>
        <p>Para revogar a autorização na Meta, procure LabRemix em Aplicativos e sites, Integrações comerciais ou Apps conectados nas configurações do Facebook ou do portfólio empresarial utilizado. As opções variam conforme o tipo de conexão. Revogar o acesso na Meta também não remove automaticamente as publicações anteriores.</p>
      </LegalSection>
      <LegalSection title="4. Dados salvos no navegador">
        <p>Após guardar as cópias que deseja manter, você pode limpar os dados do site LabRemix nas configurações do navegador para remover o armazenamento local daquele dispositivo. Isso pode apagar rascunhos e preferências e encerrar a sessão; não exclui automaticamente os dados na nuvem.</p>
      </LegalSection>
      <LegalSection title="5. Contato"><LegalContact /></LegalSection>
    </LegalLayout>
  );
}
