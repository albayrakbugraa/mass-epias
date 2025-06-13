//Libs/AlaSmsLib.js
const AlaConst = require('./webconsts.js')
const consts = require('./webconsts.js')



const axios = require('axios');
const redis = require('redis');
const https = require('https');


var mLib = require('./Ala00Lib.js');
mLib.Owner = 'BIKS SMSLib';
const xml2js = require('xml2js');
const { v4: uuidv4 } = require('uuid');
//let GsmSample= AlaConst.testNumbersShort
let GsmSample= AlaConst.testNumbersLong
//testNumbersLong;// testNumbersShort;

const SPPER_IDs =[
{spid:'5856770000',perid :'4599220100'},
{spid:'5272310000',perid :'8351760100'},
{spid:'3195880000',perid :'2094150100'},
{spid:'6189480000',perid :'7833760100'},
{spid:'2423200000',perid :'1045560100'},
{spid:'9805560000',perid :'7943390100'},
{spid:'1768030000',perid :'4771560100'},
{spid:'0796580000',perid :'9905040100'},
{spid:'5297250000',perid :'5551870100'},
{spid:'0444400000',perid :'9163190100'}
]

const httpsAgent = new https.Agent({
    rejectUnauthorized: false // Sertifika doğrulamasını devre dışı bırak
  });
PerSampleIndx = 0;
GsmSampleIndx = 0;

const res = 4;
const mDelta = 0; //
/*
0becf019-03b7 
SMS_TO_BE_SENT_AT: 1692861357090
24 ağustos 10:18
*/
const mDeltaX = (3 * 60 * 60*1000 ); // three hours 
let currentTimestamp = Date.now()+mDeltaX;
let ListDef = [
                {   len:144 / res
                    ,inc:res*10 * 60 * 1000      // Calculate the timestamp for each 10-minute interval
                    ,desc:'Day'
                    ,starts: 24 * 60 * 60 * 1000 + mDeltaX // Calculate timestamp for 24 hours ago
                },
                {   len:168 / res
                    ,inc:res*60 * 60 * 1000      // Calculate the timestamp for each 1-hour interval
                    ,desc:'Week'
                    ,starts: 7 * 24 * 60 * 60 * 1000 + mDeltaX // Calculate timestamp for 1 week ago
                },
                {   len:126/res
                    ,inc:res*6 * 60 * 60 * 1000  // Calculate the timestamp for each 6-hour interval
                    ,desc:'Month'
                    ,starts:    32 * 24 * 60 * 60 * 1000  + mDeltaX// Calculate timestamp for 1 month ago
                },
                {   len:180/res
                    ,inc:res*24 * 60 * 60 * 1000 // Calculate the timestamp for each 1-day interval
                    ,desc:'Month6'
                    ,starts:6 * 30 * 24 * 60 * 60 * 1000  + mDeltaX// Calculate timestamp for 6 months ago
                },
                {   len:366/res
                    ,inc:res*24 * 60 * 60 * 1000 // Calculate the timestamp for each 1-day interval
                    ,desc:'Year'
                    ,starts:366 * 24 * 60 * 60 * 1000 + 2*mDelta// Calculate timestamp for 1 year ago
                }
                ,
                {   len:366/res
                    ,inc:res*7*24 * 60 * 60 * 1000 // Calculate the timestamp for each 1-day interval
                    ,desc:'All'
                    ,starts:366 * 24 * 60 * 60 * 1000 + 2*mDelta// Calculate timestamp for 1 year ago
                }
            ]


            const tempObj =  {
                cnt6 : 0,
                cnt24 : 0,
                cnt36 : 0,
                sentAt6: [],
                sentAt24: [],
                sentAt36: [],
                Call:{
                    cnt6 : 0,
                    cnt24 : 0,
                    cnt36 : 0,
                    sentAt6: [],
                    sentAt24: [],
                    sentAt36: [],
                    CBS_TM_NO :{},
                },
                Auto:{
                    cnt6 : 0,
                    cnt24 : 0,
                    cnt36 : 0,
                    sentAt6: [],
                    sentAt24: [],
                    sentAt36: [],
                    CBS_TM_NO :{},
                },
                Man:{
                    cnt6 : 0,
                    cnt24 : 0,
                    cnt36 : 0,
                    sentAt6: [],
                    sentAt24: [],
                    sentAt36: [],
                    CBS_TM_NO :{},
                    },
                smspacks:{},
                outages : {},
                CBS_TM_NO :{},
                
            }     
                        
