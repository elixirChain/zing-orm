import { OracleDriver } from "./oracle/OracleDriver";
import { MssqlDriver } from "./mssql/MssqlDriver";
import { ArangodbDriver } from "./arangodb/ArangodbDriver";
import { Driver } from "./Driver";
import { OptionsParams, OptionsParamsSchema } from "./types/DriverParams";
import { JoiUtils } from "../util/JoiUtils";

/**
 * Helps to create drivers.
 */
export class DriverFactory {

    /**
     * Creates a new driver depend on a given connection's driver type.
     */
    static async create(options: OptionsParams): Promise<Driver> {
        let type: string;
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
                    return new MssqlDriver();
                case "oracle":
                    return new OracleDriver();
                case "arangodb":
                    return new ArangodbDriver();
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
                    throw new Error(`${type} driver is not found!`);
            }
        } catch (err) {
            //todo
            console.error(`DriverFactory create ${type} driver 失败!!!`, err);
        }
    }

}
