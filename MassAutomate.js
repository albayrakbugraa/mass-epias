const { Client } = require('ssh2');


// Function to execute commands on the remote server
let firstline = 0;
async function executeCommand(conn, command) {
  console.log('\ncommand:',command);
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
        if (err) {
            console.log('error:',err,'\ncommand:',command);
            reject(err);
            return;
          }
        //srcS = 'will post xml for notify sms'  
        srcS = 'xxxx'  
        stream.on('close', (code, signal) => {
                resolve(code);
                }).on('data', (data) => {
                          data = data.toString('utf8');          
                         // if ( srcS == 'xxxx' || data.indexOf(srcS)>0)
                         //    console.log(data);
                          try {             
                            if (firstline<5)
                            {
                              console.log('->Frst<-' + data);
                              firstline++;
                            }        else
                            printAsLines(data)
                          } catch (error) {
                            console.log('err data:',data)
                          }
                        }).stderr.on('data', (data) => {
                          console.log('->>>>STDERR<<<-' + data);
                        });
      });
  });
}

// SSH connection details
const sshConfigs = 
{
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

// Array of containers to process
let CmnPrm = ' --network AlaNetwork '// -e TZ=Europe/Istanbul '
CmnPrm = CmnPrm + ' --log-driver=json-file --log-opt max-size=10m --log-opt max-file=55 '
const CmnPrmLabel ='';
const containers = [
  { //// 5
    folderName: 'MassRead',
    imageName: 'local:MASS_READ',
    containerName: 'MassRead'
    ,ExParam:' -p 8976:8976 -e PORT=8976'
    ,index : 30
    ,comp:"distribution"
    ,justBuild:false
    ,doRun:true
    } 
    ];



async function ListenLogs(inContainer) {
    try {
      const conn = new Client();
  
      conn.on('ready', async () => {
        console.log('ready->SSH connection established.');
        await executeCommand(conn, `sudo docker logs -f ${inContainer}`);
      })
      conn.connect(sshConfig);
  } catch (err) {
    console.error('An error occurred:', err);
  }
}

async function startTerminal(inCompany, inContainer) {
  try {
      const conn = new Client();
      let sshConfig = sshConfigs[inCompany];

      conn.on('ready', () => {
          console.log('ready->SSH connection established.');
          conn.shell((err, stream) => {
              if (err) throw err;
              stream.on('close', () => {
                  console.log('Stream :: close');
                  conn.end();
              }).on('data', (data) => {
                  console.log('>' + data);
              });
              process.stdin.on('data', (data) => {
                  stream.write(data);
              });
              if (inContainer!='XX')
                stream.write(`sudo docker exec -it ${inContainer} /bin/bash\n`);
          });
      }).connect(sshConfig);
  } catch (err) {
      console.error('An error occurred:', err);
  }
}




async function automateDocker(inCompany, inContainerIndx) {
    try {
      const conn = new Client();
      conn.on('ready', async () => {
        console.log('ready->SSH connection established.');
        /*
        !!!
        base image with package install 
        -it will be created in a server with internet access...
        mv Dockerfile_prd_base Dockerfile
        then those images deployed to prod systems...
        codes deployed to all systems
        will create runner dockers..
        mv Dockerfile_prd_runner Dockerfile
        */

        //first need to save redis server data to disk
        await executeCommand(conn,'docker exec -it AlaRedis redis-cli bgsave')
        console.log('AlaRedis must flush data');

        //stop running container...
        for (const container of containers.filter(c => c.doRun)) {
            //ya container indexi olmayacak olsa da her halükarda monitör kapanmalı..
              if (!inContainerIndx || inContainerIndx == container.index ||  container.index == 4)
              {
                const { folderName, imageName, containerName, ExParam } = container;
                console.log(`Killing  ${folderName}`);
                await executeCommand(conn, `sudo docker kill ${containerName}`);
              }
        }

        
        // Remove to run the container's image
        for (const container of containers.filter(c => c.doRun)) {
          const { folderName, imageName, containerName, ExParam } = container;
          if (!inContainerIndx || inContainerIndx == container.index ||  container.index == 4)
          {
            console.log(`->>>>Processing ${folderName}`);
            let preCmd =  `cd BIKSS/${folderName} &&`;
            // remove the running container
            if (!container.justBuild)
            {
              await executeCommand(conn, `sudo docker rm ${containerName}`);
            }
              // Remove image
            if (!container.DontRemoveImage)
            {
              await executeCommand(conn, `sudo docker rmi ${imageName}`);
              // Build a new image in its folder with its dockerfile
              console.log(`->>>>Building ${folderName} ${imageName}`);
              let mmCmd =preCmd+`sudo docker image build  ${CmnPrmLabel} --tag  ${imageName} .`;
              console.log(mmCmd);
              await executeCommand(conn, mmCmd);
            }  

            // Run the new image
            if (!container.justBuild)
            {
              await executeCommand(conn, `sudo docker run -d  ${ExParam} ${CmnPrm}  -e BIKSS_COMPANY=${inCompany} --name ${containerName}  --rm ${imageName}`);
            }
            console.log(`Completed ${folderName}\n`);
          }
        }
        conn.end();
        console.log('Docker automation completed.');
      });
  
      conn.connect(sshConfig);
    } catch (err) {
      console.error('An error occurred:', err);
    }
  }
  
  var myArgs = process.argv.slice(2); 
  let mComp =  myArgs[2];
  let sshConfig = sshConfigs[mComp];
  if (myArgs[0]=='-a')  
  {
    // Start the automation process
    let IndxCont =  myArgs[3]
    automateDocker(mComp,IndxCont);
  } else
  if (myArgs[0]=='-l') // loglar
  {
    let mCont  =  myArgs[1];
    ListenLogs(mCont);
  } else if (myArgs[0]=='-t') /// terminal
  {
      let mCont  =  myArgs[1];
      startTerminal(mComp, mCont);
  } else
  {
    console.log('you should select at least one command like \n -a \n -l \n Container name ')
  }

  function printAsLines(data)
  {
    let lines = data.split("\n");
                            lines.forEach(line => {
                              if(  /*
                                    line.indexOf('LDAP authentication')<0 &&
                                    line.indexOf('partial finished')<0 &&
                                    line.indexOf('B/A EDAS')<0 &&
                                    line.indexOf('B/A ED')<0 &&
                                    line.indexOf('finished finished')<0 &&
                                    line.indexOf('insert finished')<0 &&
                                    line.indexOf('doPrepDashboardData started')<0 &&
                                    //line.indexOf('17_15:37')>0 &&
                                   // line.indexOf("Kesinti ETL'i tamamlandı")<0 &&
                                    line.indexOf("prc_dashboard_prep successfuly")<0 &&
                                    line.indexOf("exec finished")<0 &&
                                    //line.indexOf("->")<0 &&
                                    line.indexOf("Started")<0 &&
                                    //line.indexOf("CheckAutoSms started olen:")>0 &&
                                    //line.indexOf("2023.10.17_20:24")>0 &&
                                    line.indexOf("OutIds: []")<0 &&
                                    line.indexOf("[Object]")<0 &&
                                    line.indexOf("LDAPError")<0 &&
                                    line.indexOf("stat: 'success'")<0 &&
                                    //line.indexOf("message: 'process completed!'")<0 &&
                                    line.indexOf("}")<0 &&
                                    line.indexOf("finished")<0 &&
                                    line.indexOf("TypeName: undefined")<0 &&
                                    line.indexOf("SmsNotifyCheck")<0 &&
                                    line.indexOf("doPrepD")<0 &&
                                    line.indexOf("prc_dashboard_prep")<0 &&
                                    line.indexOf("CheckAutoSms started olen: 0")<0 &&
                                    line.indexOf("res: {")<0 &&
                                    line.indexOf("metaData: [")<0 &&
                                    line.indexOf("rows: []")<0 && */
                                    //line.indexOf("rror")>=0 && ///  
                                    1==1
                                    && line.indexOf("CheckNewSmsRequest still waiting response....")<0 
                                    && line.indexOf("not exist SmsLogs.data[obj.GUID]")<0 
                                    //&& line.indexOf("BIKS SMS Sender")>0 
                                    /*
                                    && line.indexOf("B/A EDAS")<0 
                                    && line.indexOf('"cnt_sent"')<0 
                                    && line.indexOf('[Object],')<0 
                                    && line.indexOf("OutageSent:")<0 
                                    && line.indexOf("xxxxxxxxxx")<0 
                                    && line.indexOf("Kesinti ETL'i tamamlandı")<0 
                                    && line.indexOf("CheckAutoSms started olen: 0")<0 
                                    && line.indexOf("rows: []")<0 
                                    && line.indexOf(" insert finished")<0 
                                    && line.indexOf(" partial finished")<0 
                                    && line.indexOf(" finished finished")<0 
                                    && line.indexOf("OutIds: []")<0 
                                    && line.indexOf("TypeName: undefined")<0 
                                    && line.indexOf("XMUSTERI_GRUP_KESINTILER OutageId:")<0
                                    
                                    && (
//                                      line.indexOf("Kesinti var SmsControl:")>=0 
//                                      || line.indexOf("Error logging SMS status")>=0 
                                       line.indexOf("SMS log inserted for phone:")>=0 
                                    )
                                    && line.indexOf("Redis2DbAll error")>=0 
                                    &&(
                                      line.indexOf("ek numaralara da gönderelim")>=0 || 
                                      line.indexOf("rror:")>=0 || 
                                      line.indexOf("inXml:")>=0 
                                    ) 
                                    // && line.indexOf("BIKS SMS Sender")>=0
                                    */
                                    &&  1==1
                                    && line.trim().length != 0 
                                  ) 
                                  {
                                    console.log('->',line,'<-');
                                  }
                            })
                            
  }
  // tekrar deploy
  // node MassAutomate.js -a xxxx AEDAS
  // node MassAutomate.js -a xxxx BEDAS
  // node MassAutomate.js -a xxxx CEDAS
  //loglar
  //node MassAutomate.js -l MassRead AEDAS
  //node MassAutomate.js -l MassRead CEDAS
  //node MassAutomate.js -l MassRead BEDAS
  // terminal
  //node MassAutomate.js -t MassRead CEDAS
  //node MassAutomate.js -t MassRead BEDAS
  //node MassAutomate.js -t MassRead BEDAS




