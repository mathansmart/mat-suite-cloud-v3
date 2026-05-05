Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Detect directory: Use script location as fallback, but look for server.js
strPath = fso.GetParentFolderName(WScript.ScriptFullName)
If Not fso.FileExists(strPath & "\server.js") Then
    ' If we are in Startup folder, this won't work. 
    ' The ENABLE_AUTO_START.bat should have hardcoded the path or we need a way to find it.
End If

WshShell.CurrentDirectory = strPath

' Log startup attempt
On Error Resume Next
Set objFile = fso.OpenTextFile(strPath & "\startup_log.txt", 8, True)
If Err.Number = 0 Then
    objFile.WriteLine "------------------------------------"
    objFile.WriteLine "Background Startup Attempted: " & Now
    objFile.WriteLine "Directory: " & strPath
    objFile.Close
End If
On Error GoTo 0

' Run the server silently (0 = hide window)
WshShell.Run "cmd /c node server.js >> startup_log.txt 2>&1", 0, False
