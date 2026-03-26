set projectRoot to "/Users/samxuan/sam/code/crm_system"
set launcherPath to quoted form of (projectRoot & "/stop.sh")
set statusPath to quoted form of (projectRoot & "/status.sh")
set shellCommand to "cd " & quoted form of projectRoot & " ; " & launcherPath & " ; " & statusPath

try
	set stopText to do shell script shellCommand
	set successMessage to "CRM 已停止。" & return & return & stopText
	display dialog successMessage buttons {"好"} default button "好" with icon note
on error errMsg
	set errorMessage to "停止失败:" & return & errMsg
	display dialog errorMessage buttons {"好"} default button "好" with icon stop
end try
