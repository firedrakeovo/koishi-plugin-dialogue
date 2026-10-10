import { Argv, Context, escapeRegExp } from 'koishi'
import { Dialogue } from '.'

/**
 * 匹配「问 xxx 答 xxx」教学格式。
 *
 * - 问 你好 答 你好呀
 * - 正则问 ^(.+)吗 答 $1
 * - 模糊问 晚安 答 不准睡
 *
 * 刻意使用 `\s+` 强制分隔，避免「问个问题答一下」这类自然句误触发。
 */
const ASK_RE = /^(?:(正则|模糊))?\s*问\s+([\s\S]+?)\s+答\s+([\s\S]+?)\s*$/

export default function apply(ctx: Context) {
  ctx.on('dialogue/usage', (output) => {
    output.add(`问答式教学（问/答两侧须用空格分隔）：
　问 问题 答 回答
　正则问 问题 答 回答
　模糊问 问题 答 回答`, 950)
  })

  ctx.before('parse', (content, session: Dialogue.Session) => {
    if (session.quote) return
    const match = ASK_RE.exec(content)
    if (!match) return

    const [, flag, question, answer] = match
    const q = question.trim()
    const a = answer.trim()
    if (!q || !a) return

    // 构造与 `wd 问题 回答` 等价的 teach argv，
    // 后续权限、assets 图片、去重、提示等全部复用原有逻辑。
    const options: Dialogue.Options = {}
    const args = [q, a]

    if (flag === '正则') {
      options.regexp = true
    } else if (flag === '模糊') {
      // dialogue 没有真正的「包含」模式；正则 exec 本身就是子串语义，
      // 把问句转义后即近似「模糊/包含」匹配。
      options.regexp = true
      args[0] = escapeRegExp(q)
    }

    return { name: 'teach', args, options, source: content } as unknown as Argv
  })
}
