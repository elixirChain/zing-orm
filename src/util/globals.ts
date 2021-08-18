
import { PlatformTools } from "./PlatformTools";
import { forOwn } from 'lodash';

/**
 * Gets metadata args storage.
 */
export function getGlobalTablesObj(): any {
    // we should store metadata storage in a global variable otherwise it brings too much problems
    // one of the problem is that if any entity (or any other) will be imported before consumer will call
    // useContainer method with his own container implementation, that entity will be registered in the
    // old old container (default one post probably) and consumer will his entity.
    // calling useContainer before he imports any entity (or any other) is not always convenient.
    // another reason is that when we run migrations typeorm is being called from a global package
    // and it may load entities which register decorators in typeorm of local package
    // this leads to impossibility of usage of entities in migrations and cli related operations
    const globalScope = PlatformTools.getGlobalVariable();
    if (!globalScope.tablesObj)
        globalScope.tablesObj = {};

    return globalScope.tablesObj;
}

export function findTableName(entity: any) {
    //todo add check entity, just like check parames
    let tableName = undefined;
    forOwn(getGlobalTablesObj(), (value, key) => {
        if (value.entityClass === entity) {
            tableName = key; 
        }
    });

    if (!tableName) {
        throw Error(`global tools findTableName: entity ${JSON.stringify(entity)} is not found!`);
    }
    return tableName;
}
