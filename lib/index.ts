import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
const Bluebird = require('bluebird');
const SUFFIX = `& wait \r`;
const DONE = '[1]+  Done';
const ERROR = '[1]+  Exit';



function parseExitCode(data: string){
    // format of final line + exit code is (e.g): "[1]+  Done(127)               catg /etc/hostname"
    const pattern = /Done\((\d+)\)/;
    const match = data.match(pattern);
    if (match) {
        return(match[1]);
    } else {
        return 0;
    }

}

function cleanOutput(stdout: string[]){
    // remove the command echo, and the output of "while"
    // the first 2 lines will always be the command, then the process ID of the command
    stdout.splice(0, 2);

    // depending on the command, the final part of the output may have the "while" Done message either on a new line, or not - so we
    // have to use regexp to remove it here
    let result = stdout.join('\n');
    const regex = /\[1\]\+  Done.*/; // regex to match "[1]+  Done" and everything after it
    result = result.replace(regex, "");    
    return result.trim()
}

async function initTerminal(serialport: SerialPort){
    // sometimes when first connecting, the terminal doesn't respond - and pressing enter unsticks it
    serialport.write(`\r`);
    // we may be presented with a login prompt - if we are, login (currently only works with root login with no password)
    let ready = false;
    await new Promise<void>(async(resolve, reject) => {
        for (let attempts=0; attempts < 10; attempts++){
            try{
                let data = serialport.read().toString()
                if(data.includes('login')){
                    serialport.write(`root\r`);
                } else if(data.includes('root@')){
                    // this signals we are logged in as root, and the terminal is ready to use - so we exit this loop
                    ready = true;
                    break
                } else {
                    serialport.write(`\r`);
                }
            }catch(e){}
            await Bluebird.delay(1000);
        }
        if(ready){
            resolve();
        }else{
            reject('Timed out while waiting for terminal to initialise!')
        }
    });
}

export async function exec(path: string, baudRate: number, command: string, timeout=10*1000): Promise<string>{
    // initiallise serial port
    const serialport = new SerialPort({ path: path, baudRate: baudRate, autoOpen: true });
    // autoOpen is enabled - now wait until the port is opened
    serialport.on('open', async function(){
        serialport.flush();
    });

    let stdout: string[] = [];

    await initTerminal(serialport);

    // Now the terminal is ready, write the command, suffixed with "& wait"
    // this will make the shell report when the command is finished, and print the exit code 
    const parser = serialport.pipe(new ReadlineParser({ delimiter: '\n' }))
    serialport.write(`${command} ${SUFFIX}`);
    
    return new Promise<string>((resolve, reject) => {
        // set up a timeout - if the command doesn't exit in time, reject the promise
        let timer = setTimeout(async () => {
            if(stdout[1] !== null){
                let pid = stdout[1].split(' ')[1];
                serialport.write(`kill -9 ${pid}\r`);
                serialport.write(`\r`);
            }
            serialport.close();
            console.log(stdout[0])
            reject(`Command timed out!`)
        }, timeout)
        parser.on('data', async(data:string) => {
            // push data into an array. We don't know when we will get it
            stdout.push(data)
            if(data.includes(DONE)){
                // command exited 
                // remove the relevant lines
                serialport.close()
                if(parseExitCode(data) === 0){
                    clearTimeout(timer);
                    resolve(cleanOutput(stdout))
                } else{
                    clearTimeout(timer);
                    reject(cleanOutput(stdout))
                }
            } else if(data.includes(ERROR)){
                clearTimeout(timer);
                serialport.close();
                reject(cleanOutput(stdout))
            }
        })
    })
}