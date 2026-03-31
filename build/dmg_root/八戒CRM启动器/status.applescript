set projectRoot to "/Users/samxuan/sam/code/crm_system"
set launcherPath to quoted form of (projectRoot & "/status.sh")
set shellCommand to "cd " & quoted form of projectRoot & " ; " & launcherPath

try
	set statusText to do shell script shellCommand
	set statusMessage to statusText & return & return & "前端: http://172.16.1.32:3000" & return & "后端: http://172.16.1.32:5006" & return & "日志: " & projectRoot & "/logs"
	display dialog statusMessage buttons {"好"} default button "好" with icon note
on error errMsg
	set errorMessage to "状态检查结果:" & return & errMsg & return & return & "前端: http://172.16.1.32:3000" & return & "后端: http://172.16.1.32:5006" & return & "日志: " & projectRoot & "/logs"
	display dialog errorMessage buttons {"好"} default button "好" with icon stop
end try
