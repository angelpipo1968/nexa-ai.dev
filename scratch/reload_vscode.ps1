$wshell = New-Object -ComObject WScript.Shell;
$process = Get-Process Code | Where-Object {$_.MainWindowTitle -ne ""} | Select-Object -First 1;
if ($process) {
    Write-Host "Activating VS Code (ID: $($process.Id), Title: $($process.MainWindowTitle))";
    $wshell.AppActivate($process.Id);
    Start-Sleep -Seconds 1;
    # Send Ctrl+Shift+P
    $wshell.SendKeys("^+p");
    Start-Sleep -Milliseconds 800;
    # Type Reload Window
    $wshell.SendKeys("Developer: Reload Window");
    Start-Sleep -Milliseconds 800;
    $wshell.SendKeys("{ENTER}");
    Write-Host "Reload command sent.";
} else {
    Write-Host "No VS Code window found.";
}
