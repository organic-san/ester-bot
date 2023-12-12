$scriptblock = {
    node datainit
}

$elapsedTime = Measure-Command $scriptblock
Write-Host "Total time taken: $($elapsedTime.TotalSeconds) seconds"
