# PowerShell script til at teste beta ansøgninger
Write-Host "=== BETA TESTER ANSØGNINGER TEST ===" -ForegroundColor Green
Write-Host ""
Write-Host "Nu hvor alle database navne er konsistente, skulle beta tester ansøgningerne dukke op i admin panelet."
Write-Host ""
Write-Host "Ændringer foretaget:" -ForegroundColor Yellow
Write-Host "✓ Admin panel: Beta tester ansøgninger kan ses af staff + beta test admin roller"
Write-Host "✓ Database navne: Alle ændret fra 'divisionhjemmeside' til 'divisionwebsite'"
Write-Host "✓ Application types: Beta tester inkluderet i tilladte typer"
Write-Host "✓ Permissions: Beta tester adgang opdateret"
Write-Host ""
Write-Host "Test steps:" -ForegroundColor Cyan
Write-Host "1. Log ind i admin panelet med en staff eller beta admin bruger"
Write-Host "2. Vælg 'Betatester' fra dropdown menuen"
Write-Host "3. Beta tester ansøgningerne skulle nu være synlige"
Write-Host ""
Write-Host "Hvis der stadig ikke er nogen ansøgninger, så prøv at oprette en ny beta ansøgning."