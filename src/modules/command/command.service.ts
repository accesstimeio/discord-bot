import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";

import * as schema from "src/db/schema";
import { servers } from "src/db/schema";

import { DiscordService } from "../discord/discord.service";
import { AccessTimeService } from "../accesstime/accesstime.service";
import { WalletService } from "../wallet/wallet.service";
import { ServerService } from "../server/server.service";

@Injectable()
export class CommandService implements OnModuleInit {
    private readonly logger = new Logger(CommandService.name);

    constructor(
        @Inject("DB_PROD") private database: NodePgDatabase<typeof schema>,
        private readonly discordService: DiscordService,
        private readonly accessTimeService: AccessTimeService,
        private readonly walletService: WalletService,
        private readonly serverService: ServerService
    ) {}

    async onModuleInit() {
        await this.discordService.registerCommands([
            this.setup(),
            this.verify(),
            this.linkWallet(),
            this.completeLinkWallet(),
            this.unlinkWallet(),
            this.sync(),
            this.info()
        ]);
    }

    setup = () => ({
        data: new SlashCommandBuilder()
            .setName("setup")
            .setDescription("Set up the AccessTime bot for your server")
            .addStringOption((option) =>
                option
                    .setName("project_id")
                    .setDescription("Your AccessTime Project ID")
                    .setRequired(true)
            )
            .addRoleOption((option) =>
                option
                    .setName("role")
                    .setDescription("The role to assign to subscribers")
                    .setRequired(true)
            )
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        execute: async (interaction: ChatInputCommandInteraction) => {
            await interaction.deferReply({ ephemeral: true });

            try {
                const projectId = interaction.options.getString("project_id");
                const role = interaction.options.getRole("role");

                if (!projectId || !role) {
                    return interaction.editReply("Project ID and role are required.");
                }
                // Save server configuration
                await this.database
                    .insert(servers)
                    .values({
                        discordServerId: interaction.guildId,
                        accessTimeProjectId: projectId,
                        subscriberRoleId: role.id,
                        isVerified: false
                    })
                    .onConflictDoUpdate({
                        target: [servers.discordServerId],
                        set: {
                            accessTimeProjectId: projectId,
                            subscriberRoleId: role.id,
                            updatedAt: new Date()
                        }
                    });

                await interaction.editReply(
                    `Bot configured successfully! Use \`/verify\` to verify ownership of your AccessTime project.`
                );
            } catch (error) {
                this.logger.error("Error in setup command:", error);
                await interaction.editReply("Failed to set up the bot. Please try again.");
            }
        }
    });

    verify = () => ({
        data: new SlashCommandBuilder()
            .setName("verify")
            .setDescription("Verify ownership of your AccessTime project")
            .addStringOption((option) =>
                option
                    .setName("signature")
                    .setDescription("The verification signature from AccessTime")
                    .setRequired(true)
            )
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        execute: async (interaction: ChatInputCommandInteraction) => {
            await interaction.deferReply({ ephemeral: true });

            try {
                const signature = interaction.options.getString("signature");

                if (!signature) {
                    return interaction.editReply("Signature is required.");
                }

                // Get server configuration
                const serverData = await this.database.query.servers.findFirst({
                    where: eq(servers.discordServerId, interaction.guildId)
                });

                if (!serverData || !serverData.accessTimeProjectId) {
                    return interaction.editReply("Server not configured. Use `/setup` first.");
                }

                // Verify ownership
                const isVerified = await this.accessTimeService.verifyProjectOwnership(
                    serverData.accessTimeProjectId,
                    signature
                );

                if (!isVerified) {
                    return interaction.editReply(
                        "Verification failed. Please check your signature and try again."
                    );
                }

                // Update server verification status
                await this.database
                    .update(servers)
                    .set({
                        isVerified: true,
                        verificationSignature: signature,
                        updatedAt: new Date()
                    })
                    .where(eq(servers.id, serverData.id));

                await interaction.editReply(
                    "Verification successful! The bot will now sync subscriber roles automatically."
                );

                // Trigger initial sync
                await this.serverService.manualSync(interaction.guildId);
            } catch (error) {
                this.logger.error("Error in verify command:", error);
                await interaction.editReply("Verification failed. Please try again.");
            }
        }
    });

