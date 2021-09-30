import { Driver } from '../Driver';
import { OptionsParams } from '../types/DriverParams';
import * as chalk from 'chalk';

export class OracleDriver implements Driver {

    readonly type = "oracle";

    readonly dirver = require('oracledb');


    constructor() {
        // Using a fixed Oracle time zone helps avoid machine and deployment differences
        process.env.ORA_SDTZ = 'UTC';
        // On Windows and macOS, you can specify the directory containing the Oracle
        // Client Libraries at runtime, or before Node.js starts.  On other platforms
        // the system library search path must always be set before Node.js is started.
        // See the node-oracledb installation documentation.
        // If the search path is not correct, you will get a DPI-1047 error.

        if (process.platform === 'win32') { // Windows
            if (
                process.env.PATH.indexOf('oracle') === -1 &&
                process.env.PATH.indexOf('Oracle') === -1 &&
                process.env.PATH.indexOf('ORACLE') === -1 &&
                process.env.PATH.indexOf('instantclient') === -1 &&
                process.env.PATH.indexOf('Instantclient') === -1 &&
                process.env.PATH.indexOf('INSTANTCLIENT') === -1
            ) {

                let path = '';
                if (process.env.PATH.charAt(process.env.PATH.length - 1) !== ';') {
                    path += ';'
                }
                path += 'C:\\oracle\\instantclient_19_11;';
                process.env.PATH = process.env.PATH + path;
            }
            // this.dirver.initOracleClient({ libDir: 'C:\\oracle\\instantclient_19_11' });
            console.warn('use default PATH C:\\oracle\\instantclient_19_11, you should check and install Visual Studio Redistributables.');
        } else if (process.platform === 'darwin') { // macOS
            if (!process.env.LD_LIBRARY_PATH) {
                process.env.LD_LIBRARY_PATH = '/Downloads/instantclient_19_8';
                console.log(chalk.blueBright('[zing-orm]'),chalk.yellow('use default LD_LIBRARY_PATH /Downloads/instantclient_19_8'));
            }
            // this.dirver.initOracleClient({ libDir: process.env.HOME + '/Downloads/instantclient_19_8' });
        }
    }

    async getConnection(_options: OptionsParams) {
        // Fetch each row as an object
        this.dirver.outFormat = this.dirver.OUT_FORMAT_OBJECT;
        //todo options joi check
        let connection: any;
        try {
            connection = await this.dirver.getConnection({
                user: _options.user,
                password: _options.password,
                connectString: `${_options.host}:${_options.port}/${_options.database}`,
            });
        } catch (err) {
            console.error("获取 oracle connection 失败!!!", err);
            throw Error(`获取 oracle connection 失败!!!, 错误: ${err}`)
        }
        if (!!connection)
            console.log("获取 oracle connection 成功.");
        return connection;
    }

    async closeConnection(_connection: any) {
        try {
            if (!!_connection) {
                await _connection.close();
                console.log("关闭 oracle connection 成功.");
            }
        } catch (err) {
            console.error(err);
            throw Error(`关闭 oracle connection 失败!!!, 错误: ${err}`)
        }
    }
}