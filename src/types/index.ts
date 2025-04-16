import * as Joi from "joi";

const hashRegex = /^0x([A-Fa-f0-9]+)$/;
const addressRegex = /^0x[a-fA-F0-9]{40}$/;

export const setupCommandInput = Joi.object({
    project_id: Joi.number().required(),
    chain_id: Joi.number().required()
});

export const verifyCommandInput = Joi.string().regex(hashRegex).required();

export const completeLinkWalletCommandInput = Joi.object({
    signature: Joi.string().regex(hashRegex).required(),
    wallet: Joi.string().regex(addressRegex).required()
});
