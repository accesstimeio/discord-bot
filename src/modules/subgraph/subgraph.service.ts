import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { GraphQLClient, gql } from "graphql-request";
import { Address } from "viem";

type SubscriptionsResponse = {
    accessTimeUsers: {
        items: {
            endTime: string;
            address: Address;
        }[];
        pageInfo: {
            hasNextPage: boolean;
            endCursor: string | null;
        };
    };
};

const SubscriptionsDocument = gql`
    query subscriptions($accessTimeAddress: String!, $chainId: Int!, $after: String) {
        accessTimeUsers(
            limit: 50
            after: $after
            orderBy: "id"
            where: { accessTimeAddress: $accessTimeAddress, chainId: $chainId }
        ) {
            items {
                endTime
                address
            }
            pageInfo {
                hasNextPage
                endCursor
            }
        }
    }
`;

@Injectable()
export class SubgraphService implements OnModuleInit {
    private readonly logger = new Logger(SubgraphService.name);
    private client: GraphQLClient;

    onModuleInit() {
        this.client = new GraphQLClient(process.env.SUBGRAPH_URL);
    }

    async fetchSubscription(
        accessTimeAddress: Address,
        chainId: number,
        pageCursor?: string
    ): Promise<SubscriptionsResponse["accessTimeUsers"]> {
        try {
            const result: SubscriptionsResponse = await this.client.request(SubscriptionsDocument, {
                accessTimeAddress,
                chainId,
                after: pageCursor ?? ""
            });

            return result.accessTimeUsers;
        } catch (error) {
            this.logger.error("Error in fetchSubscription:", error);

            return {
                items: [],
                pageInfo: {
                    hasNextPage: false,
                    endCursor: null
                }
            };
        }
    }
}
