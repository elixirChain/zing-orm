import { Driver } from '../Driver';
import { OptionsParams } from '../types/DriverParams';
// import * as chalk from 'chalk';

export class ArangodbDriver implements Driver {

    readonly type = "arangodb";

    readonly dirver = require("arangojs");


    constructor() {
        // Using a fixed Oracle time zone helps avoid machine and deployment differences
        // process.env.ORA_SDTZ = 'UTC';
        // On Windows and macOS, you can specify the directory containing the Oracle
        // Client Libraries at runtime, or before Node.js starts.  On other platforms
        // the system library search path must always be set before Node.js is started.
        // See the node-oracledb installation documentation.
        // If the search path is not correct, you will get a DPI-1047 error.

        if (process.platform === 'win32') {
            // Windows
            // console.log(chalk.blueBright('[zing-orm]'), chalk.yellow('use default PATH C:\\oracle\\instantclient_19_11, you should check and install Visual Studio Redistributables.'));
        } else if (process.platform === 'darwin') {
            // macOS
        }
    }

    async getConnection(_options: OptionsParams) {
        // Fetch each row as an object
        //todo options joi check
        let connection: any;
        try {
            // connection = await this.dirver.getConnection({
            //     user: _options.user,
            //     password: _options.password,
            //     connectString: `${_options.host}:${_options.port}/${_options.database}`,
            // });

            connection = new this.dirver.Database({
                url: `http://${_options.host}:${_options.port}`,
                databaseName: _options.database,
                auth: { username: _options.user, password: _options.password },
            });

        } catch (err) {
            console.error("获取 arangodb connection 失败!!!", err);
            throw Error(`获取 arangodb connection 失败!!!, 错误: ${err}`);
        }
        // todo rewrite check connection succesful function here
        if (!!connection)
            console.log("获取 arangodb connection 成功.");
        return connection;
    }

    async closeConnection(_connection: any) {
        try {
            if (!!_connection) {
                await _connection.close();
                console.log("关闭 arangodb connection 成功.");
            }
        } catch (err) {
            console.error(err);
            throw Error(`关闭 arangodb connection 失败!!!, 错误: ${err}`)
        }
    }
}