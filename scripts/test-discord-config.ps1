# Test Discord Configuration Script

Write-Host "Tjekker Discord konfiguration..." -ForegroundColor Cyan

# Tjek om .env.local eksisterer
if (Test-Path ".env.local") {
    Write-Host "OK: .env.local fundet" -ForegroundColor Green
    
    $content = Get-Content ".env.local"
    $hasBot = $content | Select-String "DISCORD_BOT_TOKEN=(?!your_)"
    $hasGuild = $content | Select-String "DISCORD_GUILD_ID=(?!your_)"
    $hasCategory = $content | Select-String "DISCORD_WLMODTAGER_CATEGORY_ID=(?!your_)"
    
    if ($hasBot) {
        Write-Host "OK: DISCORD_BOT_TOKEN er sat" -ForegroundColor Green
    } else {
        Write-Host "FEJL: DISCORD_BOT_TOKEN mangler" -ForegroundColor Red
    }
    
    if ($hasGuild) {
        Write-Host "OK: DISCORD_GUILD_ID er sat" -ForegroundColor Green  
    } else {
        Write-Host "FEJL: DISCORD_GUILD_ID mangler" -ForegroundColor Red
    }
    
    if ($hasCategory) {
        Write-Host "OK: DISCORD_WLMODTAGER_CATEGORY_ID er sat" -ForegroundColor Green
    } else {
        Write-Host "FEJL: DISCORD_WLMODTAGER_CATEGORY_ID mangler" -ForegroundColor Red
    }
    
} else {
    Write-Host "FEJL: .env.local ikke fundet!" -ForegroundColor Red
}

Write-Host ""
Write-Host "For at fikse whitelist modtager problemet:"
Write-Host "1. Saet DISCORD_BOT_TOKEN i .env.local"
Write-Host "2. Saet DISCORD_GUILD_ID i .env.local"  
Write-Host "3. Saet kategori og rolle IDs"