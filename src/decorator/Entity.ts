import { getGlobalTablesObj } from "../util/globals";

/**
 * Used to declare a class as a custom repository.
 * Custom repository can manage some specific entity or just be generic.
 * Custom repository optionally can extend AbstractRepository, Repository or TreeRepository.
 */

export function Table(tableName: string): any {

    //todo add check the if tableName in the database,
    //todo auto generate Entity from database
    //get all tables use
    //         SELECT
    //   *
    // FROM
    //   all_views
    // WHERE
    //   view_name like upper('kl_cms_waredict_v');

    //get table meatdatas use the extendMeta 

    if (!!getGlobalTablesObj()[tableName]) {
        throw Error(`Decorator Table name: ${tableName} 不允许重复!!! `)
    }

    return function (prototype: any) {

        getGlobalTablesObj()[tableName] = {
            entityClass: prototype,
            type: 'table',
            name: tableName,
        }
    }

}


export function View(tableName: string): any {

    if (!!getGlobalTablesObj()[tableName]) {
        throw Error(`Decorator View name: ${tableName} 不允许重复!!! `)
    }

    return function (prototype: any) {

        getGlobalTablesObj()[tableName] = {
            entityClass: prototype,
            type: 'view',
            name: tableName,
        }
    }

}

