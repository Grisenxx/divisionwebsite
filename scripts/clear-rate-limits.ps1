# PowerShell script to clear rate limits via API
# Alternative to the Node.js script when Node is not available

$baseUrl = "http://localhost:3000"  # Change this to your actual URL
$clearRateLimitsUrl = "$baseUrl/api/admin/clear-rate-limits"
$unblockIpUrl = "$baseUrl/api/admin/unblock-ip"

Write-Host "🧹 Clearing all rate limits and blocks via API..." -ForegroundColor Yellow

try {
    # Clear rate limits
    $rateLimitResponse = Invoke-RestMethod -Uri $clearRateLimitsUrl -Method POST -ContentType "application/json"
    Write-Host "✅ Rate limits cleared: $($rateLimitResponse.deletedSubmissions) records" -ForegroundColor Green
    
    Write-Host "✅ All rate limiting cleared successfully!" -ForegroundColor Green
    Write-Host "Users should now be able to submit applications." -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure the server is running and you have admin privileges." -ForegroundColor Yellow
}

Read-Host "Press Enter to exit"