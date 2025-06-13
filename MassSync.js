// Sync files
// node AlaSync.js CEDAS
//pass

const password = 'dE0Fw49tWo3';



const { spawn } = require('child_process');


const sshConfigs = 
{
'AEDAS':{
          host: '10.41.0.58',
          port: 22,
          username: 'oracle_bi',
          password: 'dE0Fw49tWo3',
        },
'BEDAS':{
          host: '10.41.64.56',
          port: 22,
          username: 'oracle_bi',
          password: 'dE0Fw49tWo3',
        },
'CEDAS':{
          host: '10.41.128.56',
          port: 22,
          username: 'oracle_bi',
          password: 'dE0Fw49tWo3',
        },
'AEDAS_IYS':{
          host: '10.40.128.23',
          port: 22,
          username: 'oracle_bi',
          password: 'dE0Fw49tWo3',
        },
'BEDAS_IYS':{
          host: '10.40.129.21',
          port: 22,
          username: 'oracle_bi',
          password: 'dE0Fw49tWo3',
        },
'CEDAS_IYS':{
          host: '10.40.130.22',
          port: 22,
          username: 'oracle_bi',
          password: 'dE0Fw49tWo3',
        },
'AEPSAS':{
          host: '10.40.64.40',
          port: 22,
          username: 'oracle_bi',
          password: 'dE0Fw49tWo3',
        },
'BEPSAS':{
          host: '10.40.66.40',
          port: 22,
          username: 'oracle_bi',
          password: 'dE0Fw49tWo3',
        },
'CEPSAS':{
          host: '10.40.68.40',
          port: 22,
          username: 'oracle_bi',
          password: 'dE0Fw49tWo3',
        }        
};

var myArgs = process.argv.slice(2); 
let mComp =  myArgs[0];

let CompIp =sshConfigs[mComp].host;

async function SyncFiles(DestDir,sourceDir,exclds,tag)
{
        return new Promise((res,rej)=>{
                    //DestDir ='backend';
                    //const sourceDir = './dataserver/';
                    console.log(`${mComp} sync started ${DestDir}`);
                    const destinationDir = `oracle_bi@${CompIp}:${DestDir}/`;
                    //const exclds ='--exclude=node_modules';
                    /*
                    rsync -avz -e /usr/local/bin/sshpass -p 'dE0Fw49tWo3' ssh ./st_tuketim_ws/ oracle_bi@10.41.64.56:BIKSS/st_tuketim_ws/
                    rsync -avz  --exclude=node_modules  -e "sshpass -p 'dE0Fw49tWo3' ssh" ./st_tuketim_ws/ oracle_bi@10.41.64.56:BIKSS/st_tuketim_ws/
                    rsync -avz  --exclude=node_modules  -e "sshpass -p 'dE0Fw49tWo3' ssh" ./st_tuketim_ws/ oracle_bi@10.41.0.58:BIKSS/st_tuketim_ws/
                    vi ~/.ssh/config
                    */

                    const options = ['-avz', '-e', `/usr/local/bin/sshpass -p '${password}' ssh`, sourceDir, destinationDir];
                    console.log('options',options);
                    exclds.forEach(itm => {
                        options.push(itm)
                    });
                    const rsyncProcess = spawn('rsync', options);
                    rsyncProcess.stdout.on('data', (data) => {
                        console.log(`${mComp} ${tag}->${data}`); 
                    });
                    rsyncProcess.stderr.on('data', (data) => {
                        console.error(`${mComp} stderr: ${data}`);
                        rej('stderr:',data);
                    });
                    rsyncProcess.on('error', (err) => {
                        console.error(`${mComp} error: ${err.message}`);
                        rej(`error: ${err.message}`);
                    });
                    rsyncProcess.on('close', (code) => {
                        console.log(`${mComp} ${tag} code ${code} DONE`);
                        console.log(`${mComp} sync done${DestDir}`);
                        res('done')
                    });
                    console.log(`${mComp} sync end ${DestDir}`);
        })
}

async function main ()
{
    console.log('mComp:',mComp,' started..')
    await SyncFiles('BIKSS/MassRead/','./MassRead/',['--exclude=node_modules','--exclude=storage'],'@mass_read');
    console.log('mComp:',mComp,' Done')
}
main();