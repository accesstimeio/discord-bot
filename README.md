# discord-bot

This is an open-source Discord bot that integrates with [AccessTime](https://accesstime.io) to manage roles based on on-chain subscription data. Server admins can verify project ownership, assign roles, and users can link wallets to gain access.

## 🌐 Features

### Admin Commands

- `/setup` — Connect your AccessTime project (projectId, chainId, role) and get a unique nonce.
- `/verify` — Sign a message and verify ownership using the contract's on-chain owner.
- `/sync` — Trigger a manual sync of subscriber roles (auto-runs every 5 minutes).
- `/info` — View current bot setup status and synced user stats.

### User Commands

- `/linkwallet` — Get a message to sign with your wallet.
- `/completelinkwallet` — Submit your signed message and wallet address.
- `/unlinkwallet` — Remove your wallet link and access role.

## ⚙️ Tech Stack

- [discord.js](https://discord.js.org/)
- [AccessTime SDK](https://github.com/accesstimeio/accesstime-sdk)
- [NestJS](https://nestjs.com)
- [drizzle](https://orm.drizzle.team)

## 🛠️ Contributing

PRs welcome! Feel free to fork, customize, or submit issues.

## 📄 License

MIT
