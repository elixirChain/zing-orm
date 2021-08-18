import { Driver } from '../Driver';
import { OptionsParams } from '../types/DriverParams';

export class OracleDriver implements Driver {

    readonly type = "oracle";

    readonly dirver = require('oracledb');

    async getConnection(_options: OptionsParams) {
        // Using a fixed Oracle time zone helps avoid machine and deployment differences
        process.env.ORA_SDTZ = 'UTC';
        // On Windows and macOS, you can specify the directory containing the Oracle
        // Client Libraries at runtime, or before Node.js starts.  On other platforms
        // the system library search path must always be set before Node.js is started.
        // See the node-oracledb installation documentation.
        // If the search path is not correct, you will get a DPI-1047 error.
        if (process.platform === 'win32') { // Windows
            this.dirver.initOracleClient({ libDir: 'C:\\oracle\\instantclient_19_11' });
        } else if (process.platform === 'darwin') { // macOS
            this.dirver.initOracleClient({ libDir: process.env.HOME + '/Downloads/instantclient_19_8' });
        }
        // Fetch each row as an object
        this.dirver.outFormat = this.dirver.OUT_FORMAT_OBJECT;
        //todo options 映射
        let connection: any;
        try {
            connection = await this.dirver.getConnection(_options);
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