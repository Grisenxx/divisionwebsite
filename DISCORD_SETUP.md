# Discord Setup Guide

## Problem
Når du godkender whitelist modtager ansøgninger sker følgende:
1. Status skifter til "godkendt" 
2. Efter refresh er status tilbage til "afventende"
3. Ingen Discord kanaler bliver oprettet
4. Ingen beskeder sendes

## Løsning

### 1. Discord Bot Token
Gå til https://discord.com/developers/applications
1. Opret en ny bot eller brug eksisterende
2. Kopiér bot token
3. Sæt i .env.local: `DISCORD_BOT_TOKEN=din_bot_token_her`

### 2. Guild ID (Server ID)
1. Højreklik på din Discord server
2. Kopiér server ID (skal have Developer Mode aktiveret)
3. Sæt i .env.local: `DISCORD_GUILD_ID=din_server_id_her`

### 3. Kategori IDs
1. Højreklik på kategorier hvor kanaler skal oprettes
2. Kopiér ID for hver kategori
3. Opdater i .env.local:
```
DISCORD_WLMODTAGER_CATEGORY_ID=kategori_id_her
DISCORD_STAFF_CATEGORY_ID=kategori_id_her
```

### 4. Rolle IDs
1. Højreklik på roller der skal tagges
2. Kopiér rolle ID
3. Opdater i .env.local:
```
DISCORD_WLMODTAGER_RESPONSIBLE_ROLE_ID=rolle_id_her
```

### 5. Bot Permissions
Botten skal have følgende tilladelser:
- Manage Channels
- Send Messages  
- Manage Roles (hvis rolle tildeling bruges)
- Read Message History

## Test
Efter opsætning kør: `.\scripts\test-discord-config.ps1`