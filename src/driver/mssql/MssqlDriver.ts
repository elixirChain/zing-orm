import { Driver } from '../Driver';
import { OptionsParams } from '../types/DriverParams';

export class MssqlDriver implements Driver {

    readonly type = "mssql";

    readonly dirver = require('tedious');

    async getConnection(_options: OptionsParams) {
        return new Promise((resolve, reject) => {
            // Create connection to 
            let extraOptions = !_options.extraOptions ? {} : _options.extraOptions;
            var config = {
                server: _options.host,
                authentication: {
                    type: 'default',
                    options: {
                        userName: _options.user, // update me
                        password: _options.password // update me
                    }
                },
                options: {
                    port: Number(_options.port),
                    database: _options.database,
                    ...extraOptions
                    // cryptoCredentialsDetails: {
                    //     minVersion: 'TLSv1'
                    // },
                    // useColumnNames: false
                    // rowCollectionOnRequestCompletion: true
                }
            }

            var connection = new this.dirver.Connection(config);

            // Attempt to connect and execute queries if connection goes through
            connection.on('connect', function (err) {
                if (err) {
                    connection.close();
                    console.error("获取 mssql connection 失败!!!", err);
                    reject(`获取 mssql connection 失败!!!, 错误: ${err}`);
                } else {
                    console.log("获取 mssql connection 成功.");
                    resolve(connection);
                }
            });

            connection.connect();

        })
    }

    async closeConnection(_connection: any) {
        return new Promise((resolve, reject) => {
            try {
                if (!!_connection) {
                    _connection.on('end', function (err) {
                        if (err) {
                            console.error("关闭 mssql connection 失败!!!", err);
                            reject(`关闭 mssql connection 失败!!!, 错误: ${err}`);
                        } else {
                            console.log("关闭 mssql connection 成功.");
                            resolve("关闭 mssql connection 成功.");
                        }
                    });

                    _connection.close();
                } else {
                    console.log("关闭 mssql connection 失败, connection is undefined.");
                    resolve("关闭 mssql connection 失败, connection is undefined.");
                }
            } catch (err) {
                console.error(err);
                throw Error(`mssql mssql connection 失败!!!, 错误: ${err}`)
            }
        })
    }
}