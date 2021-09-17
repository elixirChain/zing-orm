// import { Repository } from "../repository/Repository";
import { Driver } from '../driver/Driver';
import { DriverFactory } from '../driver/DriverFactory';
import { RepositoryFactory } from '../repository/RepositoryFactory';
import { JoiUtils } from '../util/JoiUtils';
import { AsyncConstructor } from '../util/AsyncConstructor';
import { OptionsParams, OptionsParamsSchema } from '../driver/types/DriverParams';
import { findTableName, getGlobalTablesObj } from "../util/globals";
import { forOwn, keys } from 'lodash';
import { OracleRepository } from '../repository/oracle/OracleRepository';
import { MssqlRepository } from '../repository/mssql/MssqlRepository';
import {
    ExecuteSqlParams,
    ExecuteSqlParamsSchema,
} from '../repository/types/RepositoryParams';
/**
 * Connection is a single database ORM connection to a specific database.
 * Its not required to be a database connection, depend on database type it can create connection pool.
 * You can have multiple connections to multiple databases in your application.
 */
export class Connection extends AsyncConstructor {

    // -------------------------------------------------------------------------
    // Public Readonly Properties
    // -------------------------------------------------------------------------

    /**
     * Connection name.
     */
    //todo if add mutil connections, then use it
    // name: string;

    /**
     * Database driver used by this connection.
     */
    driver: Driver;

    connection: any;

    /**
     * Connection options.
     */
    options: OptionsParams;

    //todo add database metadata, contain table and view and etc... 
    metadata: any;

    // key : Repository
    repositories: object;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(_options: OptionsParams) {
        super(async () => {
            try {
                await JoiUtils.checkParams(OptionsParamsSchema, _options);
                // this.name = "default";
                this.options = _options;
                this.driver = await DriverFactory.create(_options);
                this.connection = await this.driver.getConnection(_options);
                this.repositories = {};
                //todo connect to db and generate schema, 
                // use to check globalScope.tablesObj whether in the db or not when Connection Class init
                await this.initRepositories();
                this.metadata = {}

            } catch (err) {
                //todo
                console.error("初始化 Connection Class 失败!!!", err);
            }
        })
    }

    // -------------------------------------------------------------------------
    // Public Accessors
    // -------------------------------------------------------------------------

    /**
     * Gets the mongodb entity manager that allows to perform mongodb-specific repository operations
     * with any entity in this connection.
     *
     * Available only in mongodb connections.
     */
    // get mongoManager(): MongoEntityManager {
    //     if (!(this.manager instanceof MongoEntityManager))
    //         throw new TypeORMError(`MongoEntityManager is only available for MongoDB databases.`);

    //     return this.manager as MongoEntityManager;
    // }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Performs connection to the database.
     * This method should be called once on application bootstrap.
     * This method not necessarily creates database connection (depend on database type),
     * but it also can setup a connection pool with database to use.
     */

    async executeSqlRaw(params: ExecuteSqlParams): Promise<any> {
        try {
            await JoiUtils.checkParams(ExecuteSqlParamsSchema, params);
            let type = this.options.type;
            switch (type) {
                case "mssql":
                    return await MssqlRepository.executeSqlRaw(this.connection, params);
                case "oracle":
                    return await OracleRepository.executeSqlRaw(this.connection, params);
                default:
                    throw new Error(`Connection ${type} executeSqlRaw is not found!`);
            }
        } catch (err) {
            console.log("Connection executeSqlRaw error:", err);
        }
    }

    // getRepository<Entity>(target: EntityTarget<Entity>): Repository<Entity> {
    getRepository(target: any): any {
        try {
            // check target -> key: name, if not in <globalScope.tablesObj>, exit
            let tableName = findTableName(target);
            // if allready have, direct return 
            if (!!this.repositories[tableName]) {
                return this.repositories[tableName];
            } else {
                // if repository was not found then create it, store its instance and return it
                // const newRepository = await RepositoryFactory.create(this.options, this.connection, target);
                // this.repositories[tableName] = newRepository;
                // return newRepository;
                throw Error(`${JSON.stringify(target)} is not found in Connection.repositories. check is it in the Entity?`)
            }
        } catch (err) {
            console.log(`Connection::getRepository error: ${err}`);
        }

    }

    // getRepository<Entity>(target: EntityTarget<Entity>): Repository<Entity> {
    async initRepositories(): Promise<any> {
        try {

            console.log("getGlobalTablesObj(): ", getGlobalTablesObj());

            if (keys(getGlobalTablesObj()).length < 1) {
                throw Error(`initRepositories error: globalScope.tablesObj is null !!!`)
            }

            forOwn(getGlobalTablesObj(), async (value, key) => {
                //todo check whether the table in the databse metaDatas
                this.repositories[key] = await RepositoryFactory.create(this.options, this.connection, value.entityClass);
            });

        } catch (err) {
            console.log(`Connection::initRepositories error: ${err}`);
        }

    }

    async closeConnection() {
        try {
            if (!!this.connection) {
                await this.driver.closeConnection(this.connection);
            }
        } catch (err) {
            console.error(err);
            //todo add union Error  consturctor
            throw Error(`Connection Class 关闭 connection 失败!!!, 错误: ${err}`);
        }
    }

}
