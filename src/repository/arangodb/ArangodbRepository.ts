
// const _ = require('lodash');
import * as moment from 'moment';
import { aql } from "arangojs";
import {
    GetPageParams,
    GetPageParamsSchema,
    GetsByFilterParams,
    GetsByFilterParamsSchema,
    UpdatesByFilterParams,
    UpdatesByFilterParamsSchema,
    SavesParams,
    SavesParamsSchema,
    DeletesByFilterParams,
    DeletesByFilterParamsSchema,
    ExecuteSqlParams,
    ExecuteSqlParamsSchema,
} from '../types/RepositoryParams';
import { JoiUtils } from '../../util/JoiUtils';
// import { CommonTools } from '../../util/CommonTools';
import { findTableName } from "../../util/globals";

/**
 * Entity manager supposed to work with any entity, automatically find its repository and call its methods,
 * whatever entity type are you passing.
 */
export class ArangodbRepository {

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

    // 过滤属性，在非赋值情况不覆盖数据：update，insert
    unset = ['_id', '_rev', '_key', '_status', '_create_date'];

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
            // this.queryBuilder = knex({ client: 'mssql' });
            this.entity = _entity;
            this.tableName = findTableName(_entity);
        } catch (err) {
            //todo
            console.error("初始化 ArangodbRepository Class 失败!!!", err);
        }
        // })
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    async executeSql(params: ExecuteSqlParams): Promise<any> {
        try {
            await JoiUtils.checkParams(ExecuteSqlParamsSchema, params);
            return await ArangodbRepository.executeSqlRaw(this.connection, params)
        } catch (err) {
            console.log("executeSql error:", err);
        }
    }

    static async executeSqlRaw(connection: any, params: ExecuteSqlParams): Promise<any> {
        await JoiUtils.checkParams(ExecuteSqlParamsSchema, params);
        var { sql, binds = {}, options = {} } = params;
        console.log("executeSqlRaw params: ", sql, binds, options);
        const cursor = await await connection.query({
            query: sql,
            bindVars: binds
        });
        let result = await cursor.all();
        console.log("executeSqlRaw Query results: ");
        console.dir(result);
        return result;

    }

    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------


    /**
    * 处理数组属性的查询参数
    * @param {string} alias 别名
    * @param {string} key 属性名
    * @param {any} data 数据值
    */
    private getArrayAttrAql(alias, key, data) {
        const arrayAttrAqlList = [];
        // 数组拆分元素用 or 连接
        if (Array.isArray(data)) {
            // 处理 or 条件
            data && data.forEach((el, idx) => {
                if (idx === 0) {
                    arrayAttrAqlList.push(aql`\nFILTER `);
                }

                // filter 隐含了 ‘and’条件，所以只需要所有的 ‘or’ 条件连接在一个 filter 即可
                if (idx === data.length - 1) {
                    arrayAttrAqlList.push(aql`${el} in ${alias}.${key} `);
                } else {
                    arrayAttrAqlList.push(aql`${el} in ${alias}.${key} or `);
                }
            });
        } else {
            arrayAttrAqlList.push(aql`\nFILTER ${data} in ${alias}.${key}`);
        }
        return aql.join(arrayAttrAqlList)
    }

    /**
    * 拼装过滤参数：使用FILTER可以利用索引（and连接）
    * - （单数类型）默认==匹配
    * - array类型使用in匹配
    * - object{opr, value}类型使用指定操作符
    *  - opr = 'POSITION' 时需要处理数组属性的查询参数
    * aql.join, aql.literal @see https://www.arangodb.com/docs/devel/appendix-java-script-modules-arango-db.html
    * @param {object} filter 查询参数对象
    * @param {string} alias alias of collection
    * @return {AQL} obj
    */
    private getFilterAql(filter, alias?) {
        // 默认别名为't'
        if (!alias) {
            alias = 't';
        }

        alias = aql.literal(alias);

        let filterAql;
        if (filter) {
            let filterAqlList = [];
            const otherFilterAqlList = [];
            const arrayAttrAqlList = [];
            let first = true;
            for (const key in filter) {
                const data = filter[key];
                if (Array.isArray(data)) {
                    // 数组参数，则‘in’
                    filterAqlList.push(aql` and ${alias}.${key} in ${data}`);
                } else if (!!data && typeof data === 'object') {
                    /**
                     * 对象参数结构{opr, value}
                     * 支持：==, !=, <, <=, >, >=, IN, NOT IN, LIKE, =~, !~
                     * 注意: typeof null === 'object'
                     * 增加：opr = 'POSITION' 时需要处理数组属性的查询参数
                     */
                    if (data.opr === 'POSITION') {
                        arrayAttrAqlList.push(this.getArrayAttrAql(alias, key, data.value));
                    } else {
                        otherFilterAqlList.push(aql` and ${alias}.${key} ${aql.literal(data.opr)} ${data.value}`);
                    }
                } else {
                    // 单个参数，默认‘==’
                    filterAqlList.push(aql` and ${alias}.${key} == ${data}`);
                }
                if (first) first = false;
            }
            // otherFilterAqlList在后，符合最左匹配原则
            filterAqlList = filterAqlList.concat(otherFilterAqlList).concat(arrayAttrAqlList);
            if (filterAqlList.length !== 0) {
                filterAql = aql.join(filterAqlList);
            }
        }
        return filterAql;
    }

    /**
    * 处理排序字符串（不含SORT）
    * @param {object} sorts params
    * @param {string} alias alias of collection
    * @return {AQL} obj
    */
    private getSortFieldAqlList(sorts, alias?) {
        // 默认别名为't'
        if (!alias) {
            alias = 't';
        }
        alias = aql.literal(alias);

        // 默认时间倒序和_id倒序
        const fieldAqlList = [ aql` ${alias}._create_date desc, ${alias}._id desc ` ];
        // const fieldAqlList = [aql` ${alias}._id `];
        if (sorts) {
            // 删除默认排序
            fieldAqlList.shift();
            sorts && sorts.forEach((el) => {
                if (!el.direction) {
                    fieldAqlList.push(aql`${alias}.${el.field}`);
                } else {
                    fieldAqlList.push(aql`${alias}.${el.field} ${el.direction}`);
                }
            });
        }
        return fieldAqlList;
    }


    /**
    * 拼装排序条件
    * @param {array} sortFieldAqlList params
    * @return {AQL} obj
    */
    private getSortAql(sortFieldAqlList) {
        if (sortFieldAqlList && sortFieldAqlList.length > 0) {
            // 添加到开头
            const sorts = [aql` SORT`];
            sorts.push(sortFieldAqlList[0]);
            // 补逗号
            for (let i = 1; i < sortFieldAqlList.length; i++) {
                sorts.push(aql`, `);
                sorts.push(sortFieldAqlList[i]);
            }

            sortFieldAqlList = sorts;
        }
        // 拼接完整sort AQL
        return aql.join(sortFieldAqlList);
    }

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
            let {
                current,
                pageSize,
                sorts,
                filter
                // options
            } = params;

            // 转换分页参数：pageNum,page_size => offset,count
            let offset = (current - 1) * pageSize;
            let count = pageSize;

            const collection = aql.literal(`${this.tableName}`);
            const filterAql = this.getFilterAql(filter);
            // 拼装排序条件 默认创建时间倒序
            const sortAql = this.getSortAql(this.getSortFieldAqlList(sorts));
            // const collections = this.aql.literal(`${pluralize(this.getLowerCollectionName())}`);
            const query = aql`
                  LET ts = ( 
                    FOR t IN ${collection}
                        FILTER t._status == true ${filterAql}
                        ${sortAql}
                    RETURN t
                  )
                  LET tsl = (
                    LET list = (
                      FOR tl IN ts
                        LIMIT ${offset},${count} 
                      RETURN tl 
                    )
                    RETURN list
                  ) 
                  LET total = LENGTH(ts) 
                  LET flag = (${offset} + ${count} >= total) 
                  LET hasMore = !flag 
                  RETURN {total:total, hasMore:hasMore, list:tsl[0]}`;

            const rows = await this.executeSql({
                sql: query.query,
                binds: query.bindVars
            });

            let result = Object.assign({}, rows[0], {
                totalPage: Math.ceil(rows[0].total / pageSize),
                current,
                pageSize,
            })

            return result;

        } catch (err) {
            console.error("ArangodbRepository getPage 失败!!!", err);
            throw Error(`ArangodbRepository getPage 失败!!!, 错误: ${err}`)
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
            let {
                filter,
                sorts,
                // options
            } = params;

            // 修改为使用FILTER可以利用索引
            const filterAql = this.getFilterAql(filter);
            // 拼装排序条件 默认创建时间倒序
            const sortAql = this.getSortAql(this.getSortFieldAqlList(sorts));
            const collection = aql.literal(`${this.tableName}`);
            const query = aql`
                  FOR t IN ${collection} 
                    FILTER t._status == true ${filterAql}
                    ${sortAql}
                  RETURN t`;

            const rows = await this.executeSql({
                sql: query.query,
                binds: query.bindVars
            });

            return rows[0];

        } catch (err) {
            console.error("ArangodbRepository getsByFilter 失败!!!", err);
            throw Error(`ArangodbRepository getsByFilter 失败!!!, 错误: ${err}`)
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
            let {
                filter,
                newObj,
                // options
            } = params;

            const update_date = moment().format('YYYY-MM-DD HH:mm:ss');
            const filterAql = this.getFilterAql(filter);
            const collection = aql.literal(`${this.tableName}`);
            // todo add returns 返回 NEW. etc.
            const query = aql`
              let tsl = (
                  FOR t IN ${collection} 
                    FILTER t._status == true ${filterAql}
                      UPDATE t WITH MERGE(UNSET(${newObj}, ${this.unset}), { _update_date:${update_date}})
                      IN ${collection} OPTIONS { keepNull: false }
                      RETURN NEW._id
              )
              RETURN {ids: tsl}`;

            const rows = await this.executeSql({
                sql: query.query,
                binds: query.bindVars
            });

            return rows[0];

        } catch (err) {
            console.error("ArangodbRepository updatesByFilter 失败!!!", err);
            throw Error(`ArangodbRepository updatesByFilter 失败!!!, 错误: ${err}`)
        }
    }

    async saves(params: SavesParams) {
        try {
            await JoiUtils.checkParams(SavesParamsSchema, params);
            let {
                objs,
                // options
            } = params;
            //todo 检查Entity attributes
            const create_date = moment().format('YYYY-MM-DD HH:mm:ss');
            const collection = aql.literal(`${this.tableName}`);
            const query = aql`
                let tsl = (
                  FOR t IN ${objs}
                    INSERT MERGE(UNSET(t, ${this.unset}), { _create_date:${create_date}, _status: true }) 
                    INTO ${collection} 
                  RETURN NEW._id
                )
                RETURN {_ids: tsl}`;

            const rows = await this.executeSql({
                sql: query.query,
                binds: query.bindVars
            });

            return rows[0];

        } catch (err) {
            console.error("ArangodbRepository save 失败!!!", err);
            throw Error(`ArangodbRepository save 失败!!!, 错误: ${err}`)
        }
    }

    async deletesByFilter(params: DeletesByFilterParams) {
        try {
            await JoiUtils.checkParams(DeletesByFilterParamsSchema, params);
            let {
                filter,
                // options
            } = params;
            const delete_date = moment().format('YYYY-MM-DD HH:mm:ss');
            const filterAql = this.getFilterAql(filter);
            const collection = aql.literal(`${this.tableName}`);
            const query = aql`
            let tsl = (
                FOR t IN ${collection} 
                  FILTER t._status == true ${filterAql}
                    UPDATE t WITH MERGE(${{ _status: false }}, { _delete_date:${delete_date}})
                    IN ${collection} OPTIONS { keepNull: false }
                    RETURN NEW._id
            )
            RETURN {ids: tsl}`;

            const rows = await this.executeSql({
                sql: query.query,
                binds: query.bindVars
            });

            return rows[0];

        } catch (err) {
            console.error("ArangodbRepository deletesByFilter 失败!!!", err);
            throw Error(`ArangodbRepository deletesByFilter 失败!!!, 错误: ${err}`)
        }
    }

}
