-- =====================================================
-- MISHH - Fix RLS para conversas/mensagens
-- Erro: "new row violates row-level security policy for table 'conversations'"
-- Causa: faltava policy de INSERT em `conversations` e
--        faltava WITH CHECK em `conversation_participants`.
-- =====================================================

-- CONVERSATIONS: permitir INSERT para qualquer usuário autenticado.
-- A linha em si não tem dono; os "donos" são os participantes.
DROP POLICY IF EXISTS "conv_insert" ON conversations;
CREATE POLICY "conv_insert" ON conversations
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- (Opcional) permitir UPDATE/DELETE apenas se o usuário for participante.
DROP POLICY IF EXISTS "conv_update_participant" ON conversations;
CREATE POLICY "conv_update_participant" ON conversations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "conv_delete_participant" ON conversations;
CREATE POLICY "conv_delete_participant" ON conversations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
    )
  );

-- CONVERSATION_PARTICIPANTS: permitir ler e inserir participantes da mesma conversa,
-- inclusive ao criar a segunda pessoa na conversa compartilhada.
DROP POLICY IF EXISTS "conv_parts_all" ON conversation_participants;

DROP POLICY IF EXISTS "conv_parts_select" ON conversation_participants;
CREATE POLICY "conv_parts_select" ON conversation_participants
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "conv_parts_insert" ON conversation_participants;
CREATE POLICY "conv_parts_insert" ON conversation_participants
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "conv_parts_update" ON conversation_participants;
CREATE POLICY "conv_parts_update" ON conversation_participants
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "conv_parts_delete" ON conversation_participants;
CREATE POLICY "conv_parts_delete" ON conversation_participants
  FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

-- MESSAGES: só pode ler e enviar se fizer parte da conversa.
DROP POLICY IF EXISTS "messages_select_participant" ON messages;
CREATE POLICY "messages_select_participant" ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "messages_insert_own" ON messages;
CREATE POLICY "messages_insert_own" ON messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1
      FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "messages_update_own" ON messages;
CREATE POLICY "messages_update_own" ON messages
  FOR UPDATE
  USING (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1
      FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1
      FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );