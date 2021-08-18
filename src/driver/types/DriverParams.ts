import Joi = require('joi');

export interface OptionsParams {
    type: string;
    user: string;
    password: string;
    connectString: string;
}

export let OptionsParamsSchema = Joi.object({
    type: Joi.string().valid("oracle").required(),
    user: Joi.string().required(),
    password: Joi.string().required(),
    connectString: Joi.string().required(),
}).required();