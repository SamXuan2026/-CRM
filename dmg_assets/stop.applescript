set projectRoot to "/Users/samxuan/sam/code/crm_system"
set launcherPath to quoted form of (projectRoot & "/stop.sh")
set shellCommand to "cd " & quoted form of projectRoot & " ; " & launcherPath

try
	do shell script shellCommand
	display dialog "CRM 停止命令已执行。" buttons {"好"} default button "好" with icon note
on error errMsg
	set errorMessage to "停止失败:" & return & errMsg
	display dialog errorMessage buttons {"好"} default button "好" with icon stop
end try
