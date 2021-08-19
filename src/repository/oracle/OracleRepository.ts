import {
    GetPageParams,
    GetPageParamsSchema,
    ExecuteSqlParams,
    ExecuteSqlParamsSchema,
} from '../types/RepositoryParams';
import { JoiUtils } from '../../util/JoiUtils';
import { findTableName } from "../../util/globals";

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
            var { sql, binds = {}, options = {} } = params;
            console.log("executeSql params: ", sql, binds, options);
            let result = await this.connection.execute(sql, binds, options);
            console.log("executeSql Query results: ");
            console.dir(result);
            return result;
        } catch (err) {
            console.log("executeSql error:", err);
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

    async getPage(params: GetPageParams) {
        try {
            await JoiUtils.checkParams(GetPageParamsSchema, params);
            let { current, pageSize } = params;
            let sql: string;
            //todo add sql builder and make sure entity.name is not undefined

            sql = `SELECT * FROM (SELECT A.*, ROWNUM AS MY_RNUM FROM ( SELECT * FROM ${this.tableName}) A
                WHERE ROWNUM <= :maxnumrows + :offset) WHERE MY_RNUM > :offset`
            let count_sql = `SELECT count(id) FROM ${this.tableName}`
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


}
