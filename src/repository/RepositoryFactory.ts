/**
 * Factory used to create different types of repositories.
 */
import { OracleRepository } from "./oracle/OracleRepository";
import { MssqlRepository } from "./mssql/MssqlRepository";
import { Repository } from "./Repository";
import { OptionsParams, OptionsParamsSchema } from "../driver/types/DriverParams";
import { JoiUtils } from "../util/JoiUtils";

/**
 * Helps to create drivers.
 */
export class RepositoryFactory {

    /**
     * Creates a new repository.
     */
    static async create(options: OptionsParams, connection: any, entity: any): Promise<Repository> {
        let type: string;
        let repository: any;
        try {
            await JoiUtils.checkParams(OptionsParamsSchema, options);
            type = options.type;
            switch (type) {
                // case "mysql":
                //     return new MysqlDriver(connection);
                // case "postgres":
                //     return new PostgresDriver(connection);
                // case "cockroachdb":
                //     return new CockroachDriver(connection);
                // case "sap":
                //     return new SapDriver(connection);
                // case "mariadb":
                //     return new MysqlDriver(connection);
                // case "sqlite":
                //     return new SqliteDriver(connection);
                // case "better-sqlite3":
                //     return new BetterSqlite3Driver(connection);
                // case "cordova":
                //     return new CordovaDriver(connection);
                // case "nativescript":
                //     return new NativescriptDriver(connection);
                // case "react-native":
                //     return new ReactNativeDriver(connection);
                // case "sqljs":
                //     return new SqljsDriver(connection);
                case "mssql":
                    repository = await new MssqlRepository(connection, entity); break;
                case "oracle":
                    repository = await new OracleRepository(connection, entity); break;
                // case "mssql":
                //     return new SqlServerDriver(connection);
                // case "mongodb":
                //     return new MongoDriver(connection);
                // case "expo":
                //     return new ExpoDriver(connection);
                // case "aurora-data-api":
                //     return new AuroraDataApiDriver(connection);
                // case "aurora-data-api-pg":
                //     return new AuroraDataApiPostgresDriver(connection);
                // case "capacitor":
                //     return new CapacitorDriver(connection);
                default:
                    throw new Error(`${type} repository is not found!`);
            }
            return repository;
        } catch (err) {
            //todo
            console.error(`RepositoryFactory create ${type} repository 失败!!!`, err);
        }
    }

}
