import { users } from "./users.schema";
import { servers } from "./servers.schema";
import { subscriptions } from "./subscriptions.schema";

const schema = {
    users,
    servers,
    subscriptions
};

export { users, servers, subscriptions };
export default schema;
