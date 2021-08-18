
export class JoiUtils  {

    static async checkParams (paramsSchema: any, params: object): Promise<void> {
        let { error } = await paramsSchema.validate(params);
        if (!!error) throw Error(`参数错误,错误信息: ${error}`);
    }
    
}
