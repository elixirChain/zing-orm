
// child Class must use await, or will cause an Error about constructor.this   
export class AsyncConstructor {
    constructor(asyncConstructor: any) {
        const init = (async () => {
            await asyncConstructor()
            //@ts-ignore
            delete this.then
            return this
        })()
        //@ts-ignore
        this.then = init.then.bind(init)
    }
}