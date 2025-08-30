$body = '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}'
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:8787/mcp/tools" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 5
    Write-Host "Response:" $response.Content
} catch {
    Write-Host "Error:" $_.Exception.Message
}