var self = module.exports = {

GiveMeANumber : ()=>{
    GsmSampleIndx++;
    if (GsmSampleIndx==GsmSample.length)
    {
        GsmSampleIndx = 0;
    }
    return GsmSample[GsmSampleIndx];
}
,formatDateToCrmDateCCB: (inTimeStmp) => {
    const dateStr = inTimeStmp || new Date();
    const date = new Date(dateStr);

    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');

    // Zaman dilimini eklemek için UTC formatında ISO 8601 uyumlu hale getirin
    const formattedDateStr = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
    return formattedDateStr;
},
GiveMePerSp : ()=>{
    PerSampleIndx++;
    if (PerSampleIndx==SPPER_IDs.length)
    {
        PerSampleIndx = 0;
    }
    return SPPER_IDs[PerSampleIndx];
},
formatDateToCrmDate:(inTimeStmp)=>
{
    const dateStr = inTimeStmp?inTimeStmp:new Date();
    const date = new Date(dateStr);

    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');

    const formattedDateStr = `${year}-${month}-${day}-${hours}.${minutes}.${seconds}`;
    return formattedDateStr;
}
,formatDateToCrmDateCCB: (inTimeStmp) => {
    const dateStr = inTimeStmp || new Date();
    const date = new Date(dateStr);

    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');

    // Zaman dilimini eklemek için UTC formatında ISO 8601 uyumlu hale getirin
    const formattedDateStr = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
    return formattedDateStr;
}
,PrepSendSmsXmlTest : async (otp)=>{

    let TmpBody =     ''
    let TmpListItem = ''
    if (otp)
    {
        TmpBody = await mLib.LoadFile('./templates/temp_sms_send_body_otp.xml')
    } else
    {
        TmpBody =     await mLib.LoadFile('./templates/temp_sms_send_body.xml')
        TmpListItem = await mLib.LoadFile('./templates/temp_sms_send_list.xml')
    }
   

    return new Promise ((resolve,reject)=>{
        try {
                let TmpList ='';
                for (let index = 0; index < 4; index++) {
                    //türkçe karakter olmamalı
                    TmpList+=TmpListItem.replace('%TEL%',self.GiveMeANumber()).replace('%MSG%','-TEST02-'+self.GiveMeANumber()+' no lu hizmet noktaniz '+mLib.SayTimeSimp()+'bolgesinde elektrik kesintisi yasanmis olup ve enerji verilmesi icin calismalar baslamistir.');
                }
                

                TmpBody = TmpBody.replace('%LIST%',TmpList).replace('%GUID%',uuidv4());

                resolve(TmpBody)
        } catch (error) {
                reject(error);
        }

    })
},
PrepSendSmsXml : async (inList,inConf)=>{

    let otp  = inConf.otp;
    let TmpBody =     ''
    let TmpListItem = ''
    if (otp)
    {
        TmpBody = await mLib.LoadFile('./templates/temp_sms_send_body_otp.xml')
    } else
    {
        TmpBody =     await mLib.LoadFile('./templates/temp_sms_send_body.xml')
        TmpListItem = await mLib.LoadFile('./templates/temp_sms_send_list.xml')
    }
   

    return new Promise ((resolve,reject)=>{
        try {
                if (otp)
                {
                    let mTel = inList[0].gsm;// TODO CALLER_CONTACT
                    let mMsg = inList[0].SMSCONTENT;
                    TmpBody = TmpBody
                                .replace('%GUID%',uuidv4())
                                .replace('%ORIGIN%',inConf.origin)
                                .replace('%TEL%',mTel)
                                .replace('%MSG%',mMsg);
                    resolve(TmpBody)
                    return;
                }
                let TmpList ='';
                for (let index = 0; index < inList.length; index++) {
                    //türkçe karakter olmamalı
                    //let mTel = self.GiveMeANumber();//test zamanı böyle canlıda
                    let mTel = inList[index].gsm;// TODO CALLER_CONTACT
                    let mMsg = inList[index].SMSCONTENT;
                    TmpList+=TmpListItem.replace('%TEL%',mTel).replace('%MSG%',mMsg);
                }
                TmpBody = TmpBody
                                .replace('%LIST%',TmpList)
                                .replace('%GUID%',uuidv4())
                                .replace('%ORIGIN%',inConf.origin);
                resolve(TmpBody)
                return;
        } catch (error) {
                reject(error);
        }
    })
},
SendInfoToAdmins : async(inMsg,inConf)=>
{
    //get numbers....
    let mList = [
        {gsm:'5436773931',SMSCONTENT:self.turkishToAscii(inMsg)},//KO
        {gsm:'5498395010',SMSCONTENT:self.turkishToAscii(inMsg)},//resul baysu
        {gsm:'5350749253',SMSCONTENT:self.turkishToAscii(inMsg)},//zafer güldan
        {gsm:'5070681121',SMSCONTENT:self.turkishToAscii(inMsg)},//özgür dertli
    ]
    let mPack = await self.PrepSendSmsXml(mList,inConf);
    let XmlFromProvider = await self.postXml(mPack,inConf)
     mLib.log('SendInfoToAdmins inMsg:',inMsg)
     return 0;
},
SendToUser : async(inPhone,inMsg,inConf)=>
{
    //get numbers....
    let mList = [
        {gsm:inPhone,SMSCONTENT:self.turkishToAscii(inMsg)},//KO
    ]
    let mPack = await self.PrepSendSmsXml(mList,inConf);
    let XmlFromProvider = await self.postXml(mPack,inConf)
    mLib.log('XmlFromProvider:',XmlFromProvider)
    return 0;
},
turkishToAscii:(str) =>{
    const map = {
        'ç': 'c',
        'ğ': 'g',
        'ı': 'i',
        'ö': 'o',
        'ş': 's',
        'ü': 'u',
        'Ç': 'C',
        'Ğ': 'G',
        'İ': 'I',
        'Ö': 'O',
        'Ş': 'S',
        'Ü': 'U'
    };

    return str.replace(/[çğıöşüÇĞİÖŞÜ]/g, match => map[match] || match);
},
PrepStatusSmsXml : async (inItem)=>{

    let TmpBody = await mLib.LoadFile('./templates/temp_sms_status_body.xml')
    return TmpBody.replace('%GUID%',uuidv4())
                     .replace('%TEL%',inItem.CALLER_CONTACT)
                     .replace('%TransactionId%',inItem.TransactionId)
},
PrepStatusSmsXmlBulk : async (inItemList)=>{

    let TmpBody = await mLib.LoadFile('./templates/temp_sms_status_bulk_body.xml')
    TmpBody = TmpBody.replace('%GUID%',uuidv4());
   
    let details = '';

    for (let key in inItemList)     {
        details = details +'\n'+'<ebs:string>'+key+'</ebs:string>';
    }
    if (details=='')
        return 'ERROR'
    else
        return TmpBody.replace('%DETAILS%',details);
},
SendSmsFull : async ()=>{

    try {
        let TmpBody = await self.PrepSendSmsXml();
        //await mLib.SaveFile('temp_PackSnd.xml', TmpBody);  
        //SendSMSNtoN
        TmpBody =await postXml(TmpBody)
        //await mLib.SaveFile('temp_PackRcv.xml', TmpBody);  
        let StatKeys = await self.parseXmlSendSmsRcv(TmpBody);
        StatKeys.forEach(async item =>{
            let mXml = await self.PrepStatusSmsXml(item)
            mLib.log('mXml:',mXml)
            //RetrieveSMSStatus
            let RcvStat =  await self.postXml(mXml)
            mLib.log('RcvStat:',RcvStat)
        })

        return true;        
    } catch (error) {
        mLib.log('error:',error)
        return false;
    }
},
StatusSms : async ()=>{

    try {
        let TmpBody=  await mLib.LoadFile('../templates/temp_PackRcv.xml');  
        let StatKeys = await self.parseXmlSendSmsRcv(TmpBody);
        //StatKeys.forEach(async key =>{
        for (let key in StatKeys)     {
            let item = StatKeys[key];
            let mXml = await PrepStatusSmsXml(item)
            //RetrieveSMSStatus
            let RcvStatXml =  await postXml(mXml)
            let mStat = {}
             mStat.STATUS  = mLib.getStringBetween(RcvStatXml, '<com:Status>', '</com:Status>')
             mLib.log('mStat:',mStat);
             StatKeys[item.gsm].STATUS = mStat.STATUS; 
             StatKeys[item.gsm].Date = mLib.SayTime();
             StatKeys[item.gsm].DateStmp = new Date();
        }
        mLib.log('StatKeys:',StatKeys);
        return true;        
    } catch (error) {
        mLib.log('error:',error)
        return false;
    }
    finally {
        return true;
      }
},
//SendSmsFull();
main : function () {
    
    self.StatusSms();
    console.log('<----')
    let mUid = uuidv4();
    mLib.log('mUid:',mUid,' mUid.length:',mUid.length);
},
checkNumber:function (inPhone,inAccNo,inList)
{
    //black llist and other controls will be here
    return true;
},
// direk xml içerisinde bilgiler var onu kullanıyoz
postXml : async function (inXml,inConf,inCredential) 
{
    let mUrl ='';
    if (inConf.mUrl)
      mUrl = inConf.mUrl;
    else
      mUrl = inConf;
    // mLib.log('mUrl:',mUrl)  
    // Send the SOAP request using axios
    let mHeader =  {
        'Content-Type': 'text/xml'
    };
    if (inCredential)
    {
        const base64Credentials = Buffer.from(`${inCredential.UserId}:${inCredential.UserPass}`).toString('base64');
        mHeader['Authorization'] = `Basic ${base64Credentials}`;
        console.log(mHeader);
    }

    return new Promise ((resolve,reject)=>{
                    axios.post(mUrl, inXml, {
                        headers: mHeader,
                        httpsAgent:inCredential?httpsAgent:null
                    })
                    .then(response => {
                             resolve(response.data)      
                             self.RespErrorCheck(response.data) 
                                .then(resp=>{
                                               // mLib.log('postXml success');
                                                resolve(resp)
                                            }
                                            )
                                .catch(err=>{mLib.log('postXml err:',err);reject(err);})
                    })
                    .catch(error => {
                        mLib.log('postXml error:',error ,'\n mUrl:',mUrl,'\n inXml:', inXml);
                        reject(error);
                    });
        });

},
parseXmlToArraySendSms : (inXml) =>
{
    var parser = new xml2js.Parser();
    parser.parseString(inXml, function (err, result) {
        //let numbers = 
        
        let msgs = result['soap:Envelope']['soap:Body'][0]['ebs:EbsSendSMSNtoNRequest'][0]['ebs:RequestBody'][0]['com:SMSList'][0]['com:SMS']
        mLib.log('msgs:',msgs)
        let mobjects = [];
        msgs.forEach(element => {
            mLib.log('element:',element['com:Number'][0])
            mLib.log('element:',element['com:Message'][0])
            mNum = element['com:Number'][0]
            mMes = element['com:Message'][0]
            let titm = { gsm: mNum, msg: mMes  };
            mLib.log('titm:',titm);
            mobjects.push(titm);
            //mLib.log('mobjects:',mobjects );
        }); 
        //mLibdir('mobjects:',mobjects );
        //mLib.log('Done');
    });
    return;
},
parseXmlSendSmsRcv  : (inXml) =>
{
    return new Promise ((resolve,reject)=>{

    var parser = new xml2js.Parser();
                parser.parseString(inXml, function (err, result) {
                    let msgs = result['soap:Envelope']['soap:Body'][0]['ns2:EbsSendSMSNtoNResponse'][0]['ns2:ResponseBody'][0]['com:SMSList'][0]['com:SMS']
                    let mobjects = [];
                    let mIndex = 0;
                    msgs.forEach(element => {
                        mNum = element['com:Number'][0]
                        mMes = element['com:TransactionId'][0]
                        let titm = { gsm: mNum, TransactionId: mMes  };
                        titm.index = mIndex;
                        mIndex++;
                        mobjects.push(titm);
                    }); 
                   // mLib.log('mobjects:',mobjects );
                   // mLib.log('Done');
                    resolve(mobjects);
                });
    })
},
parseXmlBlukStatus: (inXml) =>
{

    // your XML data
    const xml = inXml; // your XML data here
    return new Promise ((resolve,reject)=>{
    const parser = new xml2js.Parser({ 
        tagNameProcessors: [xml2js.processors.stripPrefix], // remove namespace prefixes
        explicitArray: false, // don't put single nodes into array
    });
    
    parser.parseString(xml, function (err, result) {
        if (err) {
            console.error('Error occurred: ', err);
            reject(err);
        } else {
            // Extract the array of StatusQueryResponse objects
            const statusQueryResponses = result.Envelope.Body.EbsGetStatusBulkResponse.ResponseBody.GetStatusBulkResult.DataObject.StatusQueryResponse;
            resolve(statusQueryResponses)
            /*
                 <ns2:StatusQueryResponse>
                     <ns2:ErrorCode>0</ns2:ErrorCode>
                     <ns2:ErrorDescription/>
                     <ns2:FaultCode>0</ns2:FaultCode>
                     <ns2:Status>3</ns2:Status>
                     <ns2:Success>true</ns2:Success>
                     <ns2:Target>5336230269</ns2:Target>
                     <ns2:TransactionId>01CEB249-49C3-47FB-833E-29FB0711369F</ns2:TransactionId>
                  </ns2:StatusQueryResponse>
            */
        }
    });
    });
    
},
parseXmlCrmResp: (inXml) =>
{

    // your XML data
    const xml = inXml; // your XML data here
    return new Promise ((resolve,reject)=>{
        xml2js.parseString(xml, { explicitArray: false, ignoreAttrs: true, tagNameProcessors: [xml2js.processors.stripPrefix] }, function (err, result) {
            if (err) {
                console.error(err);
                reject(err)
            } else {
                //console.log('result:',result.Envelope.Body.EbsCreateCustomerContactResponse);
                const response = result.Envelope.Body.EbsCreateCustomerContactResponse.ResponseBody;
                //console.log('response:',response);
            const contactLists = Array.isArray(response.CreateCustomerContact) 
                ? response.CreateCustomerContact.map(contact => contact.CustomerContactList)
                : [response.CreateCustomerContact.CustomerContactList];
              resolve(contactLists); 
            }
      });
    });
},
parseXmlCrmRespEx: (inXml) =>
{

    // your XML data
    const xml = inXml; // your XML data here
    return new Promise ((resolve,reject)=>{
        xml2js.parseString(xml, { explicitArray: false, ignoreAttrs: true, tagNameProcessors: [xml2js.processors.stripPrefix] }, function (err, result) {
            if (err) {
                console.error(err);
                reject(err)
            } else {
                console.log('result:',result.Envelope.Body.EbsCreateCustomerContactResponse);
                const response = result.Envelope.Body.EbsCreateCustomerContactResponse.ResponseBody;
                console.log('response:',response);
            const contactLists = Array.isArray(response.CreateCustomerContact) 
                ? response.CreateCustomerContact.map(contact => contact.CustomerContactList)
                : [response.CreateCustomerContact.CustomerContactList];
              resolve(contactLists); 
            }
      });
    });
},
ParseRcv  : async ()=>{

    let TmpBody = await mLib.LoadFile('../templates/tempPackRcv.xml')
    self.parseXmlSendSmsRcv(TmpBody);
},
RespErrorCheck  : async function (mData)
{
    return new Promise ((resolve,reject)=>{
                            HataVar = true;
                            if (mData.indexOf("Failed to parse XML text")>-1)
                            {
                                mLib.log("sms Could not post ParseError")
                                mLib.log("header:",mRes.headers)
                                mLib.log("cOptions:",cOptions)
                                mLib.SaveFile('../templates/inXml'+mLib.SayTimeSimp()+'.xml',inXml)
                                .then (result => {
                                    mLib.log("ParseError");
                                    reject('ParseError')
                                })
                            } else
                            if (mData.indexOf("MessageBlocked")>-1)
                            {
                                mLib.log("sms Could not post MessageBlocked")
                                mLib.log("Message Blocked",mData);
                                reject('MessageBlocked')
                            } else
                            if (mData.indexOf("Validation Failed")>-1)
                            {
                                mLib.log("sms Could not post Validation Failed")
                                mLib.log("Message Blocked",mData);
                                reject('ValidationFailed')
                            } else
                            if (mData==="Access Denied")
                            {
                                mLib.log("sms Could not post Access Denied")
                                mLib.log("error",mData);
                                reject('AccessDenied')
                            } else
                            if (mData.indexOf("FaultResponse")>-1)
                            {
                                mLib.log("sms Could not post FaultResponse")
                                mLib.log("error",mData);
                                reject('FaultResponse')
                            } else
                            {
                                resolve(mData);
                            }
                        })   
},
CreateRedisClient : (isLocal,inprocess) =>
{
    let rUrl = ''
    if (isLocal)
        rUrl= AlaConst.rds.UrlLocal;
     else
        rUrl= AlaConst.rds.UrlDocker;

    let mRdsClient = redis.createClient({url: rUrl});
    mRdsClient.on('error', err => {
        console.log('Redis Client Error', err,'\n rUrl:',rUrl);
        inprocess.send({
            stat:'error',
            code:'004', // Hata kodunu değiştirdim çünkü 003 zaten kullanılmış.
            desc:'Redis Client Error',
            message:err
        });
        inprocess.exit(1);
    });
    return mRdsClient;
},
RedisGetOrCreateKey : async (inClient,inKey,inTemp)=>{
    
    let val =  await inClient.get(inKey);
    if(!val)
    {
        val = inTemp;
        await inClient.set(inKey,JSON.stringify(val));    }
    else
        val = JSON.parse(val);
    return val;
},
///function about dashboard and reporting....
ReportPack : {},
DateListFill:()=>
{

    self.ReportPack.Graph = {};
    self.ReportPack.Cons = {Today:{},ThisMonth:{},ThisYear:{},AllTime:{}}
    //mLib.log('currentTimestamp:',currentTimestamp);
    
    for (let i = 0; i < ListDef.length; i++) {
        const itm = ListDef[i];
        ListDef[i].DateStr = currentTimestamp-ListDef[i].starts;
        self.ReportPack.Graph[itm.desc] = {};
        for (let j = 0; j < itm.len; j++)
             {
                let obj = {}
                obj.date = new Date(currentTimestamp - (j) * itm.inc);
                obj.dateLnx = currentTimestamp - (j) * itm.inc;
                obj.datelocal = obj.date.toLocaleString();
                obj.stat  = {cnt:0};
                obj.cnt_pkg= 0;
                self.ReportPack.Graph[itm.desc][j]=obj;
             }      
    }
},
mergeObjects : (obj1, obj2) =>{
    const mergedObj = { ...obj1 }; // Create a new object as a copy of obj1
  
    for (let key in obj2) {
      if (obj2.hasOwnProperty(key) && typeof obj2[key] === 'object' && !Array.isArray(obj2[key])) {
        if (!mergedObj.hasOwnProperty(key)) {
          mergedObj[key] = obj2[key];
        } else {
          mergedObj[key] = self.mergeObjects(mergedObj[key], obj2[key]);
        }
      } else {
        if (mergedObj.hasOwnProperty(key) && typeof mergedObj[key] === 'number' && obj2.hasOwnProperty(key) && typeof obj2[key] === 'number') {
          mergedObj[key] += obj2[key];
        } else {
          mergedObj[key] = obj2[key];
        }
      }
    }
    return mergedObj;
  },
ConsInsert : (inObj,inDate)=>
  {
      let now = new Date();
      let objDate = new Date(inDate);
        
      if (objDate.getDate() === now.getDate() &&  objDate.getMonth() === now.getMonth() && objDate.getFullYear() === now.getFullYear())
        self.ReportPack.Cons.Today = self.mergeObjects(self.ReportPack.Cons.Today,inObj)
      if (objDate.getMonth() === now.getMonth() && objDate.getFullYear() === now.getFullYear())
        self.ReportPack.Cons.ThisMonth = self.mergeObjects(self.ReportPack.Cons.ThisMonth,inObj)
      if (objDate.getFullYear() === now.getFullYear())
        self.ReportPack.Cons.ThisYear = self.mergeObjects(self.ReportPack.Cons.ThisYear,inObj)
      self.ReportPack.Cons.AllTime = self.mergeObjects(self.ReportPack.Cons.AllTime,inObj)
  }  ,
GetIlIlceIsletme: (obj, path = [], paths = []) => // to get il ilçe işletme 
{
    let HowDeep = 5;
    for (let key in obj) {
        if (obj.hasOwnProperty(key) && key !== 'cnt' && key !== 'cnt_sent' && key !== 'cnt_blocked' && key !== 'cnt_delivered' && key !== 'cnt_crm') {
            let newPath = path.concat(key);
            if (newPath.length === HowDeep) {
                paths.push(newPath);
                //paths.push(newPath.join('/'));
            }
            self.GetIlIlceIsletme(obj[key], newPath, paths);
        }
    }
    return paths;
},
PrepStatObj : (inObj)=>
{
    let statval = {
        cnt_sent:      inObj.statics.cnt_sent?inObj.statics.cnt_sent:0  ,
        cnt_blocked:   inObj.statics.cnt_blocked?inObj.statics.cnt_blocked:0  ,
        cnt_delivered: inObj.statics.cnt_delivered?inObj.statics.cnt_delivered:0  ,
        cnt_crm:       inObj.statics.cnt_crm?inObj.statics.cnt_crm:0
    }
    let stat ={...statval};
    //Gönderim tipi bildirimsiz SMS ilk tipimiz..
    let SmsType = inObj.SmsType?inObj.SmsType:'BszSms';
    stat[SmsType]={...statval};
    //otomatik manuel gönderim şekli 
    stat[SmsType][inObj.SendMethod] = inObj.statics;
    return stat;
},
DateListInsert: (stat,inDate)=>
{
    let mNow = new Date();
    //insert to day mon week
    for (let i = 0; i < ListDef.length; i++) {
        const itm = ListDef[i];
        if (inDate>= itm.DateStr)
        {
            //console.log('itm.desc:',itm.desc,' len:',itm.len, ' inc:',itm.inc);
            let ddif = mNow - inDate;
            //console.log('inDate:',inDate,' itm.DateStr:',itm.DateStr, 'ddif:',ddif,' dday:',dday)
            let index = 0;
            try {                
                index = Math.floor((ddif) / itm.inc); // Calculate the index based on 10-minute resolution
                if (self.ReportPack.Graph[itm.desc][index])
                {
                    let oObj = self.ReportPack.Graph[itm.desc][index].stat;
                    self.ReportPack.Graph[itm.desc][index].cnt_pkg++;
                    let ooObj = self.mergeObjects(oObj, stat) 
                    self.ReportPack.Graph[itm.desc][index].stat = ooObj;
                }
            } catch (error) {
                mLib.log('DateListInsert i:',i,' \ninDate:',inDate,'\nitm:',itm,' \nerror:',error,'\nindex:',index)
            }
           // console.log('ReportPack.Graph[itm.desc][index]:',ReportPack.Graph[itm.desc][index]);
        }
    }
    return self.ReportPack;
},

DateListInsertAll:async (inRedisClient)=>
{
    //init ReportPack reset cards data and fill graph data 
    self.DateListFill();

    //logları listeleyelim
    let allkeys = await inRedisClient.keys(AlaConst.rds.SmsLogs+'*')
    
    //console.log('allkeys:',allkeys);
    for (let i = 0; i < allkeys.length; i++) {
        let key = allkeys[i];

        let val = JSON.parse(await inRedisClient.get(key));
        if (val && val.header)
        {
            let stat = self.PrepStatObj(val.header);
            //loglar graphic datalarına belli tarih aralıklarına göre ekleniyor
            self.DateListInsert(stat,val.header.SMS_TO_BE_SENT_AT+mDelta)
            //bugün bu ay bu yıll ve all için özet datalar oluşturuluyor..
            self.ConsInsert(stat,val.header.SMS_TO_BE_SENT_AT+mDelta)
        }
    }
    
    //şimdi eskilerin headerin dan alalım
    let mLogHeaders = await inRedisClient.get(AlaConst.rds.SmsLogHeaders)
    if (!mLogHeaders)
        mLogHeaders = {}
    else
        mLogHeaders = JSON.parse(mLogHeaders);
    for (let mKey in mLogHeaders)
     {
        val = mLogHeaders[mKey];
        let stat = self.PrepStatObj(val);
        self.DateListInsert(stat,val.SMS_TO_BE_SENT_AT+mDelta)
        self.ConsInsert(stat,val.SMS_TO_BE_SENT_AT+mDelta)
     }

    self.ReportPack.GrpIlIlceIsl = self.GetIlIlceIsletme(self.ReportPack.Cons.AllTime);

}

,CheckDate :  function (inObj,inNow)
{
//        mLib.log('CheckDate inObj:',inObj)
        const mHour = 1000*60*60;
        if (inObj.sentAt6)
        while (inObj.sentAt6.length > 0 && inNow - inObj.sentAt6[0] >= mHour*6)  // 36 saat 1000*60*60*24
            {
                inObj.sentAt6.shift();
                inObj.cnt6--;
            }
        while (inObj.sentAt24.length > 0 && inNow - inObj.sentAt24[0] >= mHour*24)  // 24 saat *24
            {
                inObj.sentAt24.shift();
                inObj.cnt24--;
            }
        while (inObj.sentAt36.length > 0 && inNow - inObj.sentAt36[0] >= mHour*36)  // 36 saat 1000*60*60*24
            {
                inObj.sentAt36.shift();
                inObj.cnt36--;
            }
}
,AddDate : function (inObj,inDate)
{
    //24 saatlik kontrol
    inObj.sentAt24.push(inDate)
    inObj.cnt24++;
    //36 saatlik kontrol
    inObj.sentAt36.push(inDate)
    inObj.cnt36++;
    //6 saatlik kontrol
    inObj.sentAt6.push(inDate)
    inObj.cnt6++;
    return inObj;
}
,FillObject:function(inObject,parent,key)
{
    if (!inObject)
    {
        parent[key] =  {
            cnt6 : 0,
            cnt24 : 0,
            cnt36 : 0,
            sentAt6: [],
            sentAt24: [],
            sentAt36: [],
            Call:{
                cnt6 : 0,
                cnt24 : 0,
                cnt36 : 0,
                sentAt6: [],
                sentAt24: [],
                sentAt36: [],
                CBS_TM_NO :{},
            },
            Auto:{
                cnt6 : 0,
                cnt24 : 0,
                cnt36 : 0,
                sentAt6: [],
                sentAt24: [],
                sentAt36: [],
                CBS_TM_NO :{},
            },
            Man:{
                cnt6 : 0,
                cnt24 : 0,
                cnt36 : 0,
                sentAt6: [],
                sentAt24: [],
                sentAt36: [],
                CBS_TM_NO :{},
                },
            smspacks:{},
            outages : {},
            CBS_TM_NO :{},
                            
                        }             
    }
}
,FillObjectRds : function (inObject)
{
    if (!inObject)
    {
        inObject =  {
            cnt6 : 0,
            cnt24 : 0,
            cnt36 : 0,
            sentAt6: [],
            sentAt24: [],
            sentAt36: [],
            Call:{
                cnt6 : 0,
                cnt24 : 0,
                cnt36 : 0,
                sentAt6: [],
                sentAt24: [],
                sentAt36: [],
                CBS_TM_NO :{},
            },
            Auto:{
                cnt6 : 0,
                cnt24 : 0,
                cnt36 : 0,
                sentAt6: [],
                sentAt24: [],
                sentAt36: [],
                CBS_TM_NO :{},
            },
            Man:{
                cnt6 : 0,
                cnt24 : 0,
                cnt36 : 0,
                sentAt6: [],
                sentAt24: [],
                sentAt36: [],
                CBS_TM_NO :{},
                },
            smspacks:{},
            outages : {},
            CBS_TM_NO :{},
                            
                        }      
    }
        
        return inObject;       
}
//eski yapıdan kalma bir kayıt ise yeni alanları eklemeliyiz..
,FillObjectRdsCheck : function (inObject)
{
       if (!inObject.hasOwnProperty('cnt6')) 
       {
            console.log('inObject.cnt6 yok')
            inObject.cnt6=0; 
            inObject.sentAt6=[]
            inObject.Call={
                            cnt6 : 0,
                            cnt24 : 0,
                            cnt36 : 0,
                            sentAt6: [],
                            sentAt24: [],
                            sentAt36: [],
                            CBS_TM_NO :{},
                            }
            inObject.Auto.cnt6 = 0
            inObject.Auto.sentAt6 = []
            inObject.Man.cnt6 = 0
            inObject.Man.sentAt6 = []

       }
   return inObject;       
}

,CheckSms : async function (inObj,RdsClient)
{
    let now = Date.now();
    //console.log('CheckSms inObj:',inObj)
    let CALLER_CONTACT    = inObj.CALLER_CONTACT;
    let ACCNO             = inObj.ACCNO;
    /*
        X:kapanmış kesintilere gönderilen sms
        A:otomatik gönderime düşen açık kesintiler
        M:açık kesintilere manuel gönderim.
        T:Çağrı merkezine çağrı geldiğinde göndereceğimiz sms.
    */
    //bloklama kontrolü yaparken kapanan kesintiler ile ilgili sms gönderimlerinde manuel gibi davrandırıcaz..
    let SENDMETHOD        = inObj.SendMethod=='X'?'M':inObj.SendMethod;
    let BLD_OK            = inObj.BLD_OK;//daha önce bildirimli sms gönderimi yüzünden engel yok değil mi 
    let CBS_TM_NO         = inObj.CBS_TM_NO;//trafo numarası
    let KAYNAK          = inObj.AG_MI==1?'AG':'OG';//
    let DTR_MI          = inObj.DTR==1;//
    let DEVICE_MI       = inObj.DEVICE==1;//
    let AFRM_MI         = inObj.AFRM==1;//
    //console.log('SENDMETHOD:',SENDMETHOD,' KAYNAK:',KAYNAK);
    //bazı case ler direk sorgu dan alabiliriz mesela kural 13
    // Kural14.	DONE Bildirimsiz kesintiden etkilenen tesisatlardan son 90 dk içinde kapanan planlı kesintisi olan var ise bu tesisata SMS gönderilmeyecektir. 
    //(dek_sms tablosunda > bli_kes / bli_kes_bitis)
    if (BLD_OK==0)
        return 1400;
    if (SENDMETHOD=='M' && KAYNAK=='AG')
    {
        if (DTR_MI && DEVICE_MI && AFRM_MI)
        {
            // gidebilir...
        } else
        {
            //Kural13.	AG’de sadece DTR (Çıkış=DTR) ve AG depar (dev_cat=Device) seviyelerindeki doğrulanmış (afrm_done=x) kesintiler için manuel gönderim sağlanacaktır. 
            return 1300;
        }
    }
    
    //let mObj =JSON.parse( await mred.get(customerId));

    //SmsControl_tel
    let tObj = null;
    //SmsControl_acc yani tesisat
    let aObj = null;

    let value = null

    // CC'den gelen Aynı kesinti numarası için 1 gün içerisinde sadece 1 SMS gönderimi yapılır. 
    let testNums = ['5078405454','5466525603','5388526320']  
    let mAddrTest = 'TestNum'+CALLER_CONTACT;
    if (testNums.includes(CALLER_CONTACT))
    {
         console.log('testNums called : ',CALLER_CONTACT)
         value = await RdsClient.get(mAddrTest);
         if (value)
         {
             let tmpObj = JSON.parse(value);
             if (tmpObj.cnt>3)
             {
                let mAddrX = consts.rds.SmsKontrolByPhone+CALLER_CONTACT+inObj.OUTAGE_NO;
                await RdsClient.del(mAddrX)
                await RdsClient.del(consts.rds.SmsKontrolByPhone+CALLER_CONTACT);
                mAddrX = consts.rds.SmsKontrolByAccNo+ACCNO;
                await RdsClient.del(mAddrX);
                tmpObj.cnt=0;
                await RdsClient.set(mAddrTest,JSON.stringify(tmpObj))
                return 10000+tmpObj.cnt;
             } else
             {
                tmpObj.cnt++;
                await RdsClient.set(mAddrTest,JSON.stringify(tmpObj))
             }
             
         } else
         {
             let tmpObj = {cnt:0}
             await RdsClient.set(mAddrTest,JSON.stringify(tmpObj))
         }
    }

    /*
    logları temizlemek için
    let mAddrX = consts.rds.SmsKontrolByPhone+CALLER_CONTACT+inObj.OUTAGE_NO;
    await RdsClient.del(mAddrX)
    await RdsClient.del(consts.rds.SmsKontrolByPhone+CALLER_CONTACT);
    mAddrX = consts.rds.SmsKontrolByAccNo+ACCNO;
    await RdsClient.del(mAddrX);
    return
    */
    if (SENDMETHOD=='T')
    {
        let tmpObj = null;
        let mAddr = consts.rds.SmsKontrolByPhone+CALLER_CONTACT+inObj.OUTAGE_NO;

        value = await RdsClient.get(mAddr);
        if (value)
        {
            tmpObj = JSON.parse(value);
            const mHour = 1000*60*60;
            if ( (now-tmpObj.sentAt) < 24*mHour) 
            {
                return 9004;
            } else
            {
                tmpObj.sentAt = now;
            }
        } else
        {
            tmpObj  = {sentAt:now}
        }
        await RdsClient.set(mAddr, JSON.stringify(tmpObj))
    }

    // telefon numarasının geçmişi var sa alalım...
    value = await RdsClient.get(consts.rds.SmsKontrolByPhone+CALLER_CONTACT);

    if (value)
        {
            tObj = JSON.parse(value);
            tObj = self.FillObjectRdsCheck(tObj)
           // console.log('value 1:',tObj)
    } else
    {
        tObj = self.FillObjectRds(tObj);
    }
    
    // tesisatın geçmişi var sa alalım...
    mAddr = consts.rds.SmsKontrolByAccNo+ACCNO;
    console.log ('consts.rds.SmsKontrolByAccNo+ACCNO:',mAddr)
    value = await RdsClient.get(mAddr);
    if (value)
        {
            aObj = JSON.parse(value);
            aObj = self.FillObjectRdsCheck(aObj)
           // console.log('aObj value 2:',aObj)
    } else
    {
        aObj = self.FillObjectRds(aObj);
    }

    //mLib.log('aObj:',aObj,'\ntObj:',tObj)

    //object var mı yok mu kontrolü yaparak object oluşturuyoruz..
    self.FillObject(tObj.Call.CBS_TM_NO[CBS_TM_NO],tObj.Call.CBS_TM_NO,CBS_TM_NO) 
    
    self.FillObject(tObj.Auto.CBS_TM_NO[CBS_TM_NO],tObj.Auto.CBS_TM_NO,CBS_TM_NO) 
    
    self.FillObject(tObj.Man.CBS_TM_NO[CBS_TM_NO],tObj.Man.CBS_TM_NO,CBS_TM_NO) 

    let tObjCBS_TM_NO_C = tObj.Call.CBS_TM_NO[CBS_TM_NO];
    let tObjCBS_TM_NO_A = tObj.Auto.CBS_TM_NO[CBS_TM_NO];
    let tObjCBS_TM_NO_M = tObj.Man.CBS_TM_NO[CBS_TM_NO];

    
    self.FillObject(tObj.AG,tObj,'AG') 
    let tObjOut_AG  = tObj.AG;


  
    //manuel ve automati sms göndermeler ile ilgili 
    
    //telephone based
    const t_cObj = tObj.Call;
    if (!t_cObj) t_cObj = {...tempObj};

    const t_aObj = tObj.Auto;
    if (!t_aObj) t_aObj = {...tempObj};
    
    const t_mObj = tObj.Man;
    if (!t_mObj) t_mObj = {...tempObj};


    //account based
    const a_cObj = aObj.Call;
    if (!a_cObj) a_cObj = {...tempObj};
    
    const a_aObj = aObj.Auto;
    if (!a_aObj) a_aObj = {...tempObj};
    
    const a_mObj = aObj.Man;
    if (!a_mObj) a_mObj = {...tempObj};



    //24 saat ve 36 saat öncesinden kayıt var ise onları kaldırıyoruz..
    /*mLib.log('11');    */                        self.CheckDate(t_aObj,now);
    /*mLib.log('12');    */                        self.CheckDate(t_mObj,now);
    /*mLib.log('12');    */                        self.CheckDate(t_cObj,now);

    /*mLib.log('13');    */                        self.CheckDate(a_aObj,now);
    /*mLib.log('14');    */                        self.CheckDate(a_mObj,now);
    /*mLib.log('14');    */                        self.CheckDate(a_cObj,now);

    /*mLib.log('15');    */                        self.CheckDate(tObjCBS_TM_NO_A,now);
    /*mLib.log('16');    */                        self.CheckDate(tObjCBS_TM_NO_M,now);
    /*mLib.log('16');    */                        self.CheckDate(tObjCBS_TM_NO_C,now);

    /*mLib.log('17');    */                        self.CheckDate(tObj.Auto,now);
    /*mLib.log('18');    */                        self.CheckDate(tObj.Man,now);
    /*mLib.log('18');    */                        self.CheckDate(tObj.Call,now);

    /*mLib.log('18');    */                        self.CheckDate(tObjOut_AG,now);

    if (KAYNAK=='AG')
    {
        // Kural12.	Manuel SMS gönderimi yapılan AG kesintileri için 36 saat içerisinde aynı numaraya sadece 1 defa SMS gönderimi yapılır.
        if (tObjOut_AG.cnt36>0)
          return 1200
    }

    if (KAYNAK=='OG')
    {
        //Kural6.	OG kesintilerde bir tesisat numarasına ilişkin 24 saat içerisinde bir otomatik kesinti SMS’i tetiklenebilir, maksimum 2 manuel tetiklenebilir.
        //yukardakiler ile aynı..

        /* !!!! geçici olarak kapattık
        // ex Kural81; Bir tesisata  24 saat içerisinde bir otomatik SMS tetiklenebilir.
        if ((a_aObj.cnt24>0) && (SENDMETHOD=='A'))
            return 81;
        // ex Kural82; Bir tesisata  24 saat içerisinde 2 manuel tetiklenebilir.
        if ((a_mObj.cnt24>1) && (SENDMETHOD=='M'))
            return 82;
        */

        // ex Kural11; Otomatik SMS sablonunda 3 kesinti ile ilgili 1 günde maksimum 3 SMS gidecektir.
        // Sonraki SMS'ler devam iletisimi olarak kurgulanacaktir. 
        // Devam iletisimi ile beraber maksimum 6 adet olacaktir.

        
        //Kural9.	   OG’de bir telefon numarasına 24 saat içerisinde maksimum 3 otomatik SMS gönderilir. 
        if ((tObj.Auto.cnt24>2)&& (SENDMETHOD=='A'))
            return 111;
        // Kural10.	OG’de bir telefon numarasına 24 saat içerisinde 6 manuel SMS gönderilebilir.
        if ((tObj.Man.cnt24>5)&& (SENDMETHOD=='M'))
            return 112;
        
        //Kural12; Manuel sms gönderilmesi durumunda 10.dakikada otomatik sms gönderilmeyecektir.
        //if ((tObjOut.Man.cnt24>0) && (SENDMETHOD=='A'))
        //    return 12;
        //bu kural paket işerisine koyuldu..

        //Kural8.	   OG’de bir telefon numarasına aynı trafo ile ilgili 24 saat içerisinde bir otomatik iki manuel gönderim yapılır. (TM No=Trafo)
        if ((tObjCBS_TM_NO_A.cnt24>0)&& (SENDMETHOD=='A'))
            return 801;
        if ((tObjCBS_TM_NO_M.cnt24>1)&& (SENDMETHOD=='M'))
            return 802;
        //Kural11.	OG’de bir telefon numarasına bir trafodan dolayı manuel gönderildikten sonra otomatik SMS gönderilmeyecek.
        if ((tObjCBS_TM_NO_M.cnt24>0)&& (SENDMETHOD=='A'))
            return 1100;
    }
    //ÇAĞRI MERKEZİNDEN TETİKLENEN KESİNTİLER
    if (SENDMETHOD=='T')
    {
        //mLib.log('T a_cObj:',a_cObj)
        //1.	Hizmet noktasındaki için 1 gün içerisinde 2 SMS gönderimi yapılır.   
        if (a_cObj.cnt24>1)
            return 9001;
        //Bu gönderim arasında 6 saat kuralı işleyecektir.  
        if (a_cObj.cnt6>0)
            return 9002;

    }

    if (SENDMETHOD=='A') 
        {
            //1 hizmet numarası için Avayadan SMS gönderimi yapıldıysa aynı kesinti numarası için otomatik kesinti gönderimi yapılmayacak
            if (aObj.Call.cnt24>1)
                return 9003;
        }   


    
    //tüm kontrolleri geçince kayıtları güncellemek lazım
    if ( (SENDMETHOD=='A')  && (KAYNAK=='OG') )
    {
        self.AddDate(t_aObj,now)
        self.AddDate(a_aObj,now)
        self.AddDate(tObjCBS_TM_NO_A,now)
    } 
    if ( (SENDMETHOD=='M')  && (KAYNAK=='OG') )
    {
        self.AddDate(t_mObj,now)
        self.AddDate(a_mObj,now)
        self.AddDate(tObjCBS_TM_NO_M,now)
    }
    
    if ( (SENDMETHOD=='M') && (KAYNAK=='AG') )
    {   
        mLib.log('tObjOut_AG:',tObjOut_AG)
        self.AddDate(tObjOut_AG,now)
    }
    
    if  (SENDMETHOD=='T') 
    {   
        self.AddDate(a_cObj,now)
        self.AddDate(t_cObj,now)
    }


    // telefon numarası ile bilgiler redis'e yazılıyor
    tObj.checked =1;
    aObj.checked =1;

    //console.log('tObj:',tObj)
    let resRDS = await RdsClient.set(consts.rds.SmsKontrolByPhone + CALLER_CONTACT, JSON.stringify(tObj));
    console.log('tObj resRDS:',resRDS)
    // tesisat ile ilgili bilgiler redis'e yazılıyor
    mAddr = consts.rds.SmsKontrolByAccNo+ACCNO;
    //console.log('aObj:',aObj, ' \n mAddr:',mAddr );
    resRDS = await RdsClient.set(mAddr, JSON.stringify(aObj))
    //console.log('aObj resRDS:',resRDS)
    
    return 0;
}
//call senterdan gelen telefon numaralarını kontrol eder
,CheckSmsCC: async function (inObj, RdsClient) {
    let now = Date.now();
    let CALLER_CONTACT = inObj.CALLER_CONTACT;
    let ACCNO = inObj.ACCNO;
    let SENDMETHOD = inObj.SendMethod === 'X' ? 'M' : inObj.SendMethod;
    let KAYNAK = inObj.AG_MI == 1 ? 'AG' : 'OG';
    let BILDIRIMLI_KESINTI = inObj.BLDR == 1;
    let RPTD_DATE = inObj.RPTD_DATE ? new Date(inObj.RPTD_DATE).getTime() : 0;
    let elapsedMinutes = (now - RPTD_DATE) / (1000 * 60);

    // Hata kodu açıklamaları
    const codeDescriptions = {
        0: "No Error",
        5001: "Bildirimli Kesinti: İlk Arama",
        5002: "Bildirimli Kesinti: İkinci Arama",
        5003: "Bildirimli Kesinti: Üçüncü Arama",
        5004: "Bildirimli Kesinti: Dördüncü Arama",
        5005: "Bildirimli Kesinti: Beşinci Arama",
        5100: "Bildirimli Kesinti: 5'ten Fazla Arama",
        6001: "OG Kesintisi: İlk 3 Arama (0-29 dakika)",
        6100: "OG Kesintisi: Limit Aşıldı (0-29 dakika)",
        6002: "OG Kesintisi: İlk 3 Arama (30-119 dakika)",
        6200: "OG Kesintisi: Limit Aşıldı (30-119 dakika)",
        6003: "OG Kesintisi: İlk 3 Arama (120-179 dakika)",
        6300: "OG Kesintisi: Limit Aşıldı (120-179 dakika)",
        6013: "OG Kesintisi: 180 dakika ve Sonrası",
        8001: "AG Kesintisi: İlk 3 Arama (0-29 dakika)",
        8100: "AG Kesintisi: Limit Aşıldı (0-29 dakika)",
        8002: "AG Kesintisi: İlk 3 Arama (30-89 dakika)",
        8200: "AG Kesintisi: Limit Aşıldı (30-89 dakika)",
        8003: "AG Kesintisi: İlk 3 Arama (90-149 dakika)",
        8300: "AG Kesintisi: Limit Aşıldı (90-149 dakika)",
        8013: "AG Kesintisi: 150 dakika ve Sonrası",
        6900: "OG: Kesinti Numarası Değişikliği (2 saatten az)",
        8900: "AG: Kesinti Numarası Değişikliği (2 saatten az)"
    };

    // Dönüş objesi
    let response = {
        code: 0,          // Hata kodu (Başlangıçta 0)
        codeDesc: codeDescriptions[0], // Başlangıç hata açıklaması
        limitExceeded: false,   // Limit aşıldı mı?
        differentOutageIn2Hours: false, // Kesinti numarası değişti ve 2 saatten az süre mi?
        callCounts: {}    // Hangi zaman aralığında kaç kez arama yapıldığını tutacak obje
    };

    // Redis anahtarları
    let lastOutageKey = `LastOutageV0_${CALLER_CONTACT}`;
    let bildirimliKey = `BildirimliCountV0_${CALLER_CONTACT}_${inObj.OUTAGE_NO}`;
    let AdrVer='V02'
    console.log('lastOutageKey:',lastOutageKey);
    let ogKeys = {
        '0-29':    `OG_Count_0_29_${CALLER_CONTACT}_${inObj.OUTAGE_NO}${AdrVer}`,
        '30-119':  `OG_Count_30_119_${CALLER_CONTACT}_${inObj.OUTAGE_NO}${AdrVer}`,
        '120-179': `OG_Count_120_179_${CALLER_CONTACT}_${inObj.OUTAGE_NO}${AdrVer}`
    };
    let agKeys = {
        '0-29':    `AG_Count_0_29_${CALLER_CONTACT}_${inObj.OUTAGE_NO}${AdrVer}`,
        '30-89':   `AG_Count_30_89_${CALLER_CONTACT}_${inObj.OUTAGE_NO}${AdrVer}`,
        '90-149':  `AG_Count_90_149_${CALLER_CONTACT}_${inObj.OUTAGE_NO}${AdrVer}`
    };

    // Son kesinti numarasının farklılk kontrol ediyoruz
    let lastOutageValue = await RdsClient.get(lastOutageKey);
    if (lastOutageValue) {
        let lastOutage = JSON.parse(lastOutageValue);
        if (lastOutage.outageNo !== inObj.OUTAGE_NO) {
            let lastCallTime = lastOutage.lastCallTime || 0;
            if ((now - lastCallTime) < 2 * 60 * 60 * 1000) { // 2 saatlik süre kontrolü
                let dateObject = new Date(lastCallTime);
                response.formattedLastCallTime = `${dateObject.getFullYear()}-${String(dateObject.getMonth() + 1).padStart(2, '0')}-${String(dateObject.getDate()).padStart(2, '0')} ${String(dateObject.getHours()).padStart(2, '0')}:${String(dateObject.getMinutes()).padStart(2, '0')}:${String(dateObject.getSeconds()).padStart(2, '0')}`;
                response.differentOutageIn2Hours = true;
                response.code = BILDIRIMLI_KESINTI ? 5001 : (KAYNAK == 'OG' ? 6900 : 8900);
                response.codeDesc = codeDescriptions[response.code];
                return response;
            }
        }
    }

    await RdsClient.set(lastOutageKey, JSON.stringify({ outageNo: inObj.OUTAGE_NO, lastCallTime: now }));

    // 1. Bildirimli Kesinti Durumu
    if (BILDIRIMLI_KESINTI) {
        let bildirimliCount = await RdsClient.get(bildirimliKey);
        bildirimliCount = bildirimliCount ? JSON.parse(bildirimliCount).count : 0;
        response.callCounts['Bildirimli'] = bildirimliCount;

        bildirimliCount++;
        if (bildirimliCount < 6) {
            await RdsClient.set(bildirimliKey, JSON.stringify({ count: bildirimliCount }));
            response.code = 5001 // + bildirimliCount; // 5001, 5002, 5003, 5004, 5005
            response.codeDesc = codeDescriptions[response.code];
            response.callCounts['Bildirimli'] = bildirimliCount;
            return response;
        } else {
            response.code = 5100;
            response.codeDesc = codeDescriptions[5100];
            response.limitExceeded = true;
            return response;
        }
    }

    // 2. OG Kesintisi Durumu
    if (KAYNAK == 'OG') {
        let ogResponse = await self.handleOGTimeBasedCheck(elapsedMinutes, ogKeys, RdsClient, {
            '0-29': { code: 6001, limitCode: 6100 },
            '30-119': { code: 6002, limitCode: 6200 },
            '120-179': { code: 6003, limitCode: 6300 }
        });

        ogResponse.callCounts = ogResponse.callCounts;
        ogResponse.codeDesc = codeDescriptions[ogResponse.code]?codeDescriptions[ogResponse.code]:'NoDesc';
        if (ogResponse.limitExceeded) {
            return ogResponse;
        }

        if (elapsedMinutes >= 180) {
            ogResponse.code = 6013;
            ogResponse.codeDesc = codeDescriptions[6013];
            ogResponse.limitExceeded = true;
            return ogResponse;
        }
        console.log('no case 02');
        return ogResponse;
    }

    // 3. AG Kesintisi Durumu
    if (KAYNAK == 'AG') {
        let agResponse = await self.handleAGTimeBasedCheck(elapsedMinutes, agKeys, RdsClient, {
            '0-29': { code: 8001, limitCode: 8100 },
            '30-89': { code: 8002, limitCode: 8200 },
            '90-149': { code: 8003, limitCode: 8300 }
        });

        agResponse.callCounts = agResponse.callCounts;
        agResponse.codeDesc = codeDescriptions[agResponse.code]?codeDescriptions[agResponse.code]:'NoDesc';

        if (agResponse.limitExceeded) {
            console.log('agResponse:', agResponse);
            return agResponse;
        }

        if (elapsedMinutes >= 150) {
            agResponse.code = 8013;
            agResponse.codeDesc = codeDescriptions[8013];
            agResponse.limitExceeded = true;
            return agResponse;
        }

        console.log('no case 01');
        return agResponse;
    }
    console.log('no case');
    return response;
},
/**
 * OG Zaman aralıklarına göre sayaç kontrolü ve hata kodu döndürme.
 */
handleOGTimeBasedCheck: async function (elapsedMinutes, keys, RdsClient, timeRules) {
    return await self.handleTimeBasedCheck(elapsedMinutes, keys, RdsClient, timeRules, { '0-29': 29, '30-119': 119, '120-179': 179 });
},

/**
 * AG Zaman aralıklarına göre sayaç kontrolü ve obje döndürme fonksiyonu.
 */
handleAGTimeBasedCheck: async function (elapsedMinutes, keys, RdsClient, timeRules) {
    return await self.handleTimeBasedCheck(elapsedMinutes, keys, RdsClient, timeRules, { '0-29': 29, '30-89': 89, '90-149': 149 });
},

/**
 * Zaman aralıklarına göre sayaç kontrolü ve obje döndürme fonksiyonu.
 */
handleTimeBasedCheck: async function (elapsedMinutes, keys, RdsClient, timeRules, limits) {

    let response = { code: 0, limitExceeded: false, differentOutageIn2Hours: false, callCounts: {} };
    console.log('handleTimeBasedCheck:', elapsedMinutes, keys, RdsClient, timeRules, limits);
    for (let range in limits) {
        let [start, end] = range.split('-').map(Number);
        if (elapsedMinutes >= start && elapsedMinutes <= limits[range]) {
            response = await self.checkAndUpdateCounter(keys[range], RdsClient, timeRules[range].code, timeRules[range].limitCode);
            response.callCounts[range] = response.currentCount; // Zaman aralığına göre sayaç bilgisi ekleniyor
            return response;
        }
    }

    return response;
},

/**
 * Sayaç kontrol ve güncelleme fonksiyonu.
 */
checkAndUpdateCounter: async function (key, RdsClient, initialCode, limitCode) {
    let response = { code: 0, limitExceeded: false, differentOutageIn2Hours: false, callCounts: {}, currentCount: 0 };
    let count = await RdsClient.get(key);
    count = count ? JSON.parse(count).count : 0;

    response.currentCount = count;

    count++;
    await RdsClient.set(key, JSON.stringify({ count: count }));
    response.currentCount = count; // Güncellenmiş sayaç değerini ekle
    if (count < 4) {
        response.code = initialCode;
    } else {
        response.code = limitCode;
        response.limitExceeded = true;
    }

    return response;
}
}
//ParseRcv();


