const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');

// Compile the Windows bridge once, then answer requests over a pipe.
const SCRIPT = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public class Foreground {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint id);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder text, int count);
}
'@
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
while ($null -ne [Console]::ReadLine()) {
  try {
    $handle = [Foreground]::GetForegroundWindow()
    [uint32]$foregroundId = 0
    [void][Foreground]::GetWindowThreadProcessId($handle, [ref]$foregroundId)
    $caption = New-Object System.Text.StringBuilder 4096
    [void][Foreground]::GetWindowText($handle, $caption, 4096)
    $process = Get-Process -Id $foregroundId -ErrorAction Stop
    $address = $null
    if ($process.ProcessName -in @('chrome','msedge','brave','firefox','opera','vivaldi','arc')) {
      try {
        $root = [System.Windows.Automation.AutomationElement]::FromHandle($handle)
        $condition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Edit)
        $edits = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condition)
        foreach ($edit in $edits) {
          $id = $edit.Current.AutomationId
          $name = $edit.Current.Name
          if ($id -in @('urlbar-input','addressEditBox','Omnibox') -or $name -match '^(Address and search bar|Search or enter address|Address bar|Search with Google or enter address)$') {
            $pattern = $edit.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
            $address = $pattern.Current.Value
            break
          }
        }
      } catch {}
    }
    [Console]::WriteLine((@{appName=$process.ProcessName;processId=$foregroundId;windowTitle=$caption.ToString();address=$address} | ConvertTo-Json -Compress))
  } catch { [Console]::WriteLine('null') }
}
`;

class ForegroundReader {
  constructor() { this.child = null; this.pending = null; }
  read() {
    if (process.platform !== 'win32' || this.pending) return Promise.resolve(null);
    return new Promise(resolve => {
      const timer = setTimeout(() => { this.stop(); }, 8000);
      this.pending = value => { clearTimeout(timer); this.pending = null; resolve(value); };
      if (!this.child) {
        const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', SCRIPT], { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
        this.child = child;
        createInterface({ input: child.stdout }).on('line', line => {
          try { this.pending?.(JSON.parse(line)); } catch { this.pending?.(null); }
        });
        child.on('error', () => this.stop());
        child.on('exit', () => { if (this.child === child) this.stop(); });
        child.stdin.on('error', () => this.stop());
      }
      this.child.stdin.write('sample\n');
    });
  }
  stop() {
    const child = this.child;
    this.child = null;
    this.pending?.(null);
    child?.kill();
  }
}
module.exports = { ForegroundReader };
