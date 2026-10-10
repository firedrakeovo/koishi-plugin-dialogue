import { Context } from 'koishi'
import { Dialogue } from '.'

/**
 * 「删除问答 问题」：按问题删除问答（等价于删除 `wd问题` 能搜到的全部结果）。
 *
 * - 默认与搜索同口径：完全匹配该问题（含正则问答对该问题的匹配）
 * - `-x` 时把参数当作正则表达式匹配问题，便于批量删除
 */
export default function apply(ctx: Context, config: Dialogue.Config) {
  ctx.command('删除问答 <question:text>', {
    authority: config.authority.admin,
    checkUnknown: true,
  })
    .option('regexp', '-x', { authority: config.authority.regExp })
    .action(async ({ session: _session, options }, question) => {
      const session = _session as unknown as Dialogue.Session
      const { original, parsed } = ctx.root.dialogue.stripQuestion(question)
      const dialogues = await ctx.root.dialogue.get({ question: parsed, original, regexp: options.regexp })
      if (!dialogues.length) {
        return options.regexp
          ? session.text('.empty-regexp', [parsed || question])
          : session.text('.empty', [parsed || question])
      }

      const targets = dialogues.filter(dialogue => !session.app.bail('dialogue/permit', session, dialogue))
      const forbidden = dialogues.filter(dialogue => !targets.includes(dialogue))
      const output: string[] = []

      if (targets.length) {
        // remove() 需要 dialogueMap 来记录可回退的历史版本（wd -V 可撤销）
        session.argv.options.dialogueMap = Object.fromEntries(targets.map(d => [d.id, { ...d }]))
        const ids = await ctx.root.dialogue.remove(targets, session)
        await session.app.serial('dialogue/after-modify', session)
        output.push(session.text('.success', [ids.join(', '), targets.map(d => d.original).join('、')]))
      }
      if (forbidden.length) {
        output.push(session.text('.forbidden', [forbidden.map(d => d.id).join(', ')]))
      }
      return output.join('\n')
    })
}
