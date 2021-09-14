
/**
 * Driver organizes TypeORM communication with specific database management system.
 */
export interface Driver {

    readonly type: any;

    readonly dirver: any;

    /**
     * Makes any action after connection (e.g. create extensions in Postgres driver).
     */
    getConnection(_options: any): Promise<any>;

    /**
    * Closes connection with database and releases all resources.
    */
    closeConnection(_connection: any): Promise<any>;

}
