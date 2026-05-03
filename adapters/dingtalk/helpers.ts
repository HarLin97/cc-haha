export type DingTalkRobotMessage = {
  msgId?: string
  msgtype?: string
  conversationType?: string
  conversationId?: string
  conversationTitle?: string
  senderStaffId?: string
  senderId?: string
  senderNick?: string
  sessionWebhook?: string
  text?: { content?: string }
  markdown?: { text?: string; title?: string }
  content?: unknown
}

export function parseDingTalkPayload(raw: unknown): DingTalkRobotMessage | null {
  if (!raw) return null
  if (typeof raw === 'object') return raw as DingTalkRobotMessage
  if (typeof raw !== 'string') return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed as DingTalkRobotMessage : null
  } catch {
    return null
  }
}
export function isDingTalkDirectMessage(data: DingTalkRobotMessage): boolean {
  return data.conversationType === '1'
}

export function getDingTalkSenderId(data: DingTalkRobotMessage): string | null {
  const senderId = data.senderStaffId || data.senderId
  return senderId ? String(senderId) : null
}

export function getDingTalkChatId(data: DingTalkRobotMessage): string | null {
  const senderId = getDingTalkSenderId(data)
  if (isDingTalkDirectMessage(data)) {
    return senderId ? `dingtalk:dm:${senderId}` : null
  }
  return data.conversationId ? `dingtalk:group:${data.conversationId}` : null
}

export function extractDingTalkText(data: DingTalkRobotMessage): string {
  if (typeof data.text?.content === 'string') return data.text.content.trim()
  if (typeof data.markdown?.text === 'string') return data.markdown.text.trim()

  const content = resolveContentObject(data.content)
  if (typeof content?.text === 'string') return content.text.trim()
  if (Array.isArray(content?.richText)) {
    return content.richText
      .map((item: unknown) => {
        if (!item || typeof item !== 'object') return ''
        const text = (item as { text?: unknown }).text
        return typeof text === 'string' ? text : ''
      })
      .join('')
      .trim()
  }

  return ''
}

function resolveContentObject(raw: unknown): Record<string, any> | null {
  if (!raw) return null
  if (typeof raw === 'object') return raw as Record<string, any>
  if (typeof raw !== 'string') return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed as Record<string, any> : null
  } catch {
    return null
  }
}
