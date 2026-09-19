'use client'
import Link from 'next/link'

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto p-6 pb-24 bg-black min-h-screen text-white">
      <h1 className="text-2xl font-light tracking-wide mb-2">Termos de Uso e Política de Privacidade - MISHH</h1>
      <p className="text-xs text-[#a8a8a8] mb-8">Última atualização: 17 de setembro de 2026 | Em conformidade com a LGPD Lei 13.709/18 e Marco Civil da Internet Lei 12.965/14</p>

      <div className="space-y-7 text-sm text-[#d4d4d4] font-light leading-relaxed">
        
        <section>
          <h2 className="text-white font-medium mb-2">1. Aceitação e Capacidade - Art. 104 do Código Civil</h2>
          <p>Ao criar conta no MISHH você declara ter no mínimo 13 anos, conforme permitido pelo Marco Civil. Se você tem entre 13 e 18 anos, declara ter autorização dos pais ou responsável legal, nos termos do ECA (Lei 8.069/90). Uma conta por pessoa física (CPF). Contas falsas, bots ou com dados de terceiros serão excluídas, conforme art. 307 do Código Penal (falsa identidade).</p>
        </section>

        <section>
          <h2 className="text-white font-medium mb-2">2. Controlador de Dados - LGPD Art. 5º, VI</h2>
          <p>Controlador: MISHH PLATAFORMA DIGITAL LTDA | Contato do Encarregado (DPO): mishh.suport@gmail.com. Tratamos seus dados com base no art. 7º da LGPD: I - consentimento, II - cumprimento de obrigação legal, V - execução de contrato e IX - legítimo interesse para segurança da plataforma.</p>
        </section>

        <section>
          <h2 className="text-white font-medium mb-2">3. Dados Coletados e Finalidade - LGPD Art. 6º</h2>
          <p>Coletamos: nome, username, e-mail, foto, cidade/estado/país, bio, status de relacionamento (com @ opcional), IP, logs de acesso (art. 15 do Marco Civil, guardados por 6 meses), curtidas e follows. Finalidades: identificação, funcionamento do ranking, personalização, segurança e cumprimento legal. Não coletamos dados sensíveis (art. 11 LGPD) sem seu consentimento específico.</p>
        </section>

        <section>
          <h2 className="text-white font-medium mb-2">4. Cidade e Status de Relacionamento - Consentimento LGPD Art. 8º</h2>
          <p>Ao preencher cidade e status de relacionamento você dá consentimento livre e destacado para exibição pública. Esses dados são opcionais e podem ser removidos a qualquer momento em Editar Perfil, com efeito imediato. Ao marcar outra pessoa com @, você declara ter autorização dela. O marcado pode pedir remoção a qualquer momento pelo suporte.</p>
        </section>

        <section className="border border-[#ff7a18]/30 bg-[#ff7a18]/5 p-4 rounded-2xl">
          <h2 className="text-white font-medium mb-2">5. Ranking e Tela de Destaque - Direito de Imagem Art. 20 CC e LGPD Art. 7º, I</h2>
          <p><strong className="text-white">Ao participar do ranking público de curtidas, você autoriza expressamente o uso de sua imagem (foto de perfil), nome, @username, cidade e total de likes em telas de destaque, carrosséis "Em Alta", vitrines dentro do app e materiais de divulgação do MISHH.</strong> A permanência em 1º lugar no ranking geral ou por cidade gera exposição automática. Essa autorização é gratuita, por prazo indeterminado e revogável. Para não ser exposto, mantenha sua conta como Privada em Configurações {'>'} Privacidade - contas privadas não participam do destaque público, conforme art. 7º, §5º da LGPD.</p>
        </section>

        <section>
          <h2 className="text-white font-medium mb-2">6. Direitos do Titular - LGPD Art. 18</h2>
          <p>Você pode a qualquer momento, via e-mail mishh.suport@gmail.com, solicitar: I - Confirmação e acesso; II - Correção; III - Anonimização, bloqueio ou eliminação de dados desnecessários; IV - Portabilidade; V - Eliminação dos dados tratados com consentimento; VI - Revogação do consentimento; VII - Oposição. Responderemos em até 15 dias, conforme art. 19, §2º da LGPD.</p>
        </section>

        <section>
          <h2 className="text-white font-medium mb-2">7. Guarda de Logs - Marco Civil Art. 15 e 16</h2>
          <p>Guardamos logs de acesso por 6 meses, em ambiente seguro, conforme determinação legal. Esses dados só serão fornecidos mediante ordem judicial, nos termos do art. 22 do Marco Civil.</p>
        </section>

        <section>
          <h2 className="text-white font-medium mb-2">8. Conteúdo do Usuário e Responsabilidade - Marco Civil Art. 19</h2>
          <p>O MISHH é provedor de aplicações e não se responsabiliza por conteúdo gerado por terceiros. Conteúdo com nudez, pornografia infantil (art. 241-A ECA - crime), discurso de ódio, racismo (Lei 7.716/89) ou apologia ao crime será removido e o usuário banido. Denúncias podem ser feitas no botão Denunciar.</p>
        </section>

        <section>
          <h2 className="text-white font-medium mb-2">9. Propriedade Intelectual e Anti-Fraude</h2>
          <p>Likes, seguidores e contadores são controlados pelo servidor. Uso de bots, scripts ou manipulação configura fraude e violação ao art. 171 do Código Penal (estelionato digital) e gera banimento definitivo e responsabilização civil.</p>
        </section>

        <section className="border border-red-500/30 bg-red-500/5 p-4 rounded-2xl">
          <h2 className="text-white font-medium mb-2">9.1. Suspensão e Exclusão de Conta por Violação das Regras e da Lei - Marco Civil Art. 7º e 8º / CDC Art. 6º</h2>
          <p className="mb-3">
            O MISHH, na qualidade de provedor de aplicação e proprietário da plataforma, reserva-se o direito de <strong className="text-white">suspender temporariamente, bloquear ou excluir definitivamente</strong> a conta de qualquer usuário, a seu exclusivo critério, nas seguintes hipóteses:
          </p>
          <ul className="list-disc list-inside space-y-2 mb-3 text-[#d4d4d4]">
            <li><strong className="text-white">I - Violação destes Termos:</strong> descumprimento de qualquer cláusula destes Termos de Uso, incluindo uso de contas falsas, bots, manipulação de likes/ranking, assédio, spam, ou conteúdo ofensivo.</li>
            <li><strong className="text-white">II - Violação da Lei:</strong> prática de atos ilícitos, crimes previstos no Código Penal, Marco Civil (Lei 12.965/14), ECA, Lei de Racismo (7.716/89) e demais legislações brasileiras. Ex: pornografia infantil (art. 241-A ECA), racismo, injúria, difamação, estelionato, falsa identidade (art. 307 CP).</li>
            <li><strong className="text-white">III - Determinação Legal:</strong> cumprimento de ordem judicial, requisição de autoridade policial ou do Ministério Público.</li>
          </ul>
          <p className="mb-3">
            <strong className="text-white">Procedimento:</strong> Em casos de violação, a exclusão poderá ocorrer sem aviso prévio quando houver risco à segurança da plataforma ou de terceiros. Nos demais casos, o usuário será notificado por e-mail sobre o motivo da sanção, nos termos do art. 6º, III do CDC (direito à informação). O usuário poderá apresentar recurso em até 7 dias para o DPO: mishh.suport@gmail.com.
          </p>
          <p>
            A exclusão por justa causa não gera direito a indenização, compensação ou reativação, conforme art. 7º, VIII e art. 8º do Marco Civil que garantem a liberdade de iniciativa e definição do modelo de negócio do provedor. Dados pessoais serão tratados conforme item 10 e logs mantidos conforme obrigação legal (item 7).
          </p>
        </section>

        <section>
          <h2 className="text-white font-medium mb-2">10. Exclusão e Direito ao Esquecimento - LGPD Art. 16</h2>
          <p>Você pode excluir sua conta em Configurações {'>'} Excluir Conta. Seus dados pessoais serão anonimizados em até 30 dias, exceto os que devemos manter por obrigação legal (logs, conforme item 7). Em caso de exclusão por violação (item 9.1), a anonimização seguirá o mesmo prazo.</p>
        </section>

        <section>
          <h2 className="text-white font-medium mb-2">11. Foro e Legislação</h2>
          <p>Este termo é regido pelas leis brasileiras. Fica eleito o Foro da Comarca do seu domicílio, conforme art. 101 do Código de Defesa do Consumidor e art. 46 do CPC, para dirimir quaisquer dúvidas.</p>
        </section>

        <section className="pt-6 border-t border-[#262626] text-xs text-[#a8a8a8]">
          <p>Controlador: MISHH | Encarregado/DPO: mishh.suport@gmail.com | Endereço para notificações judiciais: via e-mail do DPO, conforme Marco Civil Art. 10, §1º.</p>
          <p className="mt-2">Ao clicar em "Criar Conta", você declara ter lido e concordado com estes Termos, incluindo a cláusula 9.1 de suspensão e exclusão por violação, nos termos do art. 7º, VIII do CDC (informação clara).</p>
        </section>
      </div>

      <div className="flex gap-3 mt-10">
        <Link href="/signup" className="inline-block text-sm text-white border border-[#262626] rounded-full px-6 py-3 hover:bg-[#111]">← Voltar</Link>
        <Link href="/privacy" className="inline-block text-sm text-[#a8a8a8] border border-[#262626] rounded-full px-6 py-3 hover:bg-[#111]">Ver Política Completa</Link>
      </div>
    </main>
  )
}