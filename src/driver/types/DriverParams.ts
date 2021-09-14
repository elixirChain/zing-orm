import Joi = require('joi');

export interface OptionsParams {
    type: string;
    user: string;
    password: string;
    host: string;
    port: string;
    database: string;
}

export let OptionsParamsSchema = Joi.object({
    type: Joi.string().valid("oracle", "mssql").required(),
    user: Joi.string().required(),
    password: Joi.string().required(),
    host: Joi.string().required(),
    port: Joi.string().required(),
    database: Joi.string().required(),
}).required();