/*
NtoN için 500 adet limiti varmış.
ÇEDAŞ için henüz servis hazır değil. Çalışmaları ÇEPESAŞ ta ilerletebiliriz.
Deploy etmek gerekir.

    1.	1400: Daha önce bildirimli SMS gönderimi yüzünden engel durumu var.
	2.	1300: AG’de manuel gönderim için DTR, cihaz ve onaylanmış kesinti koşulları sağlanmadı.
	3.	9004: Çağrı merkezinden tetiklenen kesinti SMS’i, aynı kesinti numarası için 1 gün içerisinde sadece 1 defa gönderilebilir.
	4.	1200: Manuel SMS gönderimi yapılan AG kesintileri için 36 saat içerisinde aynı numaraya sadece 1 defa SMS gönderimi yapılabilir.
	5.	111: OG kesintilerde bir telefon numarasına 24 saat içerisinde maksimum 3 otomatik SMS gönderilebilir.
	6.	112: OG kesintilerde bir telefon numarasına 24 saat içerisinde 6 manuel SMS gönderilebilir.
	7.	801: OG’de bir telefon numarasına aynı trafo ile ilgili 24 saat içerisinde bir otomatik gönderim yapılabilir.
	8.	802: OG’de bir telefon numarasına aynı trafo ile ilgili 24 saat içerisinde iki manuel gönderim yapılabilir.
	9.	1100: OG’de bir telefon numarasına bir trafodan dolayı manuel gönderildikten sonra otomatik SMS gönderilemez.
	10.	9001: Çağrı merkezinden tetiklenen kesintilerde, hizmet noktasındaki için 1 gün içerisinde 2 SMS gönderilebilir.
	11.	9002: Çağrı merkezinden tetiklenen kesintilerde, bu gönderim arasında 6 saat kuralı işleyecektir.
	12.	9003: Aynı kesinti numarası için Avaya’dan SMS gönderimi yapıldıysa, aynı kesinti numarası için otomatik kesinti gönderimi yapılamaz.

AG/OG SMS Şablonları; 
msg.OG = 'Sesli yanıt bilgilendirmesi; Değerli Müsterimiz, <İL> ve <İLÇE> bulunan<ACCNO> hizmet noktanizin oldugu bolgede yasanan arizanin giderilerek 4 saat icerisinde enerji verilmesi ongorulmektedir.Anlayisiniz icin tesekkur ederiz.'
msg.AG = 'Sesli yanıt bilgilendirmesi; Değerli Müsterimiz, <İL> ve <İLÇE> bulunan<ACCNO> hizmet noktanizin oldugu bolgede yasanan arizanin giderilerek 2 saat icerisinde enerji verilmesi ongorulmektedir.Anlayisiniz icin tesekkur ederiz.'


*/