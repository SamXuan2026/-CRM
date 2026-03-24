set projectRoot to "/Users/samxuan/sam/code/crm_system"
set launcherPath to quoted form of (projectRoot & "/start.sh")
set shellCommand to "cd " & quoted form of projectRoot & " ; " & launcherPath
set successMessage to "CRM 启动命令已执行。"
set successMessage to successMessage & return & return
set successMessage to successMessage & "前端: http://172.16.1.32:3000" & return
set successMessage to successMessage & "后端: http://172.16.1.32:5006"

try
	do shell script shellCommand
	display dialog successMessage buttons {"好"} default button "好" with icon note
on error errMsg
	set errorMessage to "启动失败:" & return & errMsg
	display dialog errorMessage buttons {"好"} default button "好" with icon stop
end try
