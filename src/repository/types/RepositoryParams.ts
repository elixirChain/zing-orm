import Joi = require('joi');

export interface GetPageParams {
    current: number;
    pageSize: number;
}

export let GetPageParamsSchema = Joi.object({
    current: Joi.number().strict().integer().min(1).required(),
    pageSize: Joi.number().strict().integer().min(10).required(),
}).required();

export interface ExecuteSqlParams {
    //todo 增加对象的具体字段
    sql: string;
    binds?: object;
    options?: object;
}

export let ExecuteSqlParamsSchema = Joi.object({
    sql: Joi.string().required(),
    binds: Joi.object(),
    options: Joi.object(),
}).required();