
/**
 * Driver organizes TypeORM communication with specific database management system.
 */
export interface Repository {

    readonly connection: any;

    readonly entity: any;

    /**
     * Makes any action after connection (e.g. create extensions in Postgres driver).
     */
    executeSql(_options: any): Promise<any>;

    /**
    * Closes connection with database and releases all resources.
    */
    getPage(params: any): Promise<any>;

}
