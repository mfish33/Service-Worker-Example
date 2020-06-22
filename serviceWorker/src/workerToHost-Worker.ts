import { HostFuncRes, workerHostFuncCall, Status } from "./sharedTypes";

export default class WorkerToHost {

    private queue: workerHostFuncCall['body'][] = []
    private enqueue: Event = new Event('enqueue')
    private onSuccess: Event = new Event('onSuccess')
    private onFailure: Event = new Event('onFailure')

    public async callHostFunc(func: string, args: any[]): Promise<any> {
        this.queue.push({ func: func, args: args })
        self.dispatchEvent(this.enqueue)

        return new Promise((resolve, reject) => {
            self.addEventListener('onSuccess', (retVal) => {
                self.removeEventListener('onFailure', () => { })
                resolve(retVal.val)
            })
            self.addEventListener('onFailure', (error) => {
                self.removeEventListener('onSuccess', () => { })
                reject(error.val)
            })
        })

    }

    public onMessage(message: HostFuncRes): Promise<workerHostFuncCall> {


        if (message.body.status == Status.init) {
            // Stop double event listeners on reload
            this.queue.unshift({ func: '__echo__init', args: [] })
            self.dispatchEvent(this.enqueue)
            if (this.queue[0] && this.queue[0].func == '__echo__init') {
                this.queue.shift()
            } else {
                console.log('TRYING EVENT CONFLICT WORK AROUND')
            }
        }
        if (message.body.status == Status.success) {
            this.onSuccess['val'] = message.body.return
            self.dispatchEvent(this.onSuccess)
        }
        if (message.body.status == Status.error) {
            this.onSuccess['val'] = message.body.return
            self.dispatchEvent(this.onFailure)
        }

        return new Promise(resolve => {
            if (this.queue.length) {
                resolve({ header: 'WorkerToHost', body: this.queue.shift() })
            } else {
                self.addEventListener('enqueue', () => {
                    let test = this.queue.shift()
                    resolve({ header: 'WorkerToHost', body: test })
                }, { once: true })
            }
        })
    }


}
