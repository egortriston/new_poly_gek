param([string]$Php, [string]$Worker, [string]$Job)
$ErrorActionPreference = 'Stop'
if ($Job -notmatch '^[a-f0-9]{32}$') { throw 'Invalid job' }
Start-Process -FilePath $Php -ArgumentList @(('"' + $Worker + '"'), $Job) -WindowStyle Hidden -PassThru | Select-Object -ExpandProperty Id
