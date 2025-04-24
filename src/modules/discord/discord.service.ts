import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import {
    ChatInputCommandInteraction,
    Client,
    Collection,
    Events,
    GatewayIntentBits,
    Message,
    REST,
    Routes,
    SlashCommandOptionsOnlyBuilder
} from "discord.js";

@Injectable()
export class DiscordService implements OnModuleInit {
    private readonly logger = new Logger(DiscordService.name);
    private client: Client;
    private rest: REST;
    private commands: Collection<string, any> = new Collection();

    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages
            ]
        });

        this.rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
    }

    async onModuleInit() {
        try {
            await this.client.login(process.env.DISCORD_TOKEN);
            this.logger.log("Discord bot connected");

            this.setupEventListeners();
        } catch (error) {
            this.logger.error("Failed to connect to Discord:", error);
            throw error;
        }
    }

    private setupEventListeners() {
        this.client.on(Events.ClientReady, () => {
            this.logger.log(`Logged in as ${this.client.user.tag}`);
        });

        this.client.on(Events.InteractionCreate, async (interaction) => {
            if (!interaction.isCommand()) return;

            const command = this.commands.get(interaction.commandName);

            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                this.logger.error(`Error executing command ${interaction.commandName}:`, error);
                await interaction.reply({
                    content: "There was an error executing this command!",
                    ephemeral: true
                });
            }
        });
    }

    async registerCommands(
        commands: {
            data: SlashCommandOptionsOnlyBuilder;
            execute: (interaction: ChatInputCommandInteraction) => Promise<Message<boolean>>;
        }[]
    ) {
        for (const command of commands) {
            this.commands.set(command.data.name, command);
        }

        const commandsData = commands.map((command) => command.data.toJSON());

        try {
            this.logger.log("Started refreshing application commands");

            await this.rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), {
                body: commandsData
            });

            this.logger.log("Successfully registered application commands");
        } catch (error) {
            this.logger.error("Failed to register commands:", error);
            throw error;
        }
    }

    async assignRole(guildId: string, userId: string, roleId: string) {
        try {
            const guild = await this.getGuild(guildId);
            const member = await guild.members.fetch(userId);

            await member.roles.add(roleId);

            return true;
        } catch (error) {
            this.logger.error(`Failed to assign role to user ${userId}:`, error);
            return false;
        }
    }

    async removeRole(guildId: string, userId: string, roleId: string) {
        try {
            const guild = await this.getGuild(guildId);
            const member = await guild.members.fetch(userId);

            await member.roles.remove(roleId);

            return true;
        } catch (error) {
            this.logger.error(`Failed to remove role from user ${userId}:`, error);
            return false;
        }
    }

    async getGuildRoles(guildId: string) {
        try {
            const guild = await this.getGuild(guildId);
            const roles = await guild.roles.fetch();

            return Array.from(roles.values());
        } catch (error) {
            this.logger.error(`Failed to get roles for guild ${guildId}:`, error);
            return [];
        }
    }

    async getGuild(guildId: string) {
        try {
            return await this.client.guilds.fetch(guildId);
        } catch (error) {
            this.logger.error(`Failed to get guild ${guildId}:`, error);
            return undefined;
        }
    }
}
