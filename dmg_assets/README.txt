八戒CRM 启动器

双击以下文件即可:

1. 启动CRM.command
   启动前端和后端服务

2. 停止CRM.command
   停止前端和后端服务

3. 查看CRM状态.command
   查看当前运行状态

访问地址:
- 前端: http://172.16.1.32:3000
- 后端: http://172.16.1.32:5006

说明:
- 这些启动器默认控制当前机器上的 CRM 项目目录
- 前后端地址和端口由项目根目录 `.env` 中的 `CRM_PUBLIC_HOST`、`CRM_BACKEND_PORT`、`CRM_FRONTEND_PORT` 控制
- 日志文件位于项目根目录 `logs/`
- 启动后会自动做健康检查，不再只判断进程是否存在
- 如果启动失败，窗口里会直接提示查看 backend.log 和 frontend.log
