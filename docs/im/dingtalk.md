# 钉钉接入

钉钉接入走 DingTalk Stream，不需要公网回调地址。桌面端设置页支持扫码创建并授权机器人，授权成功后会把 `clientId / clientSecret` 写入 `~/.claude/adapters.json`。

## 配置方式

打开 Desktop Webapp 的 `Settings -> IM 接入 -> 钉钉`。

推荐方式：

1. 点击“扫码绑定”
2. 使用钉钉手机 App 扫码
3. 在钉钉里确认创建机器人
4. 等待桌面端显示已绑定

如果扫码不可用，也可以手动填写：

- `Client ID`
- `Client Secret`
- 可选 `Stream Endpoint`
- 可选 `Allowed Users`

## 配对用户

钉钉机器人绑定完成后，还需要让具体用户通过 IM 配对码授权：

1. 在 `配对管理` 里生成配对码
2. 在钉钉私聊里把配对码发给机器人
3. 显示配对成功后即可开始聊天

配对用户会出现在“已配对用户”列表里，可以随时解绑。解绑后该用户需要重新发送新的配对码才能使用。

## 运行 adapter

桌面端发布版会通过 sidecar 自动启动。开发时可以手动运行：

```bash
cd adapters
bun install
bun run dingtalk
```

## 当前行为

- 只处理钉钉单聊消息
- 使用 `sessionWebhook` 回复文本 / Markdown
- 支持 `/new`、`/projects`、`/status`、`/clear`、`/stop`、`/help`
- 权限确认通过 `/allow <requestId>` 和 `/deny <requestId>` 回复
- 群聊、媒体附件、AI Card 流式卡片后续再扩展
