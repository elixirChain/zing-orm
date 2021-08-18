// import { Repository } from "../repository/Repository";
import { Driver } from '../driver/Driver';
import { DriverFactory } from '../driver/DriverFactory';
import { RepositoryFactory } from '../repository/RepositoryFactory';
import { JoiUtils } from '../util/JoiUtils';
import { AsyncConstructor } from '../util/AsyncConstructor';
import { OptionsParams, OptionsParamsSchema } from '../driver/types/DriverParams';
import { findTableName } from "../util/globals";

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

    // getRepository<Entity>(target: EntityTarget<Entity>): Repository<Entity> {
    async getRepository(target: any): Promise<any> {
        try {
            // check target -> key: name, if not in <globalScope.tablesObj>, exit
            let tableName = findTableName(target);
            // if allready have, direct return 
            if (!!this.repositories[tableName]) {
                return this.repositories[tableName];
            } else {
                // if repository was not found then create it, store its instance and return it
                const newRepository = await RepositoryFactory.create(this.options, this.connection, target);
                this.repositories[tableName] = newRepository;
                return newRepository;
            }
        } catch (err) {
            console.log(`Connection::getRepository error: ${err}`);
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
