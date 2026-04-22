[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$folder = 'D:\javaApp\xiaojintong\参考文件'
$file = (Get-ChildItem -LiteralPath $folder -Filter *.xls | Select-Object -First 1).FullName
$excel = $null
$workbook = $null
try {
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $workbook = $excel.Workbooks.Open($file)
  foreach ($sheet in $workbook.Worksheets) {
    Write-Output ('### SHEET: ' + $sheet.Name)
    $range = $sheet.UsedRange
    $rows = $range.Rows.Count
    $cols = $range.Columns.Count
    for ($r = 1; $r -le $rows; $r++) {
      $vals = @()
      for ($c = 1; $c -le $cols; $c++) {
        $text = $range.Item($r, $c).Text
        if ($null -eq $text) { $text = '' }
        $vals += ($text -replace "`r|`n", ' ')
      }
      if ((($vals -join '')).Trim() -ne '') {
        Write-Output ($vals -join "`t")
      }
    }
  }
}
finally {
  if ($workbook) { $workbook.Close($false) }
  if ($excel) { $excel.Quit() }
}
