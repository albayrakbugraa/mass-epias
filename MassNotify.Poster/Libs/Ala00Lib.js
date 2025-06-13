//Libs/Ala00Lib.js  
/**
 General Lib for NodeJs
 v00.02
 Ala00Lib.js
 var mLib = require('./Ala00Lib.js');
 872682126616 match yaratıldı ama sa yaratamadı yetkileri farklı
 */

 var fs = require('fs');

 
var self = module.exports = {
    pass:'Ebabil1KusturSozundenDonenKustur',
    AppEnv:'DEV',
    AppNameDigit : 'mDigit',    
    AppNameDigitEmail : 'info@mDigit.com',    
    AppNameDebaam : 'deBaam',    
    AppNameDebaamEmail : 'noreply@deBaam.com',    
    ErrDbNotConnected:1,
    ShowLogs:true,
    UserId :'Ckcamlibel',Password :'camlibel2022!',
    /*
    UserId :'konyurt',Password :'Masterc79!',
    UserId :'DEBUGUSER',Password :'DEBUGUSER00',
    [17:57] Nevzat TİMURTAŞ
    CEPESAS-->http://10.40.69.96:6503/ouaf  
    
    UserId :'tkelleci ',
    Password :'u0cz!bGU',
    */
    ShowDate: function () {
        var today = new Date();

        var year = today.getFullYear();
        var day = today.getDate();
        var mon = today.getMonth();
        var h = today.getHours();
        var m = today.getMinutes();
        var s = today.getSeconds();
        var ms = today.getMilliseconds();
        // add a zero in front of numbers<10
        day = self.checkTime(day);
        mon = self.checkTime(mon+1);
        h = self.checkTime(h);
        m = self.checkTime(m);
        s = self.checkTime(s);
        return year+"."+mon+"."+day+"@"+h+":" + m + ":" + s;
    },
     ConvertTurkish:function(inStr){
        return inStr
                .replace(/ç/g, "c")
                .replace(/Ç/g, "C")
                .replace(/ğ/g, "g")
                .replace(/Ğ/g, "G")
                .replace(/ı/g, "i")
                .replace(/İ/g, "I")
                .replace(/ö/g, "o")
                .replace(/Ö/g, "O")
                .replace(/ş/g, "s")
                .replace(/Ş/g, "S")
                .replace(/ü/g, "u")
                .replace(/Ü/g, "U");
    },
    uid :function()
    {
        return uuidv4()+"-"+uuidv4();
    },
    GiveTodayAsYYMMDD :function()
    {
      const today = new Date();
      const yy = today.getFullYear().toString().slice(-2); // Last two digits of the year
      const mm = String(today.getMonth() + 1).padStart(2, '0'); // Month (0-11, so +1), padded with leading 0 if necessary
      const dd = String(today.getDate()).padStart(2, '0'); // Day of the month, padded with leading 0 if necessary
      return `_${yy}${mm}${dd}`;
    },
    uidSingle :function()
    {
        return uuidv4();
    },
    GenCode: function (){
      return 123456;
      return Math.floor((Math.random() * 100000) + 500000);
    },
    makeid:function(length) {
      var result           = '';
      var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789';
      var charactersLength = characters.length;
      for ( var i = 0; i < length; i++ ) {
         result += characters.charAt(Math.floor(Math.random() * charactersLength));
      }
      return result;
   },
    makeidHex:function(length) {
      var result           = '';
      var characters       = '123456789ABCDEF';
      var charactersLength = characters.length;
      for ( var i = 0; i < length; i++ ) {
         result += characters.charAt(Math.floor(Math.random() * charactersLength));
      }
      return result;
   },
   SayTodayAsDayMonth: function(){
    const today = new Date();
    const options = {
      day: "numeric",
      month: "long"
    };
    const formattedDate = today.toLocaleDateString("tr-TR", options);
    return formattedDate
   },
    SayTime: function () {
        var today = new Date();
        var year = today.getFullYear();
        var day = today.getDate();
        var mon = today.getMonth();
        var h = today.getHours();
        var m = today.getMinutes();
        var s = today.getSeconds();
        var ms = today.getMilliseconds();
        // add a zero in front of numbers<10
        day = self.checkTime(day);
        mon = self.checkTime(mon+1);
        m = self.checkTime(m);
        s = self.checkTime(s);
        return year+"."+mon+"."+day+"_"+h+":" + m + ":" + s+":"+ms+"_";
    },
    SayDateDay: function (inDate) {
        var today = inDate
        var year = today.getFullYear();
        var day = today.getDate();
        var mon = today.getMonth();
        day = self.checkTime(day);
        mon = self.checkTime(mon+1);
        return year+mon+day;
    },
    SayDateMon: function (inDate) {
        var today = inDate
        var year = today.getFullYear();
        var mon = today.getMonth();
        mon = self.checkTime(mon+1);
        return year+mon;
    },
    SayDateYear: function (inDate) {
        var today = inDate
        var year = today.getFullYear();
        return year;
    },
    SayTimeSimp: function () {
        var today = new Date();
        var day = today.getDate();
        var mon = today.getMonth();
        var h = today.getHours();
        var m = today.getMinutes();
        var s = today.getSeconds();
        day = self.checkTime(day);
        mon = self.checkTime(mon+1);
        m = self.checkTime(m);
        s = self.checkTime(s);
        return mon+"_"+day+"_"+h+"_" + m + "_" + s;
      }
      , SayTimeRaw: function () {
      var today = new Date();
      var day = today.getDate();
      var mon = today.getMonth();
      var h = today.getHours();
      var m = today.getMinutes();
      var s = today.getSeconds();
      var ms = today.getMilliseconds();
      // add a zero in front of numbers<10
      day = self.checkTime(day);
      mon = self.checkTime(mon+1);
      m = self.checkTime(m);
      s = self.checkTime(s);
      return mon+day+h+m+s;
  }
    ,Owner:"AlaBot"
    ,mRoot:"N/A"
    ,fileLoc:"N/A"
    ,init: ()=>
    {
      s=process.argv[1];
      self.log("init:",s);
      ss = s.split("/");
      self.mRoot =""
      let FileHdr='';
      for (let i = 1; i < ss.length-2; i++) {
        self.mRoot +="/"+ ss[i];
      }
      self.fileLoc = self.mRoot+FileHdr;
      self.log("mRoot:",self.mRoot,"ss:",ss[0]); 
      self.Owner=ss[ss.length-1];
    }
    ,log : (...args)=>
    {
        if (self.ShowLogs)
          console.log(self.Owner+":"+self.SayTime(),...args);
    }
    ,error : (...args)=>
    {
        console.error(self.Owner+": ERROR "+self.SayTime(),...args);
    }
    ,logDisable:()=>
    {
      self.ShowLogs = false;
    }
    ,logEnable:()=>
    {
      self.ShowLogs = true;
    }
    ,SaveFile:async function (inFile,inData)
    {
        await fs.writeFileSync(inFile,inData);
    }
    ,LoadFileJson:async function (inFile,inDef)
    {
      let FileHdr='';
      self.mRoot='';
      return new Promise ((resolve,reject)=>{
        fs.readFile(self.mRoot+FileHdr+inFile, function (err, data) {
          if (err) {
            self.log(inFile+" could not open")
            if (!inDef)
              inDef={};
            fs.writeFileSync(self.mRoot+FileHdr+inFile, JSON.stringify(inDef)); 
            resolve(inDef); 
          } else
          {
            jdata = JSON.parse(data);
            resolve(jdata)  
          }
      })
    })
    }
    ,LoadFileJsonRoot:async function (inFile,inDef)
    {
      return new Promise ((resolve,reject)=>{
        fs.readFile(inFile, function (err, data) {
          if (err) {
            self.log(inFile+" could not open")
            if (!inDef)
              inDef={};
            fs.writeFileSync(inFile, JSON.stringify(inDef)); 
            resolve(inDef); 
          } else
          {
            jdata = JSON.parse(data);
            self.log(inFile+" len :"+jdata.length)
            resolve(jdata)  
          }
      })
    })
    }
  ,SaveFileJson:async function(inFile,inData)
  {
//    self.log(inFile,"will write")
   // process.stdout.write("-");
  //  console.log('inData:',inData)
    return await fs.writeFileSync(inFile, JSON.stringify(inData));  
  //  process.stdout.write("+");
//    self.log(inFile,"has writen")
  }
  ,SaveFileJsonRoot:async function(inFile,inData)
  {
//    self.log(inFile,"will write")
   // process.stdout.write("-");
    fs.writeFileSync(inFile, JSON.stringify(inData));  
  //  process.stdout.write("+");
//    self.log(inFile,"has writen")
  }
  ,
  checkTime : function(i)
  {
      if (i < 10) {
          i = "0" + i;
        }
      return i;
  }
  ,LoadFile:async function (inFile)
    {
     
      return new Promise ((resolve,reject)=>{
        fs.readFile(inFile, function (err, data) {
          if (err) {
            self.log(inFile+" could not open")
            reject("nofile"); 
          } else
          {
            resolve(data.toString())
          }
      })
    })
    }
  ,asyncForEach : async function(array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index]);
    }
  }  
  , numberWithCommas : function(x) {
    let ss =  x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    ss = ss.replace(',','x');
    ss = ss.replace('.',',');
    ss = ss.replace('x','.');
    return ss;
}

  ,prepareComps : async function()
  {
      
      let comps = []
      let cmptags = [];
      //load list of components
      let i=0;
      cmptags = await this.LoadFileJsonRoot('views/comps/CmpDebaamList.json',[]);
      //console.log("cmptags:",cmptags.length)
      await this.asyncForEach(cmptags,async (cmpitem)=>{
        cmp = await this.LoadFile('views/comps/'+cmpitem+'.html')
        //console.log(i++,".cmpitem:",cmpitem)
        comps.push({cmptag:cmpitem,cmp:cmp});
      })

      //console.log("loop  finished:",comps.length);
      comps.push({cmptag:'CmpForgetMsg',cmp:'Lan Salak'});

      let src = 'views/debaamLoginO.ejs';
      let trg = 'views/debaamLogin.ejs';
      let srcd = await this.LoadFile(src)
      i=0;
      comps.forEach(src => {
        srcd = srcd.replace(new RegExp(src.cmptag, 'g'), src.cmp.replace(/\n|\r/g, ""));
       // console.log(i++,".src.cmptag:",src.cmptag)
      });

      ///additional dictionary
      dic = await this.LoadFileJsonRoot('views/comps/dic.json',[]);
      dic.forEach(src => {
        srcd = srcd.replace(new RegExp(src.cmptag, 'g'), src.cmp);
        //console.log("dict src.cmptag:",src.cmptag)
      });
         await fs.writeFileSync(trg, srcd);
         //console.log("file saved");
         return "did it";
  }
  , deleteFile : function(infilePath) {
    try {
      fs.unlinkSync(infilePath);
    } catch (error) {
      self.log('could not delete')
    }
  }
  ,dateDifInMin: function(date1,date2)
  {
    var diff = Math.abs(date1 - date2);
    return  Math.floor((diff/1000)/60);
  }
  ,dateDifToNowInMin: function(date1)
  {
    let mNow = new Date();
    var diff = Math.abs(mNow -  date1);
    return  Math.floor((diff/1000)/60);
  }
  ,appendToFileJson:function(inFileName,inJson)
  {
    fs.appendFile(inFileName, JSON.stringify(inJson)+'\n', (err) => {
      if (err) {
          console.log('appendToFileJson err:',err);
          throw err
        };
      
    });
  }
  ,getStringBetween:function (str, startStr, endStr) {
    var regex = new RegExp(startStr + "(.*?)" + endStr);
    var match = regex.exec(str);
    if (match) {
      return match[1].trim();
    }
    return null;
  }
  ,PrepJsonForExcel:function(inData,isOrg,DictTags)
  {
    let mCols = [];
    let mRows = [];
    let mRowsO = [];
    let colCnt = 0;
    inData.metaData.forEach(element => {
      colCnt++;
      let slen = element.name.length*15
      mCols.push({field:element.name,headerName:element.name,width:slen});
    });  
    let i=0;
    // console.log('mCols:',mCols);
    inData.rows.forEach(element => {
      let tmp = {};
      let tmpO = {};
      for (let index = 0; index < colCnt; index++) {
          if (isOrg)
            tmpO[ mCols[index].field]  =  element[index];
          else
            tmp[ DictTags[mCols[index].field] ] =  element[index];
      }
      if (isOrg)
        mRowsO.push(tmpO);
      else
        mRows.push(tmp);
      i++;
    });  
    if (isOrg)
      return mRowsO
    else
      return mRows;
  }
  , RedisIncStatics:async function(inRedisClient,inKey,inDateNum,inCnt)
  {
       inDate =new Date(inDateNum);
       let DayId =  self.SayDateDay(inDate)
       let MonId =  self.SayDateMon(inDate)
       let YearId =  self.SayDateYear(inDate)
       let StatVal = await inRedisClient.get(inKey);
       StatVal = JSON.parse(StatVal);
       if (StatVal.days[DayId])
          StatVal.days[DayId] +=inCnt;  
       else 
          StatVal.days[DayId] = inCnt;

       if (StatVal.months[MonId])
          StatVal.months[MonId] +=inCnt;
       else 
          StatVal.months[MonId] = inCnt;

       if (StatVal.years[YearId])
          StatVal.years[YearId] +=inCnt;
       else 
          StatVal.years[YearId] = inCnt;
       StatVal.total+=inCnt;
       await inRedisClient.set(inKey,JSON.stringify(StatVal)) 
  }
 }
 

  