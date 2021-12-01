import {
    GetPageParams,
    GetPageParamsSchema,
    GetsByFilterParams,
    GetsByFilterParamsSchema,
    UpdatesByFilterParams,
    UpdatesByFilterParamsSchema,
    SaveParams,
    SaveParamsSchema,
    DeletesByFilterParams,
    DeletesByFilterParamsSchema,
    ExecuteProcedureParams,
    ExecuteProcedureParamsSchema,
    ExecuteSqlParams,
    ExecuteSqlParamsSchema,
} from '../types/RepositoryParams';
import { JoiUtils } from '../../util/JoiUtils';
import { findTableName } from "../../util/globals";
import { knex } from 'knex';
const oracledb = require('oracledb');
const _ = require('lodash');
/**
 * Entity manager supposed to work with any entity, automatically find its repository and call its methods,
 * whatever entity type are you passing.
 */
export class OracleRepository {

    // -------------------------------------------------------------------------
    // Public Properties
    // -------------------------------------------------------------------------

    /**
     * Connection used by this entity manager.
     */
    connection: any;

    queryBuilder: any;

    entity: any;

    tableName: string;


    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(_connection: any, _entity: any) {
        // super(async () => {
        try {
            if (!_entity) {
                throw Error(`constructor params::_entity can not be ${JSON.stringify(_entity)} !!!`);
            }
            this.connection = _connection;
            this.queryBuilder = knex({ client: 'oracledb' });
            this.entity = _entity;
            this.tableName = findTableName(_entity);
        } catch (err) {
            //todo
            console.error("初始化 OracleRepository Class 失败!!!", err);
        }
        // })
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    async executeSql(params: ExecuteSqlParams): Promise<any> {
        try {
            await JoiUtils.checkParams(ExecuteSqlParamsSchema, params);
            return await OracleRepository.executeSqlRaw(this.connection, params);
        } catch (err) {
            console.log("executeSql error:", err);
        }
    }

    static async executeSqlRaw(connection: any, params: ExecuteSqlParams): Promise<any> {
        try {
            await JoiUtils.checkParams(ExecuteSqlParamsSchema, params);
            var { sql, binds = {}, options = {} } = params;
            console.log("executeSqlRaw params: ", sql, binds, options);
            let result = await connection.execute(sql, binds, options);
            console.log("executeSqlRaw Query results: ");
            console.dir(result);
            return result;
        } catch (err) {
            console.log("executeSqlRaw error:", err);
        }
    }

    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------

    /**
     * Find with pagination and condition.
     * - cant use findAndCount for both params
     * - use createQueryBuilder
     * @param params 参数
     * @param params.current 页码
     * @param params.pageSize 页面条数
     * @param params.sort 排序
     * @param dataFunc 数据处理函数
     */

    //todo add filter, knex
    async getPage(params: GetPageParams) {
        try {
            await JoiUtils.checkParams(GetPageParamsSchema, params);
            let { current, pageSize, options } = params;
            let sql = '';
            let count_sql = '';
            //todo add sql builder and make sure entity.name is not undefined
            if (!!options && !!options.schema) {
                sql = `SELECT * FROM (SELECT A.*, ROWNUM AS MY_RNUM FROM ( SELECT * FROM "${options.schema}"."${this.tableName}") A
                WHERE ROWNUM <= :maxnumrows + :offset) WHERE MY_RNUM > :offset`
                count_sql = `SELECT count(id) FROM "${options.schema}"."${this.tableName}"`
            } else {
                sql = `SELECT * FROM (SELECT A.*, ROWNUM AS MY_RNUM FROM ( SELECT * FROM "${this.tableName}") A
                WHERE ROWNUM <= :maxnumrows + :offset) WHERE MY_RNUM > :offset`
                count_sql = `SELECT count(id) FROM "${this.tableName}"`
            }

            const result1 = await this.executeSql({
                sql,
                binds: { offset: (current - 1) * pageSize, maxnumrows: pageSize },
                options: { prefetchRows: pageSize + 1, fetchArraySize: pageSize }
            });
            const result2 = await this.executeSql({ sql: count_sql });
            const total = result2.rows[0]['COUNT(ID)'];

            return {
                // Optional
                totalPage: Math.ceil(total / pageSize),
                current,
                pageSize,
                // Required
                total,
                list: result1.rows
            };
        } catch (err) {
            console.error("OracleRepository getPage 失败!!!", err);
            throw Error(`OracleRepository getPage 失败!!!, 错误: ${err}`)
        }
    }

    /**
    * get documents by filter of collection
    * @param {object} _params - params object
    * @param {object} _params.filter - filter of attrs.
    * @param {object} _params.like - the object to like the documents to get from the collection
    * @param {array} _params.sorts - array of sort str for attrs.
    * @param {object} _params.options - query options, e.g. keepAttrs-res attrs; hasEdge-edge res;
    * @return {AqlQuery} - interface AqlQuery by arangodb
    */
    async getsByFilter(params: GetsByFilterParams) {
        try {
            await JoiUtils.checkParams(GetsByFilterParamsSchema, params);
            let { filter, options } = params;
            let filterTemp = Object.assign({}, filter);
            // let { filter, sorts, options } = params;
            let tempQuery = this.queryBuilder(this.tableName);
            for (const key in filterTemp) {
                const data = filterTemp[key];
                if (Array.isArray(data)) {
                    // 数组参数，则‘in’
                    tempQuery = tempQuery.whereIn(key, data);
                    delete filterTemp[key];
                } else if (!!data && Object.prototype.toString.call(data) === '[object Object]') {
                    //todo 暂时不支持
                    /**
                    * 对象参数结构{opr, value}
                    * 支持：==, !=, <, <=, >, >=, IN, NOT IN, LIKE, =~, !~
                    * 注意: typeof null === 'object'
                    * 增加：opr = 'POSITION' 时需要处理数组属性的查询参数
                    */
                    tempQuery.where(`${key}`, data.opr, data.value)
                    delete filterTemp[key];
                }
            }

            if (Object.keys(filterTemp).length !== 0) {
                tempQuery = tempQuery.where({
                    ...filterTemp
                });
            }

            if (!!options && !!options.schema) {
                tempQuery = tempQuery.withSchema(options.schema)
            }

            if (!!options && !!options.keepAttrs) {
                tempQuery = tempQuery.column(options.keepAttrs).select()
            } else {
                tempQuery = tempQuery.select('*')
            }

            const query = tempQuery.toSQL().toNative()
            console.log("getsByFilter query: ", query)
            const result = await this.executeSql({
                sql: query.sql,
                binds: query.bindings,
            });

            return result.rows;

        } catch (err) {
            console.error("OracleRepository getsByFilter 失败!!!", err);
            throw Error(`OracleRepository getsByFilter 失败!!!, 错误: ${err}`)
        }
    }

    /**
    * update document by _id && newObj from collection
    * @param {object} _params - the _id of the document
    * @param {string} _params.filter - the _id of the document
    * @param {object} _params.newObj - the newObj of the document
    * @return {AqlQuery} - interface AqlQuery by arangodb
    */
    async updatesByFilter(params: UpdatesByFilterParams) {
        try {
            await JoiUtils.checkParams(UpdatesByFilterParamsSchema, params);
            let { filter, newObj, options } = params;
            let filterTemp = Object.assign({}, filter);
            //todo 检查Entity attributes
            let newObjTemp = Object.assign({}, newObj);
            // let { filter, sorts, options } = params;
            let tempQuery = this.queryBuilder(this.tableName);
            for (const key in filterTemp) {
                const data = filterTemp[key];
                if (Array.isArray(data)) {
                    // 数组参数，则‘in’
                    tempQuery = tempQuery.whereIn(key, data);
                    delete filterTemp[key];
                } else if (!!data && Object.prototype.toString.call(data) === '[object Object]') {
                    //todo 暂时不支持
                    /**
                    * 对象参数结构{opr, value}
                    * 支持：==, !=, <, <=, >, >=, IN, NOT IN, LIKE, =~, !~
                    * 注意: typeof null === 'object'
                    * 增加：opr = 'POSITION' 时需要处理数组属性的查询参数
                    */
                    tempQuery.where(`${key}`, data.opr, data.value)
                    delete filterTemp[key];
                }
            }

            if (Object.keys(filterTemp).length !== 0) {
                tempQuery = tempQuery.where({
                    ...filterTemp
                });
            }

            if (!!options && !!options.schema) {
                tempQuery = tempQuery.withSchema(options.schema)
            }

            if (!!options && !!options.returns) {
                tempQuery = tempQuery.returning(options.returns)
            }

            const query = tempQuery.update({
                ...newObjTemp
            }).toSQL().toNative();

            let bindingsObj = {};

            for (let i = 0; i < query.bindings.length; i++) {

                if (typeof query.bindings[i] === 'object' && query.bindings[i].constructor.name === 'ReturningHelper') {
                    // bindingsObj[i] = {
                    //     [query.bindings[i].columnName]: { dir: oracledb.BIND_OUT }
                    // };
                    query.sql = _.replace(query.sql, `:${i + 1}`, `:${query.bindings[i].columnName}`);
                    //todo  通过Entity 获取 返回字段的变量类型 用以生成 outBinds type
                    bindingsObj[query.bindings[i].columnName + ''] = { dir: oracledb.BIND_OUT };
                } else {
                    bindingsObj[i + 1] = query.bindings[i];
                }
            }

            // console.log('bindingsObj: ', bindingsObj);

            console.log("updatesByFilter query: ", query)
            const result = await this.executeSql({
                sql: query.sql,
                binds: bindingsObj,
                options: { autoCommit: true }
            });

            return result.outBinds;

        } catch (err) {
            console.error("OracleRepository updatesByFilter 失败!!!", err);
            throw Error(`OracleRepository updatesByFilter 失败!!!, 错误: ${err}`)
        }
    }

    async save(params: SaveParams) {
        try {
            await JoiUtils.checkParams(SaveParamsSchema, params);
            let { obj, options } = params;
            //todo 检查Entity attributes
            let tempQuery = this.queryBuilder(this.tableName);

            if (!!options && !!options.schema) {
                tempQuery = tempQuery.withSchema(options.schema)
            }

            if (!!options && !!options.returns) {
                tempQuery = tempQuery.returning(options.returns)
            }

            const query = tempQuery.insert(obj).toSQL().toNative();

            let bindingsObj = {};

            for (let i = 0; i < query.bindings.length; i++) {

                if (typeof query.bindings[i] === 'object' && query.bindings[i].constructor.name === 'ReturningHelper') {
                    // bindingsObj[i] = {
                    //     [query.bindings[i].columnName]: { dir: oracledb.BIND_OUT }
                    // };
                    query.sql = _.replace(query.sql, `:${i + 1}`, `:${query.bindings[i].columnName}`);
                    bindingsObj[query.bindings[i].columnName + ''] = { dir: oracledb.BIND_OUT };
                } else {
                    bindingsObj[i + 1] = query.bindings[i];
                }
            }

            const result = await this.executeSql({
                sql: query.sql,
                binds: bindingsObj,
                options: { autoCommit: true }
            });

            return result.outBinds;

        } catch (err) {
            console.error("OracleRepository save 失败!!!", err);
            throw Error(`OracleRepository save 失败!!!, 错误: ${err}`)
        }
    }

    async deletesByFilter(params: DeletesByFilterParams) {
        try {
            await JoiUtils.checkParams(DeletesByFilterParamsSchema, params);
            let { filter, options } = params;
            let filterTemp = Object.assign({}, filter);
            //todo 检查Entity attributes
            // let { filter, sorts, options } = params;
            let tempQuery = this.queryBuilder(this.tableName);
            for (const key in filterTemp) {
                const data = filterTemp[key];
                if (Array.isArray(data)) {
                    // 数组参数，则‘in’
                    tempQuery = tempQuery.whereIn(key, data);
                    delete filterTemp[key];
                } else if (!!data && Object.prototype.toString.call(data) === '[object Object]') {
                    //todo 暂时不支持
                    /**
                    * 对象参数结构{opr, value}
                    * 支持：==, !=, <, <=, >, >=, IN, NOT IN, LIKE, =~, !~
                    * 注意: typeof null === 'object'
                    * 增加：opr = 'POSITION' 时需要处理数组属性的查询参数
                    */
                    tempQuery.where(`${key}`, data.opr, data.value)
                    delete filterTemp[key];
                }
            }

            if (Object.keys(filterTemp).length !== 0) {
                tempQuery = tempQuery.where({
                    ...filterTemp
                });
            }

            if (!!options && !!options.schema) {
                tempQuery = tempQuery.withSchema(options.schema)
            }

            //todo return can't work
            // if (!!options && !!options.returns) {
            //     tempQuery = tempQuery.returning(options.returns)
            // }

            const query = tempQuery.del().toSQL().toNative();

            let bindingsObj = {};

            for (let i = 0; i < query.bindings.length; i++) {

                if (typeof query.bindings[i] === 'object' && query.bindings[i].constructor.name === 'ReturningHelper') {

                    query.sql = _.replace(query.sql, `:${i + 1}`, `:${query.bindings[i].columnName}`);
                    bindingsObj[query.bindings[i].columnName + ''] = { dir: oracledb.BIND_OUT };
                } else {
                    bindingsObj[i + 1] = query.bindings[i];
                }
            }

            if (!!options && !!options.returns && Array.isArray(options.returns)) {
                let returningStr = ' returning';
                for (let i = 0; i < options.returns.length; i++) {
                    returningStr = returningStr + ` "${options.returns[i]}" INTO :${options.returns[i]}`
                    bindingsObj[options.returns[i] + ''] = { dir: oracledb.BIND_OUT };
                }
                query.sql = query.sql + returningStr;
            }

            // console.log('bindingsObj: ', bindingsObj);
            const result = await this.executeSql({
                sql: query.sql,
                binds: bindingsObj,
                options: { autoCommit: true }
            });

            return result.outBinds;

        } catch (err) {
            console.error("OracleRepository deletesByFilter 失败!!!", err);
            throw Error(`OracleRepository deletesByFilter 失败!!!, 错误: ${err}`)
        }
    }

    async executeProcedure(params: ExecuteProcedureParams) {
        try {
            await JoiUtils.checkParams(ExecuteProcedureParamsSchema, params);
            let { binds, options } = params;
            let bindsStr = '';
            for (var key in binds) {
                bindsStr = bindsStr + ` :${key},`;
            }
            bindsStr = bindsStr.slice(0, -1);
            console.log('bindsStr:', bindsStr);

            var schema = '';
            if (!!options && !!options.schema) {
                schema = options.schema;
            }

            const query = this.queryBuilder.raw(
                `BEGIN
                    "${schema}"."${this.tableName}"(${bindsStr});
                    COMMIT;
                END;`,
            ).toSQL().toNative();

            console.log('query: ', query);
            const result = await this.executeSql({
                sql: query.sql,
                binds: binds
            });

            return result.outBinds;

        } catch (err) {
            console.error("OracleRepository executeProcedure 失败!!!", err);
            throw Error(`OracleRepository executeProcedure 失败!!!, 错误: ${err}`)
        }
    }

}
