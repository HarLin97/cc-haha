import { describe, expect, it } from 'bun:test'
import { translateCliMessage } from '../ws/handler.js'

describe('WebSocket memory events', () => {
  it('forwards CLI memory_saved system messages to the desktop client', () => {
    const messages = translateCliMessage(
      {
        type: 'system',
        subtype: 'memory_saved',
        writtenPaths: [
          '/Users/test/.claude/projects/example/memory/preferences.md',
          '/Users/test/.claude/projects/example/memory/team/MEMORY.md',
        ],
        teamCount: 1,
        verb: 'Saved',
      },
      'session-1',
    )

    expect(messages).toEqual([
      {
        type: 'system_notification',
        subtype: 'memory_saved',
        message: undefined,
        data: {
          writtenPaths: [
            '/Users/test/.claude/projects/example/memory/preferences.md',
            '/Users/test/.claude/projects/example/memory/team/MEMORY.md',
          ],
          teamCount: 1,
          verb: 'Saved',
        },
      },
    ])
  })
})
