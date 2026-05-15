import { describe, expect, test } from 'bun:test'
import { switchSession } from '../../bootstrap/state.js'
import type { SessionId } from '../../types/ids.js'
import type { LocalJSXCommandContext } from '../../types/command.js'
import { createCommandInputMessage } from '../../utils/messages.js'
import { call } from './goal.js'

async function runGoal(args: string, context: Partial<LocalJSXCommandContext> = {}) {
  const calls: Array<{
    result?: string
    options?: {
      display?: string
      shouldQuery?: boolean
      metaMessages?: string[]
    }
  }> = []

  await call(
    (result, options) => {
      calls.push({ result, options })
    },
    {
      messages: [],
      ...context,
    } as LocalJSXCommandContext,
    args,
  )

  expect(calls).toHaveLength(1)
  return calls[0]!
}

describe('/goal command', () => {
  test('creates a goal and manages every subcommand in one CLI session', async () => {
    switchSession(`goal-command-${crypto.randomUUID()}` as SessionId)

    const created = await runGoal('--tokens 2k ship the smoke test')
    expect(created.result).toContain('Goal created.')
    expect(created.result).toContain('Goal: active')
    expect(created.result).toContain('Objective: ship the smoke test')
    expect(created.result).toContain('Budget: 0 / 2,000 tokens')
    expect(created.options).toMatchObject({
      display: 'system',
      shouldQuery: true,
    })
    expect(created.options?.metaMessages?.[0]).toContain(
      '<objective>ship the smoke test</objective>',
    )

    const status = await runGoal('status')
    expect(status.result).toContain('Goal: active')
    expect(status.result).toContain('Objective: ship the smoke test')
    expect(status.options).toMatchObject({
      display: 'system',
    })

    const replaced = await runGoal('ship the replacement target')
    expect(replaced.result).toContain('Goal replaced.')
    expect(replaced.result).toContain('Objective: ship the replacement target')
    expect(replaced.result).toContain('Budget: 0 / unlimited tokens')
    expect(replaced.options).toMatchObject({
      display: 'system',
      shouldQuery: true,
    })
    expect(replaced.options?.metaMessages?.[0]).toContain(
      '<objective>ship the replacement target</objective>',
    )

    const paused = await runGoal('pause')
    expect(paused.result).toContain('Goal: paused')
    expect(paused.options).toMatchObject({
      display: 'system',
    })

    const resumed = await runGoal('resume')
    expect(resumed.result).toContain('Goal: active')
    expect(resumed.options).toMatchObject({
      display: 'system',
      shouldQuery: true,
    })
    expect(resumed.options?.metaMessages?.[0]).toContain(
      '<objective>ship the replacement target</objective>',
    )

    const completed = await runGoal('complete')
    expect(completed.result).toBe('Goal marked complete.')
    expect(completed.options).toMatchObject({
      display: 'system',
    })

    const cleared = await runGoal('clear')
    expect(cleared.result).toBe('Goal cleared.')
    expect(cleared.options).toMatchObject({
      display: 'system',
    })

    const empty = await runGoal('')
    expect(empty.result).toBe('No active goal.')
    expect(empty.options).toMatchObject({
      display: 'system',
    })
  })

  test('reports usage errors without querying the model', async () => {
    switchSession(`goal-command-${crypto.randomUUID()}` as SessionId)

    const result = await runGoal('--tokens 2k')

    expect(result.result).toBe('Usage: /goal [--tokens <budget>] <objective>')
    expect(result.options).toMatchObject({
      display: 'system',
    })
    expect(result.options?.shouldQuery).toBeUndefined()
  })

  test('hydrates completed goal state from persisted slash command history', async () => {
    switchSession(`goal-command-${crypto.randomUUID()}` as SessionId)

    const result = await runGoal('status', {
      messages: [
        createCommandInputMessage([
          '<command-name>/goal</command-name>',
          '<command-args>ship persisted goal</command-args>',
        ].join('\n')),
        createCommandInputMessage([
          '<local-command-stdout>',
          'Goal created.',
          'Goal: active',
          'Objective: ship persisted goal',
          'Budget: 42 / 2,000 tokens',
          'Elapsed: 1m',
          'Continuations: 3',
          '</local-command-stdout>',
        ].join('\n')),
        createCommandInputMessage([
          '<local-command-stdout>',
          'Goal: complete',
          'Objective: ship persisted goal',
          'Budget: 1,234 / 2,000 tokens',
          'Elapsed: 23m',
          'Continuations: 2',
          '</local-command-stdout>',
        ].join('\n')),
        createCommandInputMessage([
          '<command-name>/goal</command-name>',
          '<command-args>status</command-args>',
        ].join('\n')),
        createCommandInputMessage('<local-command-stdout>No active goal.</local-command-stdout>'),
      ],
    })

    expect(result.result).toContain('Goal: complete')
    expect(result.result).toContain('Objective: ship persisted goal')
    expect(result.result).toContain('Budget: 1,234 / 2,000 tokens')
    expect(result.result).toContain('Continuations: 2')
  })
})
