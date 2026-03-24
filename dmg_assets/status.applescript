set projectRoot to "/Users/samxuan/sam/code/crm_system"
set launcherPath to quoted form of (projectRoot & "/status.sh")
set shellCommand to "cd " & quoted form of projectRoot & " ; " & launcherPath

try
	set statusText to do shell script shellCommand
	display dialog statusText buttons {"好"} default button "好" with icon note
on error errMsg
	set errorMessage to "状态检查失败:" & return & errMsg
	display dialog errorMessage buttons {"好"} default button "好" with icon stop
end try