    linkWallet = () => ({
        data: new SlashCommandBuilder()
            .setName("linkwallet")
            .setDescription("Link your wallet to receive subscriber roles")
            .addStringOption((option) =>
                option
                    .setName("wallet")
                    .setDescription("Your Ethereum wallet address")
                    .setRequired(true)
            ),
        execute: async (interaction: ChatInputCommandInteraction) => {
            await interaction.deferReply({ ephemeral: true });

            try {
                const walletAddress = interaction.options.getString("wallet");

                if (!walletAddress) {
                    return interaction.editReply("Wallet address is required.");
                }

                // Validate Ethereum address format
                if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
                    return interaction.editReply("Invalid Ethereum wallet address format.");
                }

                // Generate message to sign
                const messageToSign = await this.walletService.initiateWalletLinking(
                    interaction.guildId,
                    interaction.user.id,
                    walletAddress
                );

                await interaction.editReply({
                    content: `Please sign this message with your wallet to complete the verification:\n\`\`\`\n${messageToSign}\n\`\`\`\nAfter signing, use \`/completelinkwallet\` with your signature.`
                });
            } catch (error) {
                this.logger.error("Error in linkwallet command:", error);
                await interaction.editReply("Failed to initiate wallet linking. Please try again.");
            }
        }
    });

    completeLinkWallet = () => ({
        data: new SlashCommandBuilder()
            .setName("completelinkwallet")
            .setDescription("Complete wallet linking with your signature")
            .addStringOption((option) =>
                option
                    .setName("signature")
                    .setDescription("The signature from your wallet")
                    .setRequired(true)
            )
            .addStringOption((option) =>
                option
                    .setName("wallet")
                    .setDescription("Your Ethereum wallet address")
                    .setRequired(true)
            ),
        execute: async (interaction: ChatInputCommandInteraction) => {
            await interaction.deferReply({ ephemeral: true });

            try {
                const signature = interaction.options.getString("signature");
                const walletAddress = interaction.options.getString("wallet");

                if (!signature || !walletAddress) {
                    return interaction.editReply("Signature and wallet address are required.");
                }

                // Complete wallet linking
                const success = await this.walletService.completeWalletLinking(
                    interaction.guildId,
                    interaction.user.id,
                    walletAddress,
                    signature
                );

                if (!success) {
                    return interaction.editReply("Wallet verification failed. Please try again.");
                }

                await interaction.editReply(
                    "Wallet linked successfully! Your roles will be updated during the next sync."
                );

                // Trigger sync for this server
                try {
                    await this.serverService.manualSync(interaction.guildId);
                } catch (error) {
                    this.logger.warn(`Failed to sync after wallet linking: ${error.message}`);
                }
            } catch (error) {
                this.logger.error("Error in completelinkwallet command:", error);
                await interaction.editReply("Failed to complete wallet linking. Please try again.");
            }
        }
    });

    unlinkWallet = () => ({
        data: new SlashCommandBuilder()
            .setName("unlinkwallet")
            .setDescription("Unlink your wallet from your Discord account"),
        execute: async (interaction: ChatInputCommandInteraction) => {
            await interaction.deferReply({ ephemeral: true });

            try {
                // Unlink wallet
                const success = await this.walletService.unlinkWallet(
                    interaction.guildId,
                    interaction.user.id
                );

                if (!success) {
                    return interaction.editReply("No linked wallet found.");
                }

                await interaction.editReply(
                    "Wallet unlinked successfully. Your subscriber roles will be removed during the next sync."
                );

                // Trigger sync for this server
                try {
                    await this.serverService.manualSync(interaction.guildId);
                } catch (error) {
                    this.logger.warn(`Failed to sync after wallet unlinking: ${error.message}`);
                }
            } catch (error) {
                this.logger.error("Error in unlinkwallet command:", error);
                await interaction.editReply("Failed to unlink wallet. Please try again.");
            }
        }
    });

    sync = () => ({
        data: new SlashCommandBuilder()
            .setName("sync")
            .setDescription("Manually sync subscriber roles")
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        execute: async (interaction: ChatInputCommandInteraction) => {
            await interaction.deferReply({ ephemeral: true });

            try {
                // Check if server is configured
                const serverData = await this.database.query.servers.findFirst({
                    where: eq(servers.discordServerId, interaction.guildId)
                });

                if (!serverData || !serverData.isVerified) {
                    return interaction.editReply(
                        "Server not configured or not verified. Use `/setup` and `/verify` first."
                    );
                }

                await interaction.editReply("Syncing subscriber roles...");

                // Trigger sync
                const result = await this.serverService.manualSync(interaction.guildId);

                await interaction.editReply(
                    `Sync complete! Added ${result.added} roles, removed ${result.removed} roles.`
                );
            } catch (error) {
                this.logger.error("Error in sync command:", error);
                await interaction.editReply("Failed to sync subscriber roles. Please try again.");
            }
        }
    });

    info = () => ({
        data: new SlashCommandBuilder()
            .setName("info")
            .setDescription("Display bot configuration and status"),
        execute: async (interaction: ChatInputCommandInteraction) => {
            await interaction.deferReply({ ephemeral: true });

            try {
                // Get server configuration
                const serverData = await this.database.query.servers.findFirst({
                    where: eq(servers.discordServerId, interaction.guildId)
                });

                if (!serverData) {
                    return interaction.editReply("Server not configured. Use `/setup` first.");
                }

                // Get role info
                let roleInfo = "Not configured";
                if (serverData.subscriberRoleId) {
                    const role = await interaction.guild.roles.fetch(serverData.subscriberRoleId);
                    roleInfo = role ? `@${role.name}` : "Role not found";
                }

                // Get user wallet info
                const userWallet = await this.walletService.getWalletByDiscordId(
                    interaction.guildId,
                    interaction.user.id
                );
                const walletInfo = userWallet
                    ? `${userWallet.slice(0, 6)}...${userWallet.slice(-4)}`
                    : "No wallet linked";

                const infoEmbed = {
                    title: "AccessTime Bot Status",
                    fields: [
                        {
                            name: "Project ID",
                            value: serverData.accessTimeProjectId || "Not configured",
                            inline: true
                        },
                        {
                            name: "Verification Status",
                            value: serverData.isVerified ? "✅ Verified" : "❌ Not verified",
                            inline: true
                        },
                        {
                            name: "Subscriber Role",
                            value: roleInfo,
                            inline: true
                        },
                        {
                            name: "Your Wallet",
                            value: walletInfo,
                            inline: true
                        },
                        {
                            name: "Last Sync",
                            value: serverData.lastSyncAt
                                ? new Date(serverData.lastSyncAt).toLocaleString()
                                : "Never",
                            inline: true
                        }
                    ],
                    color: 0x3498db,
                    footer: {
                        text: "AccessTime Discord Bot"
                    }
                };

                await interaction.editReply({ embeds: [infoEmbed] });
            } catch (error) {
                this.logger.error("Error in info command:", error);
                await interaction.editReply("Failed to fetch bot info. Please try again.");
            }
        }
    });
}
