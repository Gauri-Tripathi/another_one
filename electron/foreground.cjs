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
    $observedTick = [System.Diagnostics.Stopwatch]::GetTimestamp() * 1000.0 / [System.Diagnostics.Stopwatch]::Frequency
    $observedAt = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    [uint32]$foregroundId = 0
    [void][Foreground]::GetWindowThreadProcessId($handle, [ref]$foregroundId)
    $caption = New-Object System.Text.StringBuilder 4096
    [void][Foreground]::GetWindowText($handle, $caption, 4096)
    $process = Get-Process -Id $foregroundId -ErrorAction Stop
    $executablePath = $null
    try { $executablePath = $process.MainModule.FileName } catch {}
    $address = $null
    if (__INCLUDE_ADDRESS__ -and $process.ProcessName -in @('chrome','msedge','brave','firefox','opera','vivaldi','arc')) {
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
    $afterHandle = [Foreground]::GetForegroundWindow()
    $afterCaption = New-Object System.Text.StringBuilder 4096
    [void][Foreground]::GetWindowText($afterHandle, $afterCaption, 4096)
    if ($handle -ne $afterHandle -or $caption.ToString() -ne $afterCaption.ToString()) {
      [Console]::WriteLine('{"unstable":true}')
    } else {
      [Console]::WriteLine((@{appName=$process.ProcessName;windowId=$handle.ToInt64().ToString();processId=$foregroundId;windowTitle=$caption.ToString();address=$address;executablePath=$executablePath;observedTick=$observedTick;observedAt=$observedAt} | ConvertTo-Json -Compress))
    }
  } catch { [Console]::WriteLine('null') }
}
`;

class ForegroundReader {
  constructor({includeAddress=true}={}) {
    if(process.platform==='darwin') {
      const {MacForegroundReader,helperPath}=require('./mac-reader.cjs');
      const {app}=require('electron');
      return new MacForegroundReader({includeAddress,binary:helperPath({isPackaged:app?.isPackaged,resourcesPath:process.resourcesPath})});
    }
    this.child = null; this.pending = null; this.includeAddress=includeAddress;
  }
  read() {
    if (process.platform !== 'win32' || this.pending) return Promise.resolve(null);
    return new Promise(resolve => {
      const timer = setTimeout(() => { this.stop(); }, 8000);
      this.pending = value => { clearTimeout(timer); this.pending = null; resolve(value); };
      if (!this.child) {
        const script=SCRIPT.replace('__INCLUDE_ADDRESS__',this.includeAddress?'$true':'$false');
        const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
        this.child = child;
        createInterface({ input: child.stdout }).on('line', line => {
          if (this.child !== child) return;
          try { this.pending?.(JSON.parse(line)); } catch { this.pending?.(null); }
        });
        child.on('error', () => { if (this.child === child) this.stop(); });
        child.on('exit', () => { if (this.child === child) this.stop(); });
        child.stdin.on('error', () => { if (this.child === child) this.stop(); });
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
