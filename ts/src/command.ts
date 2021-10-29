type NewType = Function;

export class Command {
    private commandMap: Map<string, NewType> = new Map();

    public putCommand(key: string, func: NewType) {
        this.commandMap.set(key, func)
    }

    public async execCommand(key: string, args: string[]): Promise<boolean> {
        if (this.commandMap.has(key)) {
            try {
                await (this.commandMap.get(key) as NewType)(args);
            } catch (e) {
                console.error(e);
            }
            return true;
        }
        return false;
    }
}