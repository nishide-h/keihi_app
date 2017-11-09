(function() {
  "use strict";

  var accountCodes = {
    "広告宣伝費":"6113",
    "新聞図書費":"6114",
    "発送配達費":"6115",
    "旅費交通費":"6133",
    "諸会費":"6134",
    "事務用消耗品費":"6217",
    "電話等通信費":"6218",
    "租税公課":"6221",
    "備品・消耗品費":"6225",
    "交通費":"6133",
    "雑費":"5467",
    "地代家賃":"6215",
    "水道光熱費":"6219",
    "機械・装置":"1213",
    "会議費":"6111",
    "交際費":"6223",
    "交際費(5000円以下)":"6112",
    "支払手数料":"6232",
    "厚生費":"6226",
    "外注費":"6212",
    "ｺﾐｯｼｮﾝ料":"5214",
    "SaaS代":"6331",
    "郵便代":"6332",
    "工具・器具・備品":"1216",
    "ﾘｰｽ料":"6334",
    "預り金":"2117",
    "支払報酬":"6235",
    "研修費":"6660",
    "仮払金":"1156",
    "雑収入":"7118",
    "保険料":"6224",
    "立替金":"1155",
    "ｿﾌﾄｳｪｱ(ﾉｰﾘﾂ)":"1240",
    "(10万以上) 工具・器具":"1216",
    "イベント費":"6115",
  };
  var genka = {
    "外注費":"6212",
    "広告宣伝費":"6113",
    "ｺﾐｯｼｮﾝ料":"5214",
    "SaaS代":"6331",
    "仕入外注費":"6332"
  };
  var deposits = {
    "預り金":"2117",
    "仮払金":"1156"
  };
  var payers = {
    "倉貫":"1",
    "藤原":"2",
    "小口現金":"",
    "":""
  };
  
  kintone.events.on("app.record.index.show", function(event) {
    if (event.viewId !== 5299939) { // 出力用一覧（当月&出力済除外）ビュー
      return;
    }

    var csv = [];
    var app = kintone.app.getId();
        
    if (document.getElementById('btn_csv_output') !== null) {
      return;
    }

    var btnCSVOutput = document.createElement('button');
    btnCSVOutput.id = 'btn_csv_output';
    btnCSVOutput.innerHTML = 'CSV出力';
    btnCSVOutput.onclick = function() {
      csv = [];
      getMakeCSV();
      downloadCSV(csv);
    };
    kintone.app.getHeaderMenuSpaceElement().appendChild(btnCSVOutput);
    
    function getMakeCSV() {
      var escapeStr = function(value) {
        return '"' + (value? value.replace(/"/g, '""'): '') + '"';
      };

      var resp = request();
      var row = [];
      for (var i=0; i<resp.records.length; i++) {
        var record = resp.records[i];
        var payer = escapeStr(record['_name'].value);
        row = [];
        row.push("1");  // 1処理区分
        row.push("");   // 2 データID
        row.push(escapeStr(record['_date'].value)); // 3 伝票日付
        row.push("");   // 4 伝票番号
        row.push("");   // 5 入力日付
        //--------------------------借方
        row.push(escapeStr(getExpense(record['_expense'].value)));  // 6 借方・科目
        if (escapeStr(record['_expense'].value).indexOf("外注費")) {    // 7 補助コード
          row.push(13);
        } else {
          row.push(""); 
        }
        row.push("");   // 8 部門コード
        row.push("");   // 9 取引先コード
        row.push("");   // 10 取引先名
        if (genka[escapeStr(getExpense(record['_expense'].value))] == undefined) { // 11 税種別
          row.push(60); // 原価ではない経費は60
        } else {
          row.push(50); // 原価は50
        }
        row.push(1);  // 12 事業区分
        row.push(8);  // 13 税率 税率8%
        row.push(1);  // 14 内外別記 内税表記は1
        row.push(escapeStr(record['_price'].value));  // 15 金額
        row.push("");  // 16 税額
        row.push(escapeStr("支払い先" + ":" + record['_detail'].value)); // 17 摘要
        //rOut.getCell(1, 17).setValue(rIn.getCell(1, 4).getValue() + ":" + rIn.getCell(1, 2).getValue());
        //--------------------------貸方
        if (escapeStr(record['_name'].value) == "小口現金") {  // 18 貸方・科目（小口現金の場合は1118）
          row.push("1118");
        } else {
          row.push("2114");
        }
        // 19 補助コード
        var payer_code = payers[payer];
        if ( payer_code == undefined ) {
          payer_code = "";
        }
        row.push(payer_code);
        row.push(""); // 20 部門コード
        row.push(""); // 21 取引先コード
        row.push(""); // 22 取引先名
        if(genka[escapeStr(getExpense(record['_expense'].value))] == undefined) { // 23 税種別
          row.push(60); // 原価ではない経費は60
        } else {
          row.push(50); // 原価は50
        }
        row.push(1);  // 24 事業区分
        row.push(8);  // 25 税率 税率8%
        row.push(1);  // 26 内外別記 内税表記は1
        row.push(escapeStr(record['_price'].value));  // 27 金額
        row.push(1);  // 28 税額
        row.push(escapeStr("支払い先" + ":" + record['_detail'].value));  // 29 摘要
        csv.push(row);

        setCSVOutput(record['\$id'].value);
      }
    }

    function request() {
      //税理士チェック済み＆日付が前月＆CSV出力フラグがOFFのものを対象とする
      //預金（立替でない）場合は出力しない
      var query = "_tax_checked in (\"済\") and _date = LAST_MONTH() and _csv_output not in (\"済\")";
      //query += " and _expense not in ()"; 未設定？
      query += " order by _date asc";

      var appUrl = kintone.api.url('/k/v1/records') + '?app=' + app + '&query=' + query;
      var xmlHttp = new XMLHttpRequest();
      xmlHttp.open('GET', appUrl, false);
      xmlHttp.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      xmlHttp.send(null);

      var respdata = JSON.parse(xmlHttp.responseText);
      return respdata;
    }
    
    function getExpense(value) {
      return value.slice(0, value.indexOf(":"));
    }

    function downloadCSV(csv) {
      var filename = '未払計上仕訳_' + getTimeStamp() + '.csv';

      var str2array = function(str) {
        var array = [], i, il=str.length;
        for (i=0; i<il; i++) {
          array.push(str.charCodeAt(i));
        }
        return array;
      };

      var csvbuf = csv.map(function(e){return e.join(',')}).join('\r\n');
      var array = str2array(csvbuf);
      var sjis_array = Encoding.convert(array, "SJIS", "UNICODE");
      var uint8_array = new Uint8Array(sjis_array);
      var blob = new Blob([uint8_array], { type: 'text/csv'});
      
      if (window.navigator.msSaveBlob) {
        window.navigator.msSaveBlob(blob, filename);
      } else {
        var blobUrl = (window.URL || window.webkitURL).createObjectURL(blob);
        var e = document.createEvent('MouseEvents');
        e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        var a = document.createElementNS("http://www.w3.org/1999/xhtml", "a");
        a.href = blobUrl;
        a.download = filename;
        a.dispatchEvent(e);
      }
    }

    function getTimeStamp() {
      var d = new Date();
      var YYYY = d.getFullYear();
      var MM = (d.getMonth() + 1);
      var DD = d.getDate();
      var hh = d.getHours();
      var mm = d.getMinutes();
      if (MM < 10) { MM = '0' + MM; }
      if (DD < 10) { DD = '0' + DD; }
      if (hh < 10) { hh = '0' + hh; }
      else if (mm < 10) { mm = '0' + mm; }
      String();
      return '' + YYYY + MM + DD + hh + mm;
    }

    function setCSVOutput(record_id) {
      var body = {
        "app": app,
        "id": Number(record_id),
        "record": {
          "_csv_output": {
            "value": ["済"]
          }
        }
      };
      
      kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', body, function(resp) {
        //console.log(resp);
      }, function(error) {
        console.log(error);
      });
    }
  });
})();
