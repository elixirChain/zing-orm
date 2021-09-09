// import { array } from 'joi';
import Joi = require('joi');

// 最少一个不为非法不可空（保存/查询单个）：限制至少一个属性，不为空（'', null），不允许非法字符
const filterMinRequired = Joi.object().min(1).pattern(/.*/, Joi.any().invalid('', null, NaN, Infinity).required());

export interface GetPageParams {
    current: number;
    pageSize: number;
    options: Options;
}

export let GetPageParamsSchema = Joi.object({
    current: Joi.number().strict().integer().min(1).required(),
    pageSize: Joi.number().strict().integer().min(10).required(),
    options: Joi.object(),
}).required();


export interface Options {
    keepAttrs: Array<string>;
    schema: string;
    returns: Array<string>;
}

export interface GetsByFilterParams {
    filter: object;
    sorts: object;
    options: Options;
}

// * get documents by filter of collection
// * @param {object} _params - params object
// * @param {object} _params.filter - filter of attrs.
// * @param {object} _params.like - the object to like the documents to get from the collection
// * @param {array} _params.sorts - array of sort str for attrs.
// * @param {object} _params.options - query options, e.g. keepAttrs-res attrs; hasEdge-edge res;
// * @return {AqlQuery} - interface AqlQuery by arangodb

export let GetsByFilterParamsSchema = Joi.object({
    filter: Joi.object().required(),
    sorts: Joi.object(),
    options: Joi.object(),
}).required();

export interface UpdatesByFilterParams {
    filter: object;
    newObj: object;
    options: Options;
}

export let UpdatesByFilterParamsSchema = Joi.object({
    filter: Joi.object().required(),
    newObj: Joi.object().required(),
    options: Joi.object(),
}).required();

export interface SaveByFilterParams {
    obj: object;
    options: Options;
}

export let SaveByFilterParamsSchema = Joi.object({
    obj: filterMinRequired.required(),
    options: Joi.object(),
}).required();

export interface DeletesByFilterParams {
    filter: object;
    options: Options;
}

export let DeletesByFilterParamsSchema = Joi.object({
    filter: Joi.object().required(),
    options: Joi.object(),
}).required();

export interface executeProcedureParams {
    json: string;
}

export let executeProcedureParamsSchema = Joi.object({
    json: Joi.string().required(),
}).required();

export interface ExecuteSqlParams {
    //todo 增加对象的具体字段
    sql: string;
    binds?: object | Array<any>;
    options?: object;
}

export let ExecuteSqlParamsSchema = Joi.object({
    sql: Joi.string().required(),
    binds: Joi.alternatives().try(Joi.object(), Joi.array()),
    options: Joi.object(),
}).required();