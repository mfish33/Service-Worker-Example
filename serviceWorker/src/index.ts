import PromiseWorkerType from 'promise-worker'
const PromiseWorker = require('promise-worker')
import WorkerToHost from './workerToHost-Host'
const workerToHost = new WorkerToHost()

let Pworker: Promise<PromiseWorkerType> = navigator.serviceWorker
    .register('sw.js', { scope: '/' })
    .then(waitForServiceWorkerActivation)
    .then(worker => {
        let PW = new PromiseWorker(worker as any)
        workerToHost.registerServiceWorker(PW)
        return PW
    })
    .catch(e => console.error('There was an error registering the Service Worker please restart the app', e))


async function waitForServiceWorkerActivation(registration: ServiceWorkerRegistration): Promise<ServiceWorkerContainer> {
    if (navigator.serviceWorker.controller) { // already active and controlling this page
        return navigator.serviceWorker;
    }
    return new Promise(resolve => {
        registration.addEventListener('updatefound', () => {
            let newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state == 'activated' && navigator.serviceWorker.controller) {
                    resolve(navigator.serviceWorker);
                }
            });
        });
    });
}

workerToHost.registerFunc(() => 'Hello from the mainThread', 'test')