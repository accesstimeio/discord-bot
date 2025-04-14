import { Chain } from "@accesstimeio/accesstime-common";
import { Factory } from "@accesstimeio/accesstime-sdk";
import { Injectable } from "@nestjs/common";

@Injectable()
export class FactoryService {
    public client: { [key: number]: Factory } = {};
    constructor() {
        Chain.ids.forEach((chainId) => {
            this.client[chainId] = new Factory({ id: chainId });
        });
    }
}
