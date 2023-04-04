const serial = require('./build/index')

async function main(){
   let result =  await serial.exec('/dev/pts/1', 115200, 'cat /etc/os-release');
   console.log(result)
}

main();
process.exit();