# node-serial-terminal

This is a package to simplify interacting with a linux terminal over a serial connection programatically. An `async` function called `exec()` can be used to write the command to the terminal over the serial interface, and waits for the command to exit, then returns the commands output.

For example:
```js
import { exec } from '@balena/node-serial-terminal'

async function main(){
    const timeout = 5*1000 // 5 second timeout
    let result = await exec('/dev/ttyUSB0', 115200, 'cat /etc/os-release', timeout)
    console.log(result)
}
```

will print something like: 
```
NAME="Ubuntu"
VERSION="20.04.2 LTS (Focal Fossa)"
ID=ubuntu
ID_LIKE=debian
PRETTY_NAME="Ubuntu 20.04.2 LTS"
VERSION_ID="20.04"
HOME_URL="https://www.ubuntu.com/"
SUPPORT_URL="https://help.ubuntu.com/"
BUG_REPORT_URL="https://bugs.launchpad.net/ubuntu/"
PRIVACY_POLICY_URL="https://www.ubuntu.com/legal/terms-and-policies/privacy-policy"
VERSION_CODENAME=focal
UBUNTU_CODENAME=focal
```

## Notes

A timeout can be set using the timeout arguement. It will reject if the timeout is exceeded. 

Currently, only a serial terminal that has no authentication is supported, as the user `root`. 
A future improvement is to allow users to specify a user and password. 